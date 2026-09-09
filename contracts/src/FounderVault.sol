// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Time-locks a founder's share of supply. One lock per (token, beneficiary). Nobody can shorten it.
contract FounderVault {
    using SafeERC20 for IERC20;

    struct Lock { uint256 amount; uint64 unlockTime; bool claimed; }
    mapping(address token => mapping(address beneficiary => Lock)) public locks;

    event Locked(address indexed token, address indexed beneficiary, uint256 amount, uint64 unlockTime);
    event Claimed(address indexed token, address indexed beneficiary, uint256 amount);

    error AlreadyLocked();
    error NothingToClaim();
    error StillLocked(uint64 unlockTime);

    /// @dev Caller must have approved `amount` of `token` to this contract. Called by the factory during launch.
    function lock(address token, address beneficiary, uint256 amount, uint64 unlockTime) external {
        if (locks[token][beneficiary].amount != 0) revert AlreadyLocked();
        require(amount > 0 && unlockTime > block.timestamp, "bad lock");
        locks[token][beneficiary] = Lock(amount, unlockTime, false);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Locked(token, beneficiary, amount, unlockTime);
    }

    function claim(address token) external {
        Lock storage l = locks[token][msg.sender];
        if (l.amount == 0 || l.claimed) revert NothingToClaim();
        if (block.timestamp < l.unlockTime) revert StillLocked(l.unlockTime);
        l.claimed = true;
        IERC20(token).safeTransfer(msg.sender, l.amount);
        emit Claimed(token, msg.sender, l.amount);
    }
}
