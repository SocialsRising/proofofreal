// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {INonfungiblePositionManager} from "./interfaces/IUniswapV3.sol";

/// @notice Permanently holds Uniswap V3 LP positions and splits their trading fees by basis points.
///         There is deliberately no function that can move an LP NFT out of this contract.
contract FeeLocker is IERC721Receiver {
    using SafeERC20 for IERC20;

    struct Recipient { address account; uint16 bps; }
    struct Position { address token0; address token1; uint8 creatorIndex; uint256 collected0; uint256 collected1; }

    INonfungiblePositionManager public immutable positionManager;
    address public immutable factory;

    mapping(uint256 tokenId => Position) public positions;
    mapping(uint256 tokenId => Recipient[]) internal _recipients;

    event Registered(uint256 indexed tokenId, address token0, address token1, Recipient[] recipients);
    event Collected(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event RecipientUpdated(uint256 indexed tokenId, uint8 index, address oldAccount, address newAccount);

    error NotFactory();
    error NotPositionManager();
    error BadSplit();
    error NotRecipient();

    constructor(address positionManager_, address factory_) {
        positionManager = INonfungiblePositionManager(positionManager_);
        factory = factory_;
    }

    /// @dev Factory transfers the NFT here first, then registers the split. `creatorIndex` marks the entry the creator may re-point.
    function register(uint256 tokenId, Recipient[] calldata recipients, uint8 creatorIndex) external {
        if (msg.sender != factory) revert NotFactory();
        if (positionManager.ownerOf(tokenId) != address(this)) revert NotPositionManager();
        uint256 total;
        for (uint256 i; i < recipients.length; i++) { require(recipients[i].account != address(0), "zero recipient"); total += recipients[i].bps; }
        if (total != 10_000 || recipients.length == 0 || creatorIndex >= recipients.length) revert BadSplit();
        (, , address token0, address token1, , , , , , , , ) = positionManager.positions(tokenId);
        positions[tokenId] = Position(token0, token1, creatorIndex, 0, 0);
        delete _recipients[tokenId];
        for (uint256 i; i < recipients.length; i++) _recipients[tokenId].push(recipients[i]);
        emit Registered(tokenId, token0, token1, recipients);
    }

    /// @notice Anyone can trigger a fee collection; fees are pushed to recipients pro rata. Permissionless by design.
    function collect(uint256 tokenId) external returns (uint256 amount0, uint256 amount1) {
        Position storage p = positions[tokenId];
        require(p.token0 != address(0), "unknown position");
        (amount0, amount1) = positionManager.collect(INonfungiblePositionManager.CollectParams(tokenId, address(this), type(uint128).max, type(uint128).max));
        Recipient[] storage rs = _recipients[tokenId];
        uint256 n = rs.length;
        uint256 sent0; uint256 sent1;
        for (uint256 i; i < n; i++) {
            // last recipient takes the rounding dust so nothing is stranded
            uint256 a0 = i == n - 1 ? amount0 - sent0 : amount0 * rs[i].bps / 10_000;
            uint256 a1 = i == n - 1 ? amount1 - sent1 : amount1 * rs[i].bps / 10_000;
            sent0 += a0; sent1 += a1;
            if (a0 > 0) IERC20(p.token0).safeTransfer(rs[i].account, a0);
            if (a1 > 0) IERC20(p.token1).safeTransfer(rs[i].account, a1);
        }
        p.collected0 += amount0; p.collected1 += amount1;
        emit Collected(tokenId, amount0, amount1);
    }

    /// @notice The creator can re-point their own payout address (e.g. to a multisig). Nobody else's.
    function updateCreatorRecipient(uint256 tokenId, address newAccount) external {
        Position storage p = positions[tokenId];
        Recipient storage r = _recipients[tokenId][p.creatorIndex];
        if (msg.sender != r.account) revert NotRecipient();
        require(newAccount != address(0), "zero");
        emit RecipientUpdated(tokenId, p.creatorIndex, r.account, newAccount);
        r.account = newAccount;
    }

    function recipients(uint256 tokenId) external view returns (Recipient[] memory) { return _recipients[tokenId]; }

    function onERC721Received(address, address, uint256, bytes calldata) external view override returns (bytes4) {
        if (msg.sender != address(positionManager)) revert NotPositionManager();
        return IERC721Receiver.onERC721Received.selector;
    }
}
