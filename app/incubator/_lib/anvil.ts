/* JPEG Anvil helpers: read an anvil and its two sides, NFT images, and the factory checks. Contracts: contracts/JpegAnvil.sol. */
import { erc20Abi, keccak256, type PublicClient } from "viem";
import { ANVIL_ABI, ANVIL_FACTORY, ANVIL_FACTORY_ABI, ANVIL_FACTORY_RUNTIME_HASH, CREATE2_DEPLOYER, CREATE2_DEPLOYER_CODE_HASH } from "./anvilArtifacts";

export const ERC721_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "tokenOfOwnerByIndex", stateMutability: "view", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "supportsInterface", stateMutability: "view", inputs: [{ type: "bytes4" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "isApprovedForAll", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "setApprovalForAll", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bool" }], outputs: [] },
] as const;

/** Rate presets: tokens per NFT. 100K first. */
export const RATE_PRESETS = [100_000, 1_000_000, 10_000_000];
export const MAX_BATCH = 50;

export const openseaCollection = (nft: string) => `https://opensea.io/assets/elysium/${nft.toLowerCase()}`;
export const openseaItem = (nft: string, id: bigint) => `https://opensea.io/item/elysium/${nft.toLowerCase()}/${id}`;

export type AnvilInfo = {
  address: `0x${string}`; token: `0x${string}`; nft: `0x${string}`; rate: bigint; creator: `0x${string}`;
  held: bigint; reserve: bigint; symbol: string; decimals: number; nftName: string;
  /** The first NFT the anvil holds, for a cover image. */
  cover: bigint | null;
};

const str = (v: unknown, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");

/** Every anvil the factory has made (lowercase), cached per page load. Anything else is refused. */
let known: Promise<Set<string>> | null = null;
function factoryAnvils(c: PublicClient) {
  known ??= (async () => {
    const n = await c.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "count" });
    const all = await c.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "list", args: [BigInt(0), n] });
    return new Set(all.map((x) => x.toLowerCase()));
  })().catch((e) => { known = null; throw e; });
  return known;
}

/** Everything the page shows about one anvil. Only anvils made by our factory are accepted. */
export async function readAnvil(c: PublicClient, address: `0x${string}`, checked = false): Promise<AnvilInfo> {
  if (!checked && !(await factoryAnvils(c)).has(address.toLowerCase())) throw new Error("not a JPEG Anvil");
  const at = { address, abi: ANVIL_ABI } as const;
  const [token, nft, rate, creator, held, reserve] = await Promise.all([
    c.readContract({ ...at, functionName: "token" }), c.readContract({ ...at, functionName: "nft" }), c.readContract({ ...at, functionName: "rate" }),
    c.readContract({ ...at, functionName: "creator" }), c.readContract({ ...at, functionName: "heldCount" }), c.readContract({ ...at, functionName: "reserve" }),
  ]);
  const [symbol, decimals, nftName, first] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    c.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    c.readContract({ address: nft, abi: ERC721_ABI, functionName: "name" }).catch(() => "NFT collection"),
    held > BigInt(0) ? c.readContract({ ...at, functionName: "heldIds", args: [BigInt(0), BigInt(1)] }).catch(() => []) : Promise.resolve([] as readonly bigint[]),
  ]);
  return { address, token, nft, rate, creator, held, reserve, cover: first[0] ?? null, symbol: str(symbol, 16) || "TOKEN", decimals: Number(decimals), nftName: str(nftName) || "NFT collection" };
}

/** All anvils from the factory, newest first. Empty until the factory exists. */
export async function listAnvils(c: PublicClient, max = 60): Promise<AnvilInfo[]> {
  const n = await c.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "count" });
  const start = n > BigInt(max) ? n - BigInt(max) : BigInt(0);
  const addrs = await c.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "list", args: [start, BigInt(max)] });
  const out = await Promise.all(addrs.map((a) => readAnvil(c, a, true).catch(() => null)));
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

/** An NFT's name and image, through our cached route (IPFS images are served from our own domain). */
const metaCache = new Map<string, Promise<{ name: string | null; image: string | null }>>();
export function nftMeta(nft: string, id: bigint) {
  const k = `${nft.toLowerCase()}:${id}`;
  if (!metaCache.has(k)) metaCache.set(k, fetch(`/api/incubator/anvil/meta?nft=${nft.toLowerCase()}&id=${id}`).then((r) => r.json()).catch(() => ({ name: null, image: null })));
  return metaCache.get(k)!;
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

/** Lore lines for the celebration pop-up. */
export const LORE = {
  forge: ["The anvil rings. A legend steps out of the fire.", "Hammer down, sparks up. It's yours now.", "Forged in fire, kept forever.", "The smiths nod. Fine work."],
  melt: ["Back into the flow. The metal remembers.", "The fire takes the art and pays in coin.", "Melted down, liquid again.", "Smelted clean. Spend it well."],
  stock: ["The forge burns hotter.", "More metal for the anvil.", "The smiths thank you.", "Fuel for the fire."],
};
