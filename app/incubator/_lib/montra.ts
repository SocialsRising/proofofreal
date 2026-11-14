/* Montra adapter: read-only public API (no key, CORS-open for GETs) + the factory's one-transaction launch.
   Docs: https://montramarkets.xyz/docs/build · API: https://montramarkets.xyz/docs/api */
import { stringToHex, toHex } from "viem";
import { COMMUNITY, MONTRA_BUILDER_CODE, SPLIT, TREASURY } from "./config";

export const MONTRA_API = "https://api.montramarkets.xyz";
export const MONTRA_FACTORY = "0x38d3ef3a06d18fa3286fb5deafe611be725fcd15" as const;
export const MONTRA_REGISTRY = "0xf1e2fa75422f889e565f3142bdbf60b28dce2aa7" as const;
export const ZERO = "0x0000000000000000000000000000000000000000" as const;

export type Quote = { address: string; symbol: string; decimals: number; native: boolean; usd: number | null };
export type TokenCard = {
  address: string; name: string; symbol: string; imageUrl: string | null; creator: string; poolId: string; quote: Quote;
  supply: string; burned: string; price: string; priceUsd: number | null; marketCap: string; marketCapUsd: number | null;
  volume24h: string; volume24hUsd: number | null; change24hPct: number | null; holders: number; swaps: number;
  launchedAt: number; lastTradeAt: number | null; totalFeePips: number; recipient: string | null;
  recipientKind: "holders" | "creator" | "splitter" | "wallet"; rewardsReceived: string; trend: number | null;
  graduation: { stage: string; progressBps: number; graduatedAt: number | null };
};
export type TokenDetail = TokenCard & {
  description?: string; metadataUri?: string; launchTx?: string;
  metadata?: { website?: string; twitter?: string; telegram?: string; discord?: string; description?: string } | null;
  stats?: { swaps: number; buys: number; sells: number; volume: string; hookFees: string; protocolFees: string; creatorFees: string; creatorClaimed: string; burnedTokens: string } | null;
  rewards?: { received: string; distributions: number } | null;
  splitter?: { address: string; recipients: string[]; shares: number[] } | null;
  pool?: { hook: string; feeLocked: boolean; earlyBuyFeeStartPips: number; earlyBuyFeeWindow: number } | null;
  live?: { creatorClaimable: string; totalFee: number; creatorFee: number; protocolFee: number; lpFee: number } | null;
};
export type Holders = { holders: { address: string; pct: number; isCreator: boolean }[]; count: number; top10Pct: number; creatorPct: number };
export type LaunchRow = { id: number; quote: string; totalFeePips: number; earlyBuyFeeStartPips: number; earlyBuyFeeWindow: number; enabled: boolean; openingUsd?: number | null };

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${MONTRA_API}${path}`, { ...init, headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`Montra API ${r.status} on ${path}`);
  return r.json() as Promise<T>;
}

export const montra = {
  /** Every token whose creator fees reach the EARLY treasury, directly or through a split = the incubator's directory. */
  incubated: () => get<{ tokens: TokenCard[] }>(`/api/wallets/${TREASURY}/lanes`).then((r) => r.tokens ?? []),
  trending: (limit = 8) => get<{ tokens: TokenCard[] }>(`/api/tokens?sort=trending&limit=${limit}`).then((r) => r.tokens ?? []),
  token: (t: string) => get<TokenDetail>(`/api/tokens/${t.toLowerCase()}`),
  holders: (t: string, limit = 10) => get<Holders>(`/api/tokens/${t.toLowerCase()}/holders?limit=${limit}`),
  config: () => get<{ chainId: number; launchFee: string; launchEnabled: boolean; configs: LaunchRow[] }>(`/api/config`),
};

/** True when the token's split pays the EARLY treasury. */
export const isIncubated = (d: Pick<TokenDetail, "splitter" | "recipient">) =>
  !!d.splitter?.recipients?.some((r) => r.toLowerCase() === TREASURY) || d.recipient?.toLowerCase() === TREASURY;

/** Human name for a fee recipient in a token's split. */
export const recipientLabel = (r: string, token: string, creator: string) => {
  const a = r.toLowerCase();
  return a === token.toLowerCase() ? "Token holders" : a === TREASURY ? "EARLY treasury" : a === COMMUNITY ? "EARLY community rewards" : a === creator.toLowerCase() ? "Creator" : `${a.slice(0, 6)}…${a.slice(-4)}`;
};

export const FEE_TIERS = [
  { pips: 10000, label: "1%", note: "Default. Easiest to trade." },
  { pips: 20000, label: "2%" },
  { pips: 30000, label: "3%" },
  { pips: 50000, label: "5%" },
  { pips: 100000, label: "10%", note: "Max. Most fees, least volume." },
] as const;
export const SNIPE_WINDOWS = [
  { s: 0, label: "Off" }, { s: 30, label: "30 seconds" }, { s: 60, label: "1 minute" }, { s: 300, label: "5 minutes" }, { s: 900, label: "15 minutes" }, { s: 1800, label: "30 minutes" },
] as const;

/** The factory's menu row for native-HYPE pools at this fee tier and anti-snipe window. Rows are read live, never hard-coded. */
export function pickRow(rows: LaunchRow[], feePips: number, snipeSeconds: number) {
  return rows.find((r) => r.enabled !== false && r.quote === ZERO && r.totalFeePips === feePips && (snipeSeconds ? r.earlyBuyFeeWindow === snipeSeconds && r.earlyBuyFeeStartPips > 0 : r.earlyBuyFeeWindow === 0));
}

/** ERC-8021 suffix that credits the launch to our Montra Builders code: ascii(code) ‖ len ‖ 0x00 ‖ marker. */
export function builderSuffix(code = MONTRA_BUILDER_CODE): `0x${string}` | undefined {
  if (!/^[a-z0-9][a-z0-9-]{2,31}$/.test(code)) return undefined;
  const ascii = stringToHex(code).slice(2);
  return `0x${ascii}${code.length.toString(16).padStart(2, "0")}0080218021802180218021802180218021`;
}

/** Creator 80% · EARLY treasury 10% · EARLY community rewards 10% (shares in basis points of the creator side). */
export function incubatorSplit(creatorWallet: `0x${string}`) {
  return {
    feeRecipients: [creatorWallet, TREASURY, COMMUNITY] as `0x${string}`[],
    feeShares: [SPLIT.creator, SPLIT.treasury, SPLIT.community],
  };
}

export const randomSalt = () => toHex(crypto.getRandomValues(new Uint8Array(32)));

export const LAUNCH_ABI = [
  {
    type: "function", name: "launch", stateMutability: "payable",
    inputs: [{
      name: "p", type: "tuple", components: [
        { name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "metadataURI", type: "string" },
        { name: "profile", type: "tuple", components: [
          { name: "logo", type: "string" }, { name: "description", type: "string" },
          { name: "socials", type: "tuple", components: [
            { name: "telegram", type: "string" }, { name: "twitter", type: "string" }, { name: "discord", type: "string" }, { name: "website", type: "string" }, { name: "extra", type: "string" },
          ] },
        ] },
        { name: "configId", type: "uint256" }, { name: "supply", type: "uint256" }, { name: "salt", type: "bytes32" },
        { name: "feeRecipients", type: "address[]" }, { name: "feeShares", type: "uint16[]" },
        { name: "firstBuyAmount", type: "uint256" }, { name: "firstBuyMinOut", type: "uint256" },
        { name: "permit", type: "tuple", components: [{ name: "deadline", type: "uint256" }, { name: "v", type: "uint8" }, { name: "r", type: "bytes32" }, { name: "s", type: "bytes32" }] },
      ],
    }],
    outputs: [{ name: "token", type: "address" }, { name: "poolId", type: "bytes32" }],
  },
  { type: "function", name: "launchFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "launchEnabled", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  {
    type: "event", name: "TokenLaunched", anonymous: false,
    inputs: [
      { name: "token", type: "address", indexed: true }, { name: "creator", type: "address", indexed: true }, { name: "poolId", type: "bytes32", indexed: true },
      { name: "configId", type: "uint256", indexed: false }, { name: "quote", type: "address", indexed: false }, { name: "quoteIsCurrency0", type: "bool", indexed: false },
      { name: "supply", type: "uint256", indexed: false }, { name: "startTick", type: "int24", indexed: false }, { name: "feeRecipient", type: "address", indexed: false },
      { name: "feeLocked", type: "bool", indexed: false }, { name: "firstBuyIn", type: "uint256", indexed: false }, { name: "firstBuyOut", type: "uint256", indexed: false },
    ],
  },
] as const;

/* ------------------------------------------------------------------ formatting */
export const usd = (n: number | null | undefined) => n == null ? "—" : n === 0 ? "$0" : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(n < 1 ? 4 : 2)}`;
export const pct = (n: number | null | undefined) => n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
/** Integer string in a quote's smallest unit → number of whole units. */
export const units = (s: string | null | undefined, decimals = 18) => (s ? Number(BigInt(s)) / 10 ** decimals : 0);
export const ago = (ms: number) => { const s = (Date.now() - ms) / 1000; return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`; };
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
