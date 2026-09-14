// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {LaunchToken} from "./LaunchToken.sol";
import {FounderVault} from "./FounderVault.sol";
import {FeeLocker} from "./FeeLocker.sol";
import {INonfungiblePositionManager, IUniswapV3Pool, ISwapRouter02, IWETH9} from "./interfaces/IUniswapV3.sol";

/// @title Meme Maxxers LaunchFactory
/// @notice One transaction: mint a 1B token, open its Uniswap V3 pool against WETH, seed all unlocked supply as
///         single-sided liquidity, lock the LP position forever in the FeeLocker with a bps fee split, optionally
///         time-lock a founder share and execute a dev buy. The AMM is Uniswap; this contract never custodies user funds
///         after the launch transaction completes.
contract LaunchFactory is Ownable {
    using SafeERC20 for IERC20;

    struct LaunchParams {
        string name;
        string symbol;
        uint16 creatorShareBps;   // creator's share of the non-protocol fee, 0..5000 (stakers always get ≥ 50%)
        uint16 lockBps;           // founder lock, % of supply in bps (0 = none), max 2000
        uint32 lockDays;          // lock duration in days (required if lockBps > 0)
        uint256 minDevBuyOut;     // slippage floor for the dev buy (0 = none)
        string metadataURI;       // off-chain metadata (image, description, socials); mirrored in the registry
    }

    struct Launch { address token; address pool; uint256 tokenId; address creator; uint24 fee; uint64 launchedAt; }

    INonfungiblePositionManager public immutable positionManager;
    ISwapRouter02 public immutable swapRouter;
    IWETH9 public immutable weth;
    FounderVault public immutable vault;
    FeeLocker public immutable feeLocker;

    address public treasury;          // launchpad fee recipient
    address public stakersPool;       // where the stakers' share accrues for weekly distribution
    uint16 public protocolBps = 3_000; // launchpad share of every trading fee (30%)
    uint256 public launchFee = 0.0005 ether;
    uint24 public poolFee = 10_000;   // Uniswap V3 1% tier (max available without a V4 hook)
    uint256 public initialMcapWei = 3 ether; // starting market cap for a fresh token, in ETH

    mapping(address token => Launch) public launches;
    address[] public allTokens;

    event Launched(address indexed token, address indexed creator, address pool, uint256 tokenId, uint16 creatorShareBps, uint16 lockBps, uint32 lockDays, uint256 devBuyWei, string metadataURI);
    event ConfigUpdated(address treasury, address stakersPool, uint16 protocolBps, uint256 launchFee, uint256 initialMcapWei);

    error BadParams();
    error FeeNotPaid();

    constructor(address positionManager_, address swapRouter_, address weth_, address treasury_, address stakersPool_, address owner_) Ownable(owner_) {
        positionManager = INonfungiblePositionManager(positionManager_);
        swapRouter = ISwapRouter02(swapRouter_);
        weth = IWETH9(weth_);
        treasury = treasury_;
        stakersPool = stakersPool_;
        vault = new FounderVault();
        feeLocker = new FeeLocker(positionManager_, address(this));
    }

    // ---------------------------------------------------------------- admin
    function setConfig(address treasury_, address stakersPool_, uint16 protocolBps_, uint256 launchFee_, uint256 initialMcapWei_) external onlyOwner {
        require(treasury_ != address(0) && stakersPool_ != address(0) && protocolBps_ <= 5_000 && initialMcapWei_ > 0, "bad config");
        treasury = treasury_; stakersPool = stakersPool_; protocolBps = protocolBps_; launchFee = launchFee_; initialMcapWei = initialMcapWei_;
        emit ConfigUpdated(treasury_, stakersPool_, protocolBps_, launchFee_, initialMcapWei_);
    }

    // ---------------------------------------------------------------- launch
    /// @param p launch params. msg.value = launchFee + dev buy (anything above the fee is spent buying the token for the creator).
    function launch(LaunchParams calldata p) external payable returns (address token, address pool, uint256 tokenId) {
        if (msg.value < launchFee) revert FeeNotPaid();
        if (p.creatorShareBps > 5_000 || p.lockBps > 2_000 || (p.lockBps > 0 && p.lockDays == 0) || bytes(p.symbol).length == 0) revert BadParams();
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

        // 3. pool + single-sided liquidity with everything that isn't locked
        uint256 liquidityAmount = supply - lockAmount;
        (pool, tokenId) = _openPool(t, liquidityAmount);

        // 4. lock LP forever with the fee split
        _registerSplit(tokenId, msg.sender, p.creatorShareBps);

        // 5. record the launch before any value leaves the contract (checks-effects-interactions)
        launches[token] = Launch(token, pool, tokenId, msg.sender, poolFee, uint64(block.timestamp));
        allTokens.push(token);

        // 6. launch fee → treasury, dev buy → creator
        (bool ok, ) = treasury.call{value: launchFee}("");
        require(ok, "fee transfer failed");
        if (devBuyWei > 0) _devBuy(token, devBuyWei, p.minDevBuyOut, msg.sender);
        emit Launched(token, msg.sender, pool, tokenId, p.creatorShareBps, p.lockBps, p.lockDays, devBuyWei, p.metadataURI);
    }

    function totalLaunches() external view returns (uint256) { return allTokens.length; }

    // ---------------------------------------------------------------- internals
    function _openPool(LaunchToken t, uint256 amount) internal returns (address pool, uint256 tokenId) {
        address token = address(t);
        bool tokenIs0 = token < address(weth);
        (address token0, address token1) = tokenIs0 ? (token, address(weth)) : (address(weth), token);
        uint160 sqrtPrice = _initialSqrtPrice(tokenIs0);
        pool = positionManager.createAndInitializePoolIfNecessary(token0, token1, poolFee, sqrtPrice);

        int24 spacing = _tickSpacing(poolFee);
        int24 maxTick = (887272 / spacing) * spacing;
        (, int24 tick, , , , , ) = IUniswapV3Pool(pool).slot0();
        int24 lower; int24 upper;
        if (tokenIs0) {
            // token is token0: buys push the tick up, so the sell-side range sits strictly above the current tick
            lower = _floorTick(tick, spacing) + spacing; upper = maxTick;
        } else {
            // token is token1: buys push the tick down, so the range sits at or below the current tick
            lower = -maxTick; upper = _floorTick(tick, spacing);
        }

        require(lower < upper, "bad range");

        t.approve(address(positionManager), amount);
        (tokenId, , , ) = positionManager.mint(INonfungiblePositionManager.MintParams({
            token0: token0, token1: token1, fee: poolFee, tickLower: lower, tickUpper: upper,
            amount0Desired: tokenIs0 ? amount : 0, amount1Desired: tokenIs0 ? 0 : amount,
            amount0Min: 0, amount1Min: 0, recipient: address(feeLocker), deadline: block.timestamp
        }));
    }

    function _registerSplit(uint256 tokenId, address creator, uint16 creatorShareBps) internal {
        uint16 rest = 10_000 - protocolBps;
        uint16 creatorBps = uint16(uint256(rest) * creatorShareBps / 10_000);
        uint16 stakersBps = rest - creatorBps;
        FeeLocker.Recipient[] memory rs = new FeeLocker.Recipient[](3);
        rs[0] = FeeLocker.Recipient(treasury, protocolBps);
        rs[1] = FeeLocker.Recipient(creator, creatorBps);
        rs[2] = FeeLocker.Recipient(stakersPool, stakersBps);
        // creator entry may carry 0 bps (Diamond Handers) and still be re-pointable; FeeLocker skips zero transfers.
        feeLocker.register(tokenId, rs, 1);
    }

    function _devBuy(address token, uint256 amountIn, uint256 minOut, address recipient) internal {
        weth.deposit{value: amountIn}();
        weth.approve(address(swapRouter), amountIn);
        swapRouter.exactInputSingle(ISwapRouter02.ExactInputSingleParams({
            tokenIn: address(weth), tokenOut: token, fee: poolFee, recipient: recipient,
            amountIn: amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: 0
        }));
    }

    /// @dev sqrtPriceX96 for a 1B-supply token at `initialMcapWei` market cap. price = WETH per token = mcap / 1e27 (raw units).
    function _initialSqrtPrice(bool tokenIs0) internal view returns (uint160) {
        uint256 sqrtM = Math.sqrt(initialMcapWei * 1e18);       // ≈ sqrt(mcap) * 1e9
        uint256 sqrt1e45 = 31622776601683793319988;             // sqrt(1e27 * 1e18)
        uint256 q96 = 1 << 96;
        uint256 s = tokenIs0 ? sqrtM * q96 / sqrt1e45 : sqrt1e45 * q96 / sqrtM;
        require(s > 4295128739 && s < 1461446703485210103287273052203988822378723970342, "price out of range");
        return uint160(s);
    }

    function _tickSpacing(uint24 fee) internal pure returns (int24) {
        if (fee == 10_000) return 200;
        if (fee == 3_000) return 60;
        if (fee == 500) return 10;
        return 1;
    }
    function _floorTick(int24 tick, int24 spacing) internal pure returns (int24) { int24 c = tick / spacing; if (tick < 0 && tick % spacing != 0) c--; return c * spacing; }
}
