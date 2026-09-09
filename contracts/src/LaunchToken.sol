// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @notice Plain fixed-supply token. No owner, no tax, no mint, no blacklist. 1,000,000,000 × 1e18, minted once to the factory.
contract LaunchToken is ERC20, ERC20Permit {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;
    address public immutable creator;
    address public immutable launchpad;

    constructor(string memory name_, string memory symbol_, address creator_, address recipient)
        ERC20(name_, symbol_) ERC20Permit(name_)
    {
        creator = creator_;
        launchpad = msg.sender;
        _mint(recipient, TOTAL_SUPPLY);
    }
}
