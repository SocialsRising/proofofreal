// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager, IUnlockCallback, PoolKey, SwapParams, BalanceDelta, Currency, V4} from "../IUniswapV4.sol";

/// @dev Test-only: lets an EOA trade a launched pool directly through the PoolManager (buy with ETH, sell for ETH).
contract TestSwapper is IUnlockCallback {
    using V4 for BalanceDelta;
    IPoolManager public immutable poolManager;
    constructor(address pm) { poolManager = IPoolManager(pm); }

    function buy(PoolKey calldata key, uint256 minOut) external payable returns (uint256 out) {
        bytes memory r = poolManager.unlock(abi.encode(true, key, msg.value, minOut, msg.sender));
        out = abi.decode(r, (uint256));
    }
    /// @dev caller must approve `amountIn` of key.currency1 to this contract first.
    function sell(PoolKey calldata key, uint256 amountIn, uint256 minOut) external returns (uint256 out) {
        bytes memory r = poolManager.unlock(abi.encode(false, key, amountIn, minOut, msg.sender));
        out = abi.decode(r, (uint256));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "pm");
        (bool isBuy, PoolKey memory key, uint256 amountIn, uint256 minOut, address user) = abi.decode(data, (bool, PoolKey, uint256, uint256, address));
        if (isBuy) {
            BalanceDelta d = poolManager.swap(key, SwapParams(true, -int256(amountIn), V4.MIN_SQRT_PRICE + 1), "");
            uint256 owed = uint256(uint128(-d.amount0())); uint256 out = uint256(uint128(d.amount1()));
            require(out >= minOut, "slippage");
            poolManager.settle{value: owed}();
            poolManager.take(key.currency1, user, out);
            if (amountIn > owed) { (bool ok, ) = user.call{value: amountIn - owed}(""); require(ok); }
            return abi.encode(out);
        } else {
            BalanceDelta d = poolManager.swap(key, SwapParams(false, -int256(amountIn), V4.MAX_SQRT_PRICE - 1), "");
            uint256 owed = uint256(uint128(-d.amount1())); uint256 out = uint256(uint128(d.amount0()));
            require(out >= minOut, "slippage");
            poolManager.sync(key.currency1);
            IERC20 token = IERC20(_addr(key.currency1));
            token.transferFrom(user, address(poolManager), owed);
            poolManager.settle();
            poolManager.take(key.currency0, user, out);
            return abi.encode(out);
        }
    }
    function _addr(Currency c) internal pure returns (address) { return Currency.unwrap(c); }
    receive() external payable {}
}
