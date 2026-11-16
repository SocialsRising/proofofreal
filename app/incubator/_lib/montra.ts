/* Montra adapter: read-only public API (no key, CORS-open for GETs) + the factory's one-transaction launch.
   Docs: https://montramarkets.xyz/docs/build · API: https://montramarkets.xyz/docs/api */
import { stringToHex, toHex } from "viem";
import { FEE_TIERS, HIDDEN_TOKENS, LEGACY_TOKENS, LEGACY_WALLETS, MONTRA_BUILDER_CODE, SLOTS } from "./config";

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

/** What the directory needs per project (kept small: it's served to every visitor). */
export type DirToken = Pick<TokenCard, "address" | "name" | "symbol" | "imageUrl" | "marketCapUsd" | "volume24hUsd" | "change24hPct" | "holders" | "launchedAt" | "trend">;

/** Runs fn over items with at most n requests in flight, to stay polite to Montra's API. */
async function inBatches<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const k = next++; out[k] = await fn(items[k]); }
  }));
  return out;
}

/** The directory: tokens paying the first EARLY slot whose on-chain split matches the incubator split EXACTLY
    (anyone can add an EARLY wallet to their own split, so presence alone proves nothing), plus legacy tokens.
    Runs on the server behind /api/incubator/directory, which caches the answer for every visitor. */
export async function loadDirectory(): Promise<DirToken[]> {
  const addrs = new Set<string>(LEGACY_TOKENS);
  for (let page = 1, pages = 1; page <= pages && page <= 20; page++) {
    const r = await get<{ tokens?: TokenCard[]; pages?: number }>(`/api/wallets/${SLOTS[0].wallet}/lanes?page=${page}&limit=100`);
    for (const t of r.tokens ?? []) addrs.add(t.address.toLowerCase());
    pages = Math.max(1, Number(r.pages) || 1);
  }
  const candidates = [...addrs].filter((a) => isAddr(a) && !HIDDEN_TOKENS.includes(a as `0x${string}`));
  const details = await inBatches(candidates, 6, (a) => get<TokenDetail>(`/api/tokens/${a}`).catch(() => null));
  return details.filter((d): d is TokenDetail => !!d && isIncubated(d)).map((d) => ({
    address: d.address, name: d.name, symbol: d.symbol, imageUrl: safeUrl(d.imageUrl), marketCapUsd: d.marketCapUsd,
    volume24hUsd: d.volume24hUsd, change24hPct: d.change24hPct, holders: d.holders, launchedAt: d.launchedAt, trend: d.trend,
  }));
}

export const montra = {
  /** Browser side of the directory: our cached route, not Montra directly. */
  incubated: async (): Promise<DirToken[]> => {
    const r = await fetch("/api/incubator/directory");
    if (!r.ok) throw new Error(`Directory ${r.status}`);
    return ((await r.json()) as { tokens?: DirToken[] }).tokens ?? [];
  },
  token: (t: string) => get<TokenDetail>(`/api/tokens/${t.toLowerCase()}`),
  holders: (t: string, limit = 10) => get<Holders>(`/api/tokens/${t.toLowerCase()}/holders?limit=${limit}`),
  config: () => get<{ chainId: number; launchFee: string; launchEnabled: boolean; configs: LaunchRow[]; contracts?: { factory?: string } }>(`/api/config`),
};

export const isAddr = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);
/** Incubated = launched on the incubator's exact terms (or a listed legacy token), and not taken down.
    Exact terms: the 60/20/20 split to our wallets, paid in HYPE, one of our fee tiers, fee locked. */
