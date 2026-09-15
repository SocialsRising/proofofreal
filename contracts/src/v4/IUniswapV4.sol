// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Uniswap V4 types and interfaces used by the launchpad. Kept local (like the V3 set) so the
///         contracts compile with our pinned solc and carry no external dependency.
type Currency is address;
type BalanceDelta is int256;
type PoolId is bytes32;

struct PoolKey { Currency currency0; Currency currency1; uint24 fee; int24 tickSpacing; address hooks; }
struct SwapParams { bool zeroForOne; int256 amountSpecified; uint160 sqrtPriceLimitX96; }

library V4 {
    /// @dev PoolKey.fee value that marks a pool as dynamic-fee; the hook then sets the real fee.
    uint24 internal constant DYNAMIC_FEE_FLAG = 0x800000;
    /// @dev 100% in V4 fee units (hundredths of a bip). 1% = 10_000.
    uint24 internal constant ONE_HUNDRED_PERCENT = 1_000_000;
    uint160 internal constant MIN_SQRT_PRICE = 4295128739;
    uint160 internal constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342;
    int24 internal constant MIN_TICK = -887272;
    int24 internal constant MAX_TICK = 887272;
    // hook address permission bits (Hooks.sol)
    uint160 internal constant BEFORE_INITIALIZE_FLAG = 1 << 13;
    uint160 internal constant AFTER_INITIALIZE_FLAG = 1 << 12;
    uint160 internal constant ALL_HOOK_MASK = (1 << 14) - 1;
    // PositionManager actions (Actions.sol)
    uint8 internal constant DECREASE_LIQUIDITY = 0x01;
    uint8 internal constant MINT_POSITION = 0x02;
    uint8 internal constant TAKE_PAIR = 0x11;
    uint8 internal constant CLOSE_CURRENCY = 0x12;

    function toId(PoolKey memory k) internal pure returns (PoolId) { return PoolId.wrap(keccak256(abi.encode(k))); }
    function amount0(BalanceDelta d) internal pure returns (int128) { return int128(BalanceDelta.unwrap(d) >> 128); }
    function amount1(BalanceDelta d) internal pure returns (int128) { return int128(BalanceDelta.unwrap(d)); }
    function isNative(Currency c) internal pure returns (bool) { return Currency.unwrap(c) == address(0); }
}

interface IPoolManager {
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData) external returns (BalanceDelta);
    function sync(Currency currency) external;
    function settle() external payable returns (uint256 paid);
    function take(Currency currency, address to, uint256 amount) external;
    function updateDynamicLPFee(PoolKey memory key, uint24 newDynamicLPFee) external;
}

interface IUnlockCallback { function unlockCallback(bytes calldata data) external returns (bytes memory); }

interface IPositionManager {
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
    function nextTokenId() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPositionLiquidity(uint256 tokenId) external view returns (uint128 liquidity);
    function getPoolAndPositionInfo(uint256 tokenId) external view returns (PoolKey memory, uint256 info);
}

interface IPermit2 { function approve(address token, address spender, uint160 amount, uint48 expiration) external; }

interface IStateView {
    function getSlot0(PoolId poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
    function getLiquidity(PoolId poolId) external view returns (uint128 liquidity);
}
