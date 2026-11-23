// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract MockToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    uint8 public decimals = 18;
    uint256 public feeBps;      // fee-on-transfer simulation
    bool public noReturn;       // USDT-style (returns nothing)
    function setFee(uint256 b) external { feeBps = b; }
    function forceMove(address f, address t, uint256 a) external { _move(f, t, a); } // test hook for hybrids
    function mint(address to, uint256 a) external { balanceOf[to] += a; totalSupply += a; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function _move(address f, address t, uint256 a) internal { balanceOf[f] -= a; uint256 fee = a * feeBps / 10000; balanceOf[t] += a - fee; }
    function transfer(address t, uint256 a) external returns (bool) { _move(msg.sender, t, a); return true; }
    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        uint256 al = allowance[f][msg.sender]; require(al >= a, "allowance"); allowance[f][msg.sender] = al - a; _move(f, t, a); return true;
    }
}

/// USDT-style token: transfer/transferFrom return nothing.
contract NoReturnToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    function mint(address to, uint256 a) external { balanceOf[to] += a; totalSupply += a; }
    function approve(address s, uint256 a) external { allowance[msg.sender][s] = a; }
    function transfer(address t, uint256 a) external { balanceOf[msg.sender] -= a; balanceOf[t] += a; }
    function transferFrom(address f, address t, uint256 a) external { require(allowance[f][msg.sender] >= a, "allowance"); allowance[f][msg.sender] -= a; balanceOf[f] -= a; balanceOf[t] += a; }
}

/// Token that returns false instead of reverting.
contract FalseToken {
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;
    function mint(address to, uint256 a) external { balanceOf[to] += a; totalSupply += a; }
    function transfer(address, uint256) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return false; }
}

interface IAnvil { function melt(uint256[] calldata) external; function forge(uint256[] calldata) external; }
interface IReceiver { function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4); }

contract MockNFT {
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    address public reenterTarget; // when set, transferFrom tries to re-enter this anvil
    function supportsInterface(bytes4 id) external pure returns (bool) { return id == 0x80ac58cd || id == 0x01ffc9a7; }
    function mint(address to, uint256 id) external { require(ownerOf[id] == address(0)); ownerOf[id] = to; balanceOf[to]++; }
    function approve(address s, uint256 id) external { require(ownerOf[id] == msg.sender); getApproved[id] = s; }
    function setApprovalForAll(address o, bool v) external { isApprovedForAll[msg.sender][o] = v; }
    function setReenter(address a) external { reenterTarget = a; }
    function transferFrom(address f, address t, uint256 id) public {
        require(ownerOf[id] == f, "not owner");
        require(msg.sender == f || getApproved[id] == msg.sender || isApprovedForAll[f][msg.sender], "not approved");
        ownerOf[id] = t; balanceOf[f]--; balanceOf[t]++; delete getApproved[id];
        if (reenterTarget != address(0)) { uint256[] memory ids = new uint256[](1); ids[0] = 999; IAnvil(reenterTarget).melt(ids); }
    }
    function safeTransferFrom(address f, address t, uint256 id) external {
        transferFrom(f, t, id);
        if (t.code.length > 0) require(IReceiver(t).onERC721Received(msg.sender, f, id, "") == IReceiver.onERC721Received.selector, "receiver");
    }
}

/// A contract that is not an NFT (no ERC-165).
contract NotNft { function ownerOf(uint256) external pure returns (address) { return address(0); } }

/// transferFrom ignores `from`: moves the token from its real owner if the caller is approved (a sloppy collection).
contract LooseNFT {
    mapping(uint256 => address) public ownerOf;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    function supportsInterface(bytes4 id) external pure returns (bool) { return id == 0x80ac58cd || id == 0x01ffc9a7; }
    function mint(address to, uint256 id) external { ownerOf[id] = to; }
    function setApprovalForAll(address o, bool v) external { isApprovedForAll[msg.sender][o] = v; }
    function transferFrom(address, address t, uint256 id) external {
        address owner = ownerOf[id];
        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "not approved");
        ownerOf[id] = t;
    }
}

/// ERC-404 style: moving an NFT also moves `unit` tokens of a linked token.
contract HybridNFT {
    mapping(uint256 => address) public ownerOf;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    MockToken public tok; uint256 public unit;
    constructor(MockToken t, uint256 u) { tok = t; unit = u; }
    function supportsInterface(bytes4 id) external pure returns (bool) { return id == 0x80ac58cd || id == 0x01ffc9a7; }
    function mint(address to, uint256 id) external { ownerOf[id] = to; }
    function setApprovalForAll(address o, bool v) external { isApprovedForAll[msg.sender][o] = v; }
    function burnFrom(uint256 id) external { ownerOf[id] = address(0xdead); }
    function transferFrom(address f, address t, uint256 id) external {
        require(ownerOf[id] == f && (msg.sender == f || isApprovedForAll[f][msg.sender]), "no");
        ownerOf[id] = t; tok.forceMove(f, t, unit);
    }
}

/// Token whose fallback quietly returns nothing for unknown calls (e.g. supportsInterface).
contract QuietToken {
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply = 1;
    fallback() external {}
}