export const isIncubated = (d: Pick<TokenDetail, "address" | "splitter" | "quote" | "totalFeePips" | "pool">) => {
  const a = d.address.toLowerCase() as `0x${string}`;
  if (HIDDEN_TOKENS.includes(a)) return false;
  if (LEGACY_TOKENS.includes(a)) return true;
  const nativeQuote = d.quote?.native === true || d.quote?.address?.toLowerCase() === ZERO;
  return hasIncubatorSplit(d) && nativeQuote && FEE_TIERS.some((t) => t.pips === d.totalFeePips) && d.pool?.feeLocked !== false;
};
/** The token's on-chain split is exactly the incubator split: same wallets, same shares, no extras. */
export function hasIncubatorSplit(d: Pick<TokenDetail, "splitter">) {
  const s = d.splitter;
  if (!s || s.recipients.length !== SLOTS.length) return false;
  return s.recipients.every((r, i) => SLOTS.some((x) => x.wallet === r.toLowerCase() && x.bps === s.shares[i]))
    && new Set(s.recipients.map((r) => r.toLowerCase())).size === SLOTS.length;
}
/** Only https links from token metadata are ever rendered. */
export const safeUrl = (u?: string | null) => (u && /^https:\/\/[^\s"'<>]{3,300}$/i.test(u.trim()) ? u.trim() : null);

const LINK_HOSTS = { twitter: ["x.com", "twitter.com"], telegram: ["t.me", "telegram.me"], discord: ["discord.gg", "discord.com"] } as const;
export type LinkKind = "website" | keyof typeof LINK_HOSTS;
/** A creator-written link we're willing to show: https, no "x.com@other-site" disguise, and an X / Telegram / Discord
    link must actually point at that site. Anything else is dropped. Used when uploading and when rendering. */
export function safeLink(u: string | null | undefined, kind: LinkKind = "website"): string | null {
  const s = safeUrl(u);
  if (!s) return null;
  let url: URL;
  try { url = new URL(s); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (kind !== "website" && !LINK_HOSTS[kind].some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) return null;
  return url.href;
}

/** Human name for a fee recipient in a token's split. */
export const recipientLabel = (r: string, token: string, creator: string) => {
  const a = r.toLowerCase();
  const named = SLOTS.find((s) => s.wallet === a)?.name ?? LEGACY_WALLETS.find((l) => l.wallet === a)?.name;
  return a === token.toLowerCase() ? "Token holders" : named ?? (a === creator.toLowerCase() ? "Creator" : `${a.slice(0, 6)}…${a.slice(-4)}`);
};

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

/** The incubator split (config SLOTS), in basis points of the creator side. Guards against a bad edit to the config. */
export function incubatorSplit() {
  const total = SLOTS.reduce((s, x) => s + x.bps, 0);
  if (total !== 10000 || SLOTS.length < 2 || SLOTS.length > 4) throw new Error("Incubator split is misconfigured — launches are paused.");
  return { feeRecipients: SLOTS.map((s) => s.wallet), feeShares: SLOTS.map((s) => s.bps) };
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
  // One row of the factory's fee menu, exactly as Montra publishes it (docs/abis/LaunchFactory.json). Used to check the
  // API's menu against the contract before anything is signed.
  {
    type: "function", name: "getConfig", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      name: "cfg", type: "tuple", components: [
        { name: "moduleSetId", type: "uint256" }, { name: "quote", type: "address" }, { name: "baseSupply", type: "uint256" },
        { name: "tickSpacing", type: "int24" }, { name: "startTick", type: "int24" }, { name: "graduationTicks", type: "uint24" },
        { name: "lpLineTicks", type: "uint24" }, { name: "totalFeePips", type: "uint24" }, { name: "totalFeeMinPips", type: "uint24" },
        { name: "protocolFeePips", type: "uint24" }, { name: "lpFeePips", type: "uint24" }, { name: "earlyBuyFeeStartPips", type: "uint24" },
        { name: "earlyBuyFeeWindow", type: "uint32" }, { name: "liquidityPolicy", type: "address" }, { name: "liquiditySealed", type: "bool" },
        { name: "streamDuration", type: "uint32" }, { name: "pushBountyBps", type: "uint16" }, { name: "pushFloor", type: "uint128" },
        { name: "enabled", type: "bool" }, { name: "exists", type: "bool" },
      ],
    }],
  },
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
