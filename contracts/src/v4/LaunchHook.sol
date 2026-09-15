// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager, PoolKey, PoolId, V4} from "./IUniswapV4.sol";

/// @title Meme Maxxers LaunchHook
/// @notice The smallest hook that gives every launched pool its own trading fee: launchpad 1% + the founder's
///         0–10%, charged on every buy and sell as the pool's dynamic LP fee. It does nothing on swaps — fees
///         accrue to the (permanently locked) LP position exactly as on a plain Uniswap pool.
///         Only pools created by the factory may use this hook. The contract address must carry the
///         BEFORE_INITIALIZE and AFTER_INITIALIZE permission bits (mined with CREATE2 at deploy time).
contract LaunchHook {
    using V4 for PoolKey;

    IPoolManager public immutable poolManager;
    address public immutable factory;
    /// @dev Set by the factory immediately before `initialize`, consumed in `afterInitialize` of the same tx.
    uint24 private _armedFee;
    mapping(PoolId => uint24) public feeOf;

    /// @notice Hard ceiling on the total fee a launch can carry: 20%.
    uint24 public constant MAX_TOTAL_FEE = 200_000;

    event FeeSet(PoolId indexed poolId, uint24 fee);

    error NotPoolManager();
    error NotFactory();
    error NotLaunchpadPool();
    error BadFee();
    error BadHookAddress();

    constructor(address poolManager_, address factory_) {
        poolManager = IPoolManager(poolManager_);
        factory = factory_;
        uint160 flags = uint160(address(this)) & V4.ALL_HOOK_MASK;
        if (flags != (V4.BEFORE_INITIALIZE_FLAG | V4.AFTER_INITIALIZE_FLAG)) revert BadHookAddress();
    }

    /// @notice Factory arms the fee for the pool it is about to initialize.
    function armFee(uint24 fee) external {
        if (msg.sender != factory) revert NotFactory();
        if (fee == 0 || fee > MAX_TOTAL_FEE) revert BadFee();
        _armedFee = fee;
    }

    function beforeInitialize(address sender, PoolKey calldata key, uint160) external view returns (bytes4) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        if (sender != factory || _armedFee == 0 || key.fee != V4.DYNAMIC_FEE_FLAG) revert NotLaunchpadPool();
        return this.beforeInitialize.selector;
    }

    function afterInitialize(address, PoolKey calldata key, uint160, int24) external returns (bytes4) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        uint24 fee = _armedFee;
        _armedFee = 0;
        PoolId id = key.toId();
        feeOf[id] = fee;
        poolManager.updateDynamicLPFee(key, fee);
        emit FeeSet(id, fee);
        return this.afterInitialize.selector;
    }
}
