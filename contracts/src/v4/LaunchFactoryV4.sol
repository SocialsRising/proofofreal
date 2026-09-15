// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {LaunchToken} from "../LaunchToken.sol";
import {FounderVault} from "../FounderVault.sol";
import {V4FeeLocker} from "./V4FeeLocker.sol";
import {LaunchHook} from "./LaunchHook.sol";
import {IPoolManager, IPositionManager, IPermit2, IUnlockCallback, PoolKey, PoolId, Currency, SwapParams, BalanceDelta, V4} from "./IUniswapV4.sol";

/// @title Meme Maxxers LaunchFactoryV4
/// @notice One transaction: mint a 1B token, open its Uniswap V4 pool against native ETH with a per-token trading
///         fee (launchpad 1% + founder's 0–10%, on every buy and sell), seed all unlocked supply as single-sided
///         liquidity, lock the LP position forever in the V4FeeLocker with the fee split, optionally time-lock a
///         founder share and execute a dev buy. The AMM is Uniswap; this contract never custodies user funds
///         after the launch transaction completes.
contract LaunchFactoryV4 is Ownable, IUnlockCallback {
    using V4 for PoolKey;
    using V4 for BalanceDelta;

    struct LaunchParams {
        string name;
        string symbol;
        uint24 creatorFeePips;    // founder's fee on every trade, 0..MAX_CREATOR_FEE (1e6 = 100%; 10_000 = 1%)
        uint16 creatorShareBps;   // founder's share of their own fee (rest to the community pool): 10000, 5000 or 2000
        uint16 lockBps;           // founder lock, % of supply in bps (0 = none), max 2000
        uint32 lockDays;          // lock duration in days (required if lockBps > 0)
        uint256 minDevBuyOut;     // slippage floor for the dev buy (0 = none)
        string metadataURI;       // off-chain metadata (image, description, links); mirrored in the registry
    }

    /// @dev Price geometry every pool starts with. Precomputed off-chain (TickMath) so the contract needs no tick math:
    ///      the pool is initialized exactly at `initialTick`, and the single-sided position spans [minTick, initialTick].
    struct Curve { int24 tickSpacing; int24 minTick; uint160 minSqrtPriceX96; int24 initialTick; uint160 initialSqrtPriceX96; }

    struct Launch { address token; PoolId poolId; uint256 tokenId; address creator; uint24 totalFee; uint64 launchedAt; }

    IPoolManager public immutable poolManager;
    IPositionManager public immutable positionManager;
    IPermit2 public immutable permit2;
    FounderVault public immutable vault;
    V4FeeLocker public immutable feeLocker;
    LaunchHook public hook;                 // set once after the hook is mined + deployed with this factory's address

    address public treasury;                // launchpad fee recipient (the mandatory 1%)
    address public communityPool;           // where founders' community share accrues for weekly distribution
    uint24 public protocolFeePips = 10_000; // launchpad share of every trade: 1%
    uint24 public constant MAX_CREATOR_FEE = 100_000; // 10%
    uint256 public launchFee = 0.0005 ether;
    Curve public curve;

    mapping(address token => Launch) public launches;
    address[] public allTokens;

    event Launched(address indexed token, address indexed creator, PoolId poolId, uint256 tokenId, uint24 creatorFeePips, uint16 creatorShareBps, uint16 lockBps, uint32 lockDays, uint256 devBuyWei, string metadataURI);
    event ConfigUpdated(address treasury, address communityPool, uint24 protocolFeePips, uint256 launchFee);
    event CurveUpdated(int24 tickSpacing, int24 minTick, int24 initialTick, uint160 initialSqrtPriceX96);
    event HookSet(address hook);

    error BadParams();
    error FeeNotPaid();
    error HookNotSet();
    error NotPoolManager();
    error Slippage();

    constructor(address poolManager_, address positionManager_, address permit2_, address treasury_, address communityPool_, address owner_, Curve memory curve_) Ownable(owner_) {
        poolManager = IPoolManager(poolManager_);
        positionManager = IPositionManager(positionManager_);
        permit2 = IPermit2(permit2_);
        treasury = treasury_;
        communityPool = communityPool_;
        vault = new FounderVault();
        feeLocker = new V4FeeLocker(positionManager_, address(this));
        _setCurve(curve_);
    }

    // ---------------------------------------------------------------- admin
    function setHook(address hook_) external onlyOwner {
        require(address(hook) == address(0) && hook_ != address(0), "hook set");
        require(LaunchHook(hook_).factory() == address(this), "hook factory");
        hook = LaunchHook(hook_);
        emit HookSet(hook_);
    }
    function setConfig(address treasury_, address communityPool_, uint24 protocolFeePips_, uint256 launchFee_) external onlyOwner {
        require(treasury_ != address(0) && communityPool_ != address(0) && protocolFeePips_ <= 50_000, "bad config");
        treasury = treasury_; communityPool = communityPool_; protocolFeePips = protocolFeePips_; launchFee = launchFee_;
        emit ConfigUpdated(treasury_, communityPool_, protocolFeePips_, launchFee_);
    }
    function setCurve(Curve calldata c) external onlyOwner { _setCurve(c); }
    function _setCurve(Curve memory c) internal {
        require(c.tickSpacing > 0 && c.initialTick % c.tickSpacing == 0 && c.minTick % c.tickSpacing == 0, "tick spacing");
        require(c.minTick >= V4.MIN_TICK && c.minTick < c.initialTick && c.initialTick <= V4.MAX_TICK, "tick range");
        require(c.minSqrtPriceX96 >= V4.MIN_SQRT_PRICE && c.minSqrtPriceX96 < c.initialSqrtPriceX96 && c.initialSqrtPriceX96 < V4.MAX_SQRT_PRICE, "price range");
        curve = c;
        emit CurveUpdated(c.tickSpacing, c.minTick, c.initialTick, c.initialSqrtPriceX96);
    }

    // ---------------------------------------------------------------- launch
    /// @param p launch params. msg.value = launchFee + dev buy (anything above the fee is spent buying the token for the creator).
    function launch(LaunchParams calldata p) external payable returns (address token, PoolId poolId, uint256 tokenId) {
        if (address(hook) == address(0)) revert HookNotSet();
        if (msg.value < launchFee) revert FeeNotPaid();
        if (p.creatorFeePips > MAX_CREATOR_FEE || p.creatorShareBps > 10_000 || p.lockBps > 2_000 || (p.lockBps > 0 && p.lockDays == 0) || bytes(p.symbol).length == 0) revert BadParams();
        uint256 devBuyWei = msg.value - launchFee;

        // 1. token, all supply to this contract
        LaunchToken t = new LaunchToken(p.name, p.symbol, msg.sender, address(this));
        token = address(t);
        uint256 supply = t.TOTAL_SUPPLY();

        // 2. founder lock
        uint256 lockAmount = supply * p.lockBps / 10_000;
        if (lockAmount > 0) {
            t.approve(address(vault), lockAmount);
            vault.lock(token, msg.sender, lockAmount, uint64(block.timestamp + uint256(p.lockDays) * 1 days));
        }

        // 3. pool with its own fee + single-sided liquidity with everything that isn't locked
        uint24 totalFee = protocolFeePips + p.creatorFeePips;
        PoolKey memory key = PoolKey(Currency.wrap(address(0)), Currency.wrap(token), V4.DYNAMIC_FEE_FLAG, curve.tickSpacing, address(hook));
        poolId = key.toId();
        tokenId = _openPool(t, key, supply - lockAmount, totalFee);

        // 4. lock LP forever with the fee split
        _registerSplit(tokenId, key, msg.sender, p.creatorShareBps, totalFee);

        // 5. record the launch before any value leaves the contract (checks-effects-interactions)
        launches[token] = Launch(token, poolId, tokenId, msg.sender, totalFee, uint64(block.timestamp));
        allTokens.push(token);

        // 6. launch fee → treasury, dev buy → creator
        (bool ok, ) = treasury.call{value: launchFee}("");
        require(ok, "fee transfer failed");
        if (devBuyWei > 0) _devBuy(key, devBuyWei, p.minDevBuyOut, msg.sender);

        emit Launched(token, msg.sender, poolId, tokenId, p.creatorFeePips, p.creatorShareBps, p.lockBps, p.lockDays, devBuyWei, p.metadataURI);
    }

    function totalLaunches() external view returns (uint256) { return allTokens.length; }

    // ---------------------------------------------------------------- internals
    function _openPool(LaunchToken t, PoolKey memory key, uint256 amount, uint24 totalFee) internal returns (uint256 tokenId) {
        Curve memory c = curve;
        hook.armFee(totalFee);
        int24 tick = poolManager.initialize(key, c.initialSqrtPriceX96);
        require(tick == c.initialTick, "tick mismatch");

        // token is currency1 (ETH is address(0), always currency0). With the current tick at tickUpper the position
        // holds only currency1, so buys (ETH in) walk the price down into the range. L = amount1 · Q96 / (√Pu − √Pl).
        uint256 liquidity = Math.mulDiv(amount, 1 << 96, uint256(c.initialSqrtPriceX96) - uint256(c.minSqrtPriceX96));
        require(liquidity > 0 && liquidity <= type(uint128).max, "liquidity");

        // PositionManager pulls the token through Permit2.
        t.approve(address(permit2), amount);
        permit2.approve(address(t), address(positionManager), uint160(amount), uint48(block.timestamp + 1 hours));

        bytes memory actions = abi.encodePacked(V4.MINT_POSITION, V4.CLOSE_CURRENCY);
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(key, c.minTick, c.initialTick, liquidity, uint128(0), uint128(amount), address(feeLocker), bytes(""));
        params[1] = abi.encode(key.currency1);
        tokenId = positionManager.nextTokenId();
        positionManager.modifyLiquidities(abi.encode(actions, params), block.timestamp);
        require(positionManager.ownerOf(tokenId) == address(feeLocker), "mint");
    }

    /// @dev Total fee = launchpad + founder. Shares are expressed in bps of the *total* so the locker's split sums to 100%:
    ///      treasury = protocol / total; founder = creatorFee · creatorShare / total; community = the rest.
    function _registerSplit(uint256 tokenId, PoolKey memory key, address creator, uint16 creatorShareBps, uint24 totalFee) internal {
        uint16 treasuryBps = uint16(uint256(protocolFeePips) * 10_000 / totalFee);
        uint16 rest = 10_000 - treasuryBps;
        uint16 creatorBps = uint16(uint256(rest) * creatorShareBps / 10_000);
        uint16 communityBps = rest - creatorBps;
        V4FeeLocker.Recipient[] memory rs = new V4FeeLocker.Recipient[](3);
        rs[0] = V4FeeLocker.Recipient(treasury, treasuryBps);
        rs[1] = V4FeeLocker.Recipient(creator, creatorBps);
        rs[2] = V4FeeLocker.Recipient(communityPool, communityBps);
        // creator entry may carry 0 bps (0% fee) and still be re-pointable; the locker skips zero transfers.
        feeLocker.register(tokenId, key, rs, 1);
    }

    function _devBuy(PoolKey memory key, uint256 amountIn, uint256 minOut, address recipient) internal {
        bytes memory out = poolManager.unlock(abi.encode(key, amountIn, minOut, recipient));
        out;
    }

    /// @dev Called by the PoolManager inside `unlock`: swap ETH → token, pay the ETH, hand the tokens to the creator.
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (PoolKey memory key, uint256 amountIn, uint256 minOut, address recipient) = abi.decode(data, (PoolKey, uint256, uint256, address));
        BalanceDelta delta = poolManager.swap(key, SwapParams(true, -int256(amountIn), V4.MIN_SQRT_PRICE + 1), "");
        uint256 owed = uint256(uint128(-delta.amount0()));
        uint256 received = uint256(uint128(delta.amount1()));
        if (received < minOut) revert Slippage();
        poolManager.settle{value: owed}();
        poolManager.take(key.currency1, recipient, received);
        return "";
    }
}
