/* JPEG Anvil helpers: read an anvil and its two sides, plus NFT image lookup. Contracts: contracts/JpegAnvil.sol. */
import { erc20Abi, keccak256, type PublicClient } from "viem";
import { ANVIL_ABI, ANVIL_FACTORY, ANVIL_FACTORY_ABI, ANVIL_FACTORY_RUNTIME_HASH, CREATE2_DEPLOYER, CREATE2_DEPLOYER_CODE_HASH } from "./anvilArtifacts";

export const ERC721_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "tokenOfOwnerByIndex", stateMutability: "view", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "supportsInterface", stateMutability: "view", inputs: [{ type: "bytes4" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "isApprovedForAll", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "setApprovalForAll", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bool" }], outputs: [] },
] as const;

/** Rate presets: tokens per NFT. */
export const RATE_PRESETS = [100_000, 1_000_000, 10_000_000];
export const MAX_BATCH = 50;

export type AnvilInfo = {
  address: `0x${string}`; token: `0x${string}`; nft: `0x${string}`; rate: bigint; creator: `0x${string}`;
  held: bigint; reserve: bigint; symbol: string; decimals: number; nftName: string;
};

const str = (v: unknown, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");

/** Everything the page shows about one anvil. Token and collection names come from their own contracts. */
export async function readAnvil(c: PublicClient, address: `0x${string}`): Promise<AnvilInfo> {
  const at = { address, abi: ANVIL_ABI } as const;
  const [token, nft, rate, creator, held, reserve] = await Promise.all([
    c.readContract({ ...at, functionName: "token" }), c.readContract({ ...at, functionName: "nft" }), c.readContract({ ...at, functionName: "rate" }),
    c.readContract({ ...at, functionName: "creator" }), c.readContract({ ...at, functionName: "heldCount" }), c.readContract({ ...at, functionName: "reserve" }),
  ]);
  const [symbol, decimals, nftName] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    c.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    c.readContract({ address: nft, abi: ERC721_ABI, functionName: "name" }).catch(() => "NFT collection"),
  ]);
  return { address, token, nft, rate, creator, held, reserve, symbol: str(symbol, 16) || "TOKEN", decimals: Number(decimals), nftName: str(nftName) || "NFT collection" };
}

/** All anvils from the factory, newest first. Empty until the factory exists. */
export async function listAnvils(c: PublicClient, max = 60): Promise<AnvilInfo[]> {
  const n = await c.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "count" });
  const start = n > BigInt(max) ? n - BigInt(max) : BigInt(0);
  const addrs = await c.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "list", args: [start, BigInt(max)] });
  const out = await Promise.all(addrs.map((a) => readAnvil(c, a).catch(() => null)));
  return out.filter((x): x is AnvilInfo => !!x).reverse();
}

/** The factory exists at its fixed address with exactly the expected code. */
export async function factoryLive(c: PublicClient) {
  const code = (await c.getCode({ address: ANVIL_FACTORY })) ?? "0x";
  return code.length > 2 && keccak256(code) === ANVIL_FACTORY_RUNTIME_HASH;
}
/** The standard CREATE2 deployer is on this chain with its known code (checked before the one-time setup). */
export async function deployerReady(c: PublicClient) {
  const code = (await c.getCode({ address: CREATE2_DEPLOYER })) ?? "0x";
  return code.length > 2 && keccak256(code) === CREATE2_DEPLOYER_CODE_HASH;
}

/** An NFT's image from its tokenURI (https, ipfs or inline JSON). null when there is none we're willing to show. */
export async function nftImage(c: PublicClient, nft: `0x${string}`, id: bigint): Promise<string | null> {
  const ipfs = (u: string) => (u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7).replace(/^ipfs\//, "")}` : u);
  try {
    const uri = ipfs(await c.readContract({ address: nft, abi: ERC721_ABI, functionName: "tokenURI", args: [id] }));
    let meta: { image?: unknown };
    if (uri.startsWith("data:application/json;base64,")) meta = JSON.parse(atob(uri.slice(29)));
    else if (uri.startsWith("data:application/json,")) meta = JSON.parse(decodeURIComponent(uri.slice(22)));
    else if (/^https:\/\//.test(uri)) meta = await (await fetch(uri, { signal: AbortSignal.timeout(8000) })).json();
    else return null;
    const img = typeof meta.image === "string" ? ipfs(meta.image) : "";
    return /^https:\/\//.test(img) || /^data:image\/(png|jpeg|gif|webp|svg\+xml);/.test(img) ? img : null;
  } catch { return null; }
}

/** The ids a wallet holds, if the collection can list them (ERC721Enumerable). Up to `max`. */
export async function ownedIds(c: PublicClient, nft: `0x${string}`, owner: `0x${string}`, max = 60): Promise<bigint[] | null> {
  try {
    const n = await c.readContract({ address: nft, abi: ERC721_ABI, functionName: "balanceOf", args: [owner] });
    const k = Number(n > BigInt(max) ? BigInt(max) : n);
    return await Promise.all(Array.from({ length: k }, (_, i) => c.readContract({ address: nft, abi: ERC721_ABI, functionName: "tokenOfOwnerByIndex", args: [owner, BigInt(i)] })));
  } catch { return null; }
}

/** "12, 15, 20-22" → [12n, 15n, 20n, 21n, 22n]. null when it doesn't parse or is too long. */
export function parseIds(s: string): bigint[] | null {
  const out: bigint[] = [];
  for (const part of s.split(/[\s,]+/).filter(Boolean)) {
    const m = part.match(/^(\d{1,30})(?:-(\d{1,30}))?$/);
    if (!m) return null;
    const a = BigInt(m[1]), b = m[2] ? BigInt(m[2]) : a;
    if (b < a || b - a > BigInt(MAX_BATCH)) return null;
    for (let x = a; x <= b; x++) out.push(x);
  }
  const uniq = [...new Set(out.map(String))].map(BigInt);
  return uniq.length && uniq.length <= MAX_BATCH ? uniq : null;
}
