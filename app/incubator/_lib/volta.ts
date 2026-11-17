/* Volta adapter: Volta's public token index (CORS-open) + its one-transaction launch on Elysium.
   Docs: https://www.volta.family/docs · ABIs: https://www.volta.family/abi/volta.json
   Volta pays a token's creator-side fees to whoever holds its creator NFT, so a launch through EARLY sends the NFT to
   VOLTA_CREATOR (the 60% Community Initiatives wallet) with 100% of the creator side; EARLY splits it 60/20/20 itself. */
import { HIDDEN_TOKENS, VOLTA_CREATOR, launchpad } from "./config";
import { ZERO, isAddr, safeUrl, type DirToken } from "./montra";

export const VOLTA_INDEXER = "https://volta-indexer-production.up.railway.app";
export const VOLTA_PM = "0x3ab88ddc3cf2a012af88b60828edb4553697e5dc" as const; // PositionManager: launches + fee routing
export const VOLTA_CREATOR_NFT = "0xac466ee5cedd012eb750dbda0b935f8b997402c7" as const;
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

/** One token as Volta's index describes it. Prices and market cap are in the quote asset (HYPE for our launches). */
export type VoltaToken = {
  token: string; poolId: string; tokenId: string; creator: string; treasury: string; name: string; symbol: string; tokenUri: string;
  quote: string; quoteDecimals: number; swapFee: number; split: { creator: number; buyback: number; holders: number };
  antiSnipe: { startFee: number; duration: number }; opensAt: number; premineAmount: string; createdAt: number; blockNumber: string; txHash: string;
  price: number; launchPrice: number; ath: number; price24hAgo: number; supply: string; burned: string; holders: number; marketCap: number;
  volume24h: number; volume1h: number; trades24h: number; fees: { creator: string; buyback: string; holders: string; protocol: string };
};
/** A token's metadata document (name, image, links), as Volta's site reads it. */
export type VoltaMeta = { name?: string; symbol?: string; description?: string; image?: string; website?: string; twitter?: string; telegram?: string; discord?: string };

/** ipfs://… → a public HTTPS gateway URL (https links pass through the usual safety check). */
export const ipfsToHttp = (u?: string | null) => (u?.startsWith("ipfs://") ? `${IPFS_GATEWAY}${u.slice(7).replace(/^ipfs\//, "")}` : safeUrl(u));

export const volta = {
  /** One token from Volta's index, or null if Volta doesn't know it. */
  token: async (t: string): Promise<VoltaToken | null> => {
    if (!isAddr(t)) return null;
    const r = await fetch(`${VOLTA_INDEXER}/tokens/${t.toLowerCase()}`, { headers: { accept: "application/json" }, cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Volta index ${r.status}`);
    return r.json();
  },
  /** The token's metadata document (best effort: null if it can't be read in time). */
  meta: async (tokenUri: string): Promise<VoltaMeta | null> => {
    const url = ipfsToHttp(tokenUri);
    if (!url) return null;
    try { const r = await fetch(url, { signal: AbortSignal.timeout(8000) }); return r.ok ? ((await r.json()) as VoltaMeta) : null; } catch { return null; }
  },
};

/** Launched through EARLY on Volta: creator NFT to our wallet with 100% of the creator side, paid in HYPE, one of our fee tiers. */
export function isVoltaIncubated(t: Pick<VoltaToken, "token" | "creator" | "split" | "quote" | "swapFee">) {
  if (HIDDEN_TOKENS.includes(t.token.toLowerCase() as `0x${string}`)) return false;
  return t.creator.toLowerCase() === VOLTA_CREATOR && t.split.creator === 10000 && t.split.buyback === 0 && t.split.holders === 0
    && t.quote.toLowerCase() === ZERO && launchpad("volta").fees.some((pct) => pct * 100 === t.swapFee);
}

/** Volta part of the directory (runs on the server: Volta's full index is ~4 MB). hypeUsd converts HYPE figures to USD. */
export async function loadVoltaDirectory(hypeUsd: number | null): Promise<DirToken[]> {
  const r = await fetch(`${VOLTA_INDEXER}/tokens`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Volta index ${r.status}`);
  const all = ((await r.json()) as { tokens?: VoltaToken[] }).tokens ?? [];
  const mine = all.filter(isVoltaIncubated);
  const metas = await Promise.all(mine.map((t) => volta.meta(t.tokenUri)));
  return mine.map((t, i) => ({
    launchpad: "volta" as const, address: t.token, name: t.name, symbol: t.symbol, imageUrl: ipfsToHttp(metas[i]?.image),
    marketCapUsd: hypeUsd != null ? t.marketCap * hypeUsd : null, volume24hUsd: hypeUsd != null ? t.volume24h * hypeUsd : null,
    change24hPct: t.price24hAgo ? ((t.price - t.price24hAgo) / t.price24hAgo) * 100 : null,
    holders: t.holders, launchedAt: t.createdAt * 1000, trend: null,
  }));
}

/** The pieces of Volta's PositionManager (and its price contract) the launch uses, exactly as Volta publishes them. */
export const VOLTA_ABI = [
  { type: "function", name: "MAX_ANTI_SNIPE_DURATION", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint32" }] },
  { type: "function", name: "MAX_ANTI_SNIPE_FEE", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint24" }] },
  { type: "function", name: "MAX_SWAP_FEE", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint24" }] },
  { type: "function", name: "MIN_SWAP_FEE", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint24" }] },
  { type: "function", name: "getFlaunchingFee", stateMutability: "view", inputs: [{ name: "_initialPriceParams", type: "bytes" }], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function", name: "flaunch", stateMutability: "payable",
    inputs: [{
      name: "_params", type: "tuple", components: [
        { name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "tokenUri", type: "string" },
        { name: "premineAmount", type: "uint256" }, { name: "creator", type: "address" }, { name: "swapFee", type: "uint24" },
        { name: "creatorSplit", type: "tuple", components: [{ name: "creator", type: "uint24" }, { name: "buyback", type: "uint24" }, { name: "holders", type: "uint24" }] },
        { name: "antiSnipe", type: "tuple", components: [{ name: "startFee", type: "uint24" }, { name: "duration", type: "uint32" }] },
        { name: "flaunchAt", type: "uint256" }, { name: "initialPriceParams", type: "bytes" }, { name: "pairedToken", type: "address" },
      ],
    }],
    outputs: [{ name: "memecoin_", type: "address" }],
  },
  {
    type: "event", name: "PoolCreated", anonymous: false,
    inputs: [
      { name: "_poolId", type: "bytes32", indexed: true }, { name: "_memecoin", type: "address", indexed: false },
      { name: "_memecoinTreasury", type: "address", indexed: false }, { name: "_tokenId", type: "uint256", indexed: false },
      { name: "_currencyFlipped", type: "bool", indexed: false }, { name: "_flaunchFee", type: "uint256", indexed: false },
      {
        name: "_params", type: "tuple", indexed: false, components: [
          { name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "tokenUri", type: "string" },
          { name: "premineAmount", type: "uint256" }, { name: "creator", type: "address" }, { name: "swapFee", type: "uint24" },
          { name: "creatorSplit", type: "tuple", components: [{ name: "creator", type: "uint24" }, { name: "buyback", type: "uint24" }, { name: "holders", type: "uint24" }] },
          { name: "antiSnipe", type: "tuple", components: [{ name: "startFee", type: "uint24" }, { name: "duration", type: "uint32" }] },
          { name: "flaunchAt", type: "uint256" }, { name: "initialPriceParams", type: "bytes" }, { name: "pairedToken", type: "address" },
        ],
      },
    ],
  },
] as const;
