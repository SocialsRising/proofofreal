// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/*  JPEG Anvil: a fixed-rate swap between one ERC-20 token and one ERC-721 collection.

    forge(ids)  pay `rate` tokens per NFT and take those NFTs from the anvil.
    melt(ids)   hand the anvil your NFTs and get `rate` tokens for each.
    stock(ids)  add NFTs to the anvil without taking tokens (how a creator seeds it).
    sync/prune  fix the list of held NFTs after plain transfers in, or NFTs that left without a swap.
    Tokens are seeded with a plain ERC-20 transfer to the anvil.

    No owner, no admin, no fees, no withdrawals: whatever goes in stays as liquidity for both sides, forever.
    Every swap only moves the caller's own assets. Tokens and NFTs that move each other (ERC-404 style hybrids)
    and fee-on-transfer tokens are refused by balance checks. */

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IERC721Min {
    function ownerOf(uint256) external view returns (address);
    function transferFrom(address, address, uint256) external;
    function supportsInterface(bytes4) external view returns (bool);
}

contract JpegAnvil {
    /// The ERC-20 side.
    address public immutable token;
    /// The ERC-721 side.
    address public immutable nft;
    /// Token base units per NFT, both ways.
    uint256 public immutable rate;
    /// Who created the anvil. Shown in apps only: it has no special powers.
    address public immutable creator;

    /// Most NFTs one call can move, to keep every call well inside the block gas limit.
    uint256 public constant MAX_BATCH = 50;

    uint256[] private _held;                    // NFT ids the anvil holds
    mapping(uint256 => uint256) private _slot;  // id => index in _held + 1 (0 = not held)
    uint256 private _lock = 1;

    event Forged(address indexed by, uint256[] ids, uint256 paid);
    event Melted(address indexed by, uint256[] ids, uint256 received);
    event Stocked(address indexed by, uint256[] ids);

    error Reentrant();
    error EmptyBatch();
    error BatchTooLarge();
    error NotHeld(uint256 id);
    error NotOwner(uint256 id);
    error NotReceived(uint256 id);
    error WrongCollection();
    error ShortPayment();
    error TokenBalanceMoved();
    error NotEnoughTokens();
    error TokenTransferFailed();

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrant();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(address token_, address nft_, uint256 rate_, address creator_) {
        token = token_;
        nft = nft_;
        rate = rate_;
        creator = creator_;
    }

    /* ------------------------------------------------------------------ swaps */

    /// Pay `rate` tokens per NFT and receive the NFTs with these ids. Needs a token approval for rate * ids.length.
    function forge(uint256[] calldata ids) external nonReentrant {
        uint256 n = _checkBatch(ids.length);
        uint256 cost = rate * n;
        uint256 before = IERC20Min(token).balanceOf(address(this));
        _tokenCall(abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), cost)); // transferFrom
        for (uint256 i; i < n; ++i) {
            uint256 id = ids[i];
            if (_slot[id] == 0) revert NotHeld(id);
            _remove(id);
            IERC721Min(nft).transferFrom(address(this), msg.sender, id);
        }
        // Checked after the NFTs leave: the anvil must end up exactly `cost` richer. Refuses fee-on-transfer tokens
        // (they would underpay) and hybrids where moving an NFT also moves tokens (they would drain the reserve).
        if (IERC20Min(token).balanceOf(address(this)) != before + cost) revert ShortPayment();
        emit Forged(msg.sender, ids, cost);
    }

    /// Give the anvil your NFTs with these ids and receive `rate` tokens for each. Needs an NFT approval for the anvil.
    function melt(uint256[] calldata ids) external nonReentrant {
        uint256 n = _checkBatch(ids.length);
        uint256 payout = rate * n;
        uint256 before = IERC20Min(token).balanceOf(address(this));
        if (before < payout) revert NotEnoughTokens();
        _pull(ids, n);
        // Receiving NFTs must not move tokens (refuses ERC-404 style hybrids).
        if (IERC20Min(token).balanceOf(address(this)) != before) revert TokenBalanceMoved();
        _tokenCall(abi.encodeWithSelector(0xa9059cbb, msg.sender, payout)); // transfer
        emit Melted(msg.sender, ids, payout);
    }

    /// Add NFTs to the anvil for nothing in return: how a creator stocks it for forging.
    function stock(uint256[] calldata ids) external nonReentrant {
        _pull(ids, _checkBatch(ids.length));
        emit Stocked(msg.sender, ids);
    }

    /// Track NFTs the anvil owns but doesn't know about (sent with a plain transfer). Anyone can call it.
    function sync(uint256[] calldata ids) external nonReentrant {
        uint256 n = _checkBatch(ids.length);
        for (uint256 i; i < n; ++i) {
            uint256 id = ids[i];
            if (_slot[id] == 0 && IERC721Min(nft).ownerOf(id) == address(this)) _add(id);
        }
    }

    /// Drop ids the anvil no longer owns (burned or taken back by the collection), so they don't block forging.
    function prune(uint256[] calldata ids) external nonReentrant {
        uint256 n = _checkBatch(ids.length);
        for (uint256 i; i < n; ++i) {
            uint256 id = ids[i];
            if (_slot[id] == 0) continue;
            (bool ok, bytes memory ret) = nft.staticcall(abi.encodeWithSelector(IERC721Min.ownerOf.selector, id));
            if (!ok || ret.length < 32 || abi.decode(ret, (address)) != address(this)) _remove(id);
        }
    }

    /// NFTs sent with safeTransferFrom are tracked automatically. Only this anvil's collection is accepted.
    function onERC721Received(address, address, uint256 id, bytes calldata) external returns (bytes4) {
        if (msg.sender != nft) revert WrongCollection();
        if (_lock == 1 && _slot[id] == 0 && IERC721Min(nft).ownerOf(id) == address(this)) _add(id);
        return this.onERC721Received.selector;
    }

    /* ------------------------------------------------------------------ views */

    /// How many NFTs the anvil holds.
    function heldCount() external view returns (uint256) {
        return _held.length;
    }

    /// A page of the NFT ids the anvil holds.
    function heldIds(uint256 start, uint256 count) external view returns (uint256[] memory ids) {
        uint256 len = _held.length;
        if (start >= len) return ids;
        uint256 end = count > len - start ? len : start + count;
        ids = new uint256[](end - start);
        for (uint256 i = start; i < end; ++i) ids[i - start] = _held[i];
    }

    /// Whether the anvil holds this NFT.
    function holds(uint256 id) external view returns (bool) {
        return _slot[id] != 0;
    }

    /// Tokens the anvil holds, available to melters.
    function reserve() external view returns (uint256) {
        return IERC20Min(token).balanceOf(address(this));
    }

    /* ------------------------------------------------------------------ internals */

    function _checkBatch(uint256 n) private pure returns (uint256) {
        if (n == 0) revert EmptyBatch();
        if (n > MAX_BATCH) revert BatchTooLarge();
        return n;
    }

    /// Moves the caller's NFTs into the anvil and tracks them.
    function _pull(uint256[] calldata ids, uint256 n) private {
        for (uint256 i; i < n; ++i) {
            uint256 id = ids[i];
            // Only the caller's own NFTs, even if the collection's transferFrom is loose about `from`.
            if (IERC721Min(nft).ownerOf(id) != msg.sender) revert NotOwner(id);
            IERC721Min(nft).transferFrom(msg.sender, address(this), id);
            if (IERC721Min(nft).ownerOf(id) != address(this)) revert NotReceived(id);
            if (_slot[id] == 0) _add(id); // an id can be listed already if it once left without a swap
        }
    }

    function _add(uint256 id) private {
        _held.push(id);
        _slot[id] = _held.length;
    }

    function _remove(uint256 id) private {
        uint256 idx = _slot[id] - 1;
        uint256 last = _held[_held.length - 1];
        _held[idx] = last;
        _slot[last] = idx + 1;
        _held.pop();
        delete _slot[id];
    }

    /// ERC-20 call that also accepts tokens returning nothing (USDT style).
    function _tokenCall(bytes memory data) private {
        (bool ok, bytes memory ret) = token.call(data);
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TokenTransferFailed();
    }
}

