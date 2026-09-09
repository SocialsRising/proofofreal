// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @notice Weekly soft-staking payouts. Each epoch is a Merkle root over (account, amount) in a reward token,
///         funded up front. The reward token can differ per epoch (WETH now, QUANT later). Roots are immutable once set.
contract RewardsDistributor is Ownable {
    using SafeERC20 for IERC20;

    struct Epoch { address rewardToken; bytes32 root; uint256 total; uint256 claimed; uint64 publishedAt; string dataURI; }
    mapping(uint256 epochId => Epoch) public epochs;
    mapping(uint256 epochId => mapping(address => bool)) public hasClaimed;
    uint256 public epochCount;

    event EpochPublished(uint256 indexed epochId, address rewardToken, bytes32 root, uint256 total, string dataURI);
    event Claimed(uint256 indexed epochId, address indexed account, uint256 amount);

    constructor(address owner_) Ownable(owner_) {}

    /// @dev Caller must have approved `total` of `rewardToken`. `dataURI` points at the public CSV/JSON behind the root.
    function publish(address rewardToken, bytes32 root, uint256 total, string calldata dataURI) external onlyOwner returns (uint256 id) {
        require(root != bytes32(0) && total > 0, "bad epoch");
        id = ++epochCount;
        epochs[id] = Epoch(rewardToken, root, total, 0, uint64(block.timestamp), dataURI);
        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), total);
        emit EpochPublished(id, rewardToken, root, total, dataURI);
    }

    function claim(uint256 epochId, address account, uint256 amount, bytes32[] calldata proof) external {
        Epoch storage e = epochs[epochId];
        require(e.root != bytes32(0), "no epoch");
        require(!hasClaimed[epochId][account], "claimed");
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(epochId, account, amount))));
        require(MerkleProof.verify(proof, e.root, leaf), "bad proof");
        hasClaimed[epochId][account] = true;
        e.claimed += amount;
        IERC20(e.rewardToken).safeTransfer(account, amount);
        emit Claimed(epochId, account, amount);
    }

    function claimMany(uint256[] calldata ids, address account, uint256[] calldata amounts, bytes32[][] calldata proofs) external {
        for (uint256 i; i < ids.length; i++) this.claim(ids[i], account, amounts[i], proofs[i]);
    }

    /// @notice After 180 days, unclaimed rewards of an epoch can be swept back to fund future epochs.
    function sweep(uint256 epochId, address to) external onlyOwner {
        Epoch storage e = epochs[epochId];
        require(block.timestamp > e.publishedAt + 180 days, "too early");
        uint256 left = e.total - e.claimed;
        e.claimed = e.total;
        IERC20(e.rewardToken).safeTransfer(to, left);
    }
}
