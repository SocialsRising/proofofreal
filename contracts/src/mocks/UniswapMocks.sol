// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
// Test-only stand-ins for Uniswap V3. They mimic the interfaces the factory touches; they do not price anything.

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {INonfungiblePositionManager, ISwapRouter02} from "../interfaces/IUniswapV3.sol";

contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}
    function deposit() external payable { _mint(msg.sender, msg.value); }
    function withdraw(uint256 a) external { _burn(msg.sender, a); payable(msg.sender).transfer(a); }
}

contract MockPool {
    uint160 public sqrtPriceX96; int24 public tick;
    constructor(uint160 s, int24 t) { sqrtPriceX96 = s; tick = t; }
    function setTick(int24 t) external { tick = t; }
    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) { return (sqrtPriceX96, tick, 0, 0, 0, 0, true); }
}

contract MockPositionManager {
    struct Pos { address token0; address token1; uint24 fee; int24 tickLower; int24 tickUpper; uint128 liquidity; uint128 owed0; uint128 owed1; }
    mapping(uint256 => Pos) public pos;
    mapping(uint256 => address) public ownerOf;
    mapping(bytes32 => address) public pools;
    uint256 public nextId = 1;
    int24 public nextTick; // tick the next created pool reports

    function setNextTick(int24 t) external { nextTick = t; }

    function createAndInitializePoolIfNecessary(address t0, address t1, uint24 fee, uint160 s) external payable returns (address pool) {
        bytes32 k = keccak256(abi.encode(t0, t1, fee));
        if (pools[k] == address(0)) pools[k] = address(new MockPool(s, nextTick));
        return pools[k];
    }
    function mint(INonfungiblePositionManager.MintParams calldata p) external payable returns (uint256 tokenId, uint128 liquidity, uint256 a0, uint256 a1) {
        require(p.tickLower < p.tickUpper, "ticks");
        if (p.amount0Desired > 0) IERC20(p.token0).transferFrom(msg.sender, address(this), p.amount0Desired);
        if (p.amount1Desired > 0) IERC20(p.token1).transferFrom(msg.sender, address(this), p.amount1Desired);
        tokenId = nextId++;
        pos[tokenId] = Pos(p.token0, p.token1, p.fee, p.tickLower, p.tickUpper, 1, 0, 0);
        ownerOf[tokenId] = p.recipient;
        if (p.recipient.code.length > 0) require(IERC721Receiver(p.recipient).onERC721Received(msg.sender, address(0), tokenId, "") == IERC721Receiver.onERC721Received.selector, "receiver");
        return (tokenId, 1, p.amount0Desired, p.amount1Desired);
    }
    /// test helper: pretend fees accrued (tokens must be sent to this contract first)
    function accrue(uint256 tokenId, uint128 a0, uint128 a1) external { pos[tokenId].owed0 += a0; pos[tokenId].owed1 += a1; }
    function collect(INonfungiblePositionManager.CollectParams calldata p) external payable returns (uint256 a0, uint256 a1) {
        require(ownerOf[p.tokenId] == msg.sender, "not owner");
        Pos storage q = pos[p.tokenId];
        a0 = q.owed0; a1 = q.owed1; q.owed0 = 0; q.owed1 = 0;
        if (a0 > 0) IERC20(q.token0).transfer(p.recipient, a0);
        if (a1 > 0) IERC20(q.token1).transfer(p.recipient, a1);
    }
    function positions(uint256 id) external view returns (uint96, address, address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128) {
        Pos memory q = pos[id];
        return (0, address(0), q.token0, q.token1, q.fee, q.tickLower, q.tickUpper, q.liquidity, 0, 0, q.owed0, q.owed1);
    }
    function safeTransferFrom(address, address to, uint256 id) external { require(ownerOf[id] == msg.sender); ownerOf[id] = to; }
}

contract MockRouter {
    uint256 public lastAmountIn; address public lastTokenOut; address public lastRecipient;
    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata p) external payable returns (uint256) {
        IERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        lastAmountIn = p.amountIn; lastTokenOut = p.tokenOut; lastRecipient = p.recipient;
        return p.amountIn;
    }
}