/// Creates anvils and lists them. No owner and no fees. Deployed once through the standard CREATE2 deployer,
/// so its address is the same for everyone.
contract JpegAnvilFactory {
    address[] private _anvils;

    event AnvilCreated(address indexed anvil, address indexed token, address indexed nft, uint256 rate, address creator);

    error NotAContract();
    error NotAnNft();
    error NotAToken();
    error ZeroRate();
    error SameAddress();
    error RateTooHigh();

    /// Creates an anvil for this token and collection at `rate` token base units per NFT.
    function create(address token, address nft, uint256 rate) external returns (address anvil) {
        if (token.code.length == 0 || nft.code.length == 0) revert NotAContract();
        if (token == nft) revert SameAddress();
        if (rate == 0) revert ZeroRate();
        if (rate > type(uint256).max / 50) revert RateTooHigh();
        // The NFT side must say it's ERC-721 (ERC-165); the token side must answer like an ERC-20 and not claim ERC-721.
        if (!_saysErc721(nft)) revert NotAnNft();
        if (_saysErc721(token)) revert NotAToken();
        (bool ok, bytes memory ret) = token.staticcall(abi.encodeWithSelector(IERC20Min.totalSupply.selector));
        if (!ok || ret.length < 32) revert NotAToken();
        anvil = address(new JpegAnvil(token, nft, rate, msg.sender));
        _anvils.push(anvil);
        emit AnvilCreated(anvil, token, nft, rate, msg.sender);
    }

    function count() external view returns (uint256) {
        return _anvils.length;
    }

    function _saysErc721(address a) private view returns (bool) {
        (bool ok, bytes memory ret) = a.staticcall(abi.encodeWithSelector(IERC721Min.supportsInterface.selector, bytes4(0x80ac58cd)));
        return ok && ret.length >= 32 && abi.decode(ret, (uint256)) == 1;
    }

    /// A page of anvils, oldest first.
    function list(uint256 start, uint256 count_) external view returns (address[] memory out) {
        uint256 len = _anvils.length;
        if (start >= len) return out;
        uint256 end = count_ > len - start ? len : start + count_;
        out = new address[](end - start);
        for (uint256 i = start; i < end; ++i) out[i - start] = _anvils[i];
    }
}
