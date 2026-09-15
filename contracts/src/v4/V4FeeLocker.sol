// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IPositionManager, PoolKey, Currency, V4} from "./IUniswapV4.sol";

/// @notice Permanently holds Uniswap V4 LP positions and splits their trading fees by basis points.
///         There is deliberately no function that can move a position NFT out of this contract.
///         Fees arrive in native ETH (from buys) and in the launched token (from sells); both are split the same way.
contract V4FeeLocker is IERC721Receiver {
    using SafeERC20 for IERC20;
    using V4 for Currency;

    struct Recipient { address account; uint16 bps; }
    struct Position { PoolKey key; uint8 creatorIndex; uint256 collected0; uint256 collected1; bool exists; }

    IPositionManager public immutable positionManager;
    address public immutable factory;

    mapping(uint256 tokenId => Position) public positions;
    mapping(uint256 tokenId => Recipient[]) internal _recipients;

    event Registered(uint256 indexed tokenId, address token, Recipient[] recipients);
    event Collected(uint256 indexed tokenId, uint256 amountEth, uint256 amountToken);
    /// @dev One per recipient per collect, so the weekly script can attribute the community share to a token.
    event Paid(uint256 indexed tokenId, address indexed account, uint8 index, uint256 amountEth, uint256 amountToken);
    event RecipientUpdated(uint256 indexed tokenId, uint8 index, address oldAccount, address newAccount);

    error NotFactory();
    error NotPositionManager();
    error BadSplit();
    error NotRecipient();
    error UnknownPosition();

    constructor(address positionManager_, address factory_) {
        positionManager = IPositionManager(positionManager_);
        factory = factory_;
    }

    /// @dev The factory mints the position directly to this contract, then registers the split. `creatorIndex` marks the entry the founder may re-point.
    function register(uint256 tokenId, PoolKey calldata key, Recipient[] calldata recipients, uint8 creatorIndex) external {
        if (msg.sender != factory) revert NotFactory();
        if (positionManager.ownerOf(tokenId) != address(this)) revert NotPositionManager();
        uint256 total;
        for (uint256 i; i < recipients.length; i++) { require(recipients[i].account != address(0), "zero recipient"); total += recipients[i].bps; }
        if (total != 10_000 || recipients.length == 0 || creatorIndex >= recipients.length) revert BadSplit();
        positions[tokenId] = Position(key, creatorIndex, 0, 0, true);
        delete _recipients[tokenId];
        for (uint256 i; i < recipients.length; i++) _recipients[tokenId].push(recipients[i]);
        emit Registered(tokenId, Currency.unwrap(key.currency1), recipients);
    }

    /// @notice Anyone can trigger a fee collection; fees are pushed to recipients pro rata. Permissionless by design.
    function collect(uint256 tokenId) external returns (uint256 amountEth, uint256 amountToken) {
        Position storage p = positions[tokenId];
        if (!p.exists) revert UnknownPosition();
        IERC20 token = IERC20(Currency.unwrap(p.key.currency1));
        uint256 ethBefore = address(this).balance;
        uint256 tokBefore = token.balanceOf(address(this));

        // Decrease by zero liquidity = collect fees only, then take both currencies here.
        bytes memory actions = abi.encodePacked(V4.DECREASE_LIQUIDITY, V4.TAKE_PAIR);
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(tokenId, uint256(0), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(p.key.currency0, p.key.currency1, address(this));
        positionManager.modifyLiquidities(abi.encode(actions, params), block.timestamp);

        amountEth = address(this).balance - ethBefore;
        amountToken = token.balanceOf(address(this)) - tokBefore;

        Recipient[] storage rs = _recipients[tokenId];
        uint256 n = rs.length;
        uint256 sentE; uint256 sentT;
        for (uint256 i; i < n; i++) {
            // last recipient takes the rounding dust so nothing is stranded
            uint256 e = i == n - 1 ? amountEth - sentE : amountEth * rs[i].bps / 10_000;
            uint256 t = i == n - 1 ? amountToken - sentT : amountToken * rs[i].bps / 10_000;
            sentE += e; sentT += t;
            if (e > 0) { (bool ok, ) = rs[i].account.call{value: e}(""); require(ok, "eth transfer failed"); }
            if (t > 0) token.safeTransfer(rs[i].account, t);
            if (e > 0 || t > 0) emit Paid(tokenId, rs[i].account, uint8(i), e, t);
        }
        p.collected0 += amountEth; p.collected1 += amountToken;
        emit Collected(tokenId, amountEth, amountToken);
    }

    /// @notice The founder can re-point their own payout address (e.g. to a multisig). Nobody else's.
    function updateCreatorRecipient(uint256 tokenId, address newAccount) external {
        Position storage p = positions[tokenId];
        if (!p.exists) revert UnknownPosition();
        Recipient storage r = _recipients[tokenId][p.creatorIndex];
        if (msg.sender != r.account) revert NotRecipient();
        require(newAccount != address(0), "zero");
        emit RecipientUpdated(tokenId, p.creatorIndex, r.account, newAccount);
        r.account = newAccount;
    }

    function recipients(uint256 tokenId) external view returns (Recipient[] memory) { return _recipients[tokenId]; }
    function poolKeyOf(uint256 tokenId) external view returns (PoolKey memory) { return positions[tokenId].key; }

    function onERC721Received(address, address, uint256, bytes calldata) external view override returns (bytes4) {
        if (msg.sender != address(positionManager)) revert NotPositionManager();
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @dev Native fees arrive here from the PoolManager during collect().
    receive() external payable {}
}
