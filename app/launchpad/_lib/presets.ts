import type { SplitKey } from "./types";
export type { SplitKey };

// ------------------------------------------------------------------ V3 factory (legacy, fixed 1% pool fee)
/** Uniswap V3 1% pool fee — the highest tier available without a V4 hook. Every buy and sell pays this. */
export const POOL_FEE_PCT = 1;
/** Launchpad share of every trading fee (LaunchFactory.protocolBps = 3000). */
export const PROTOCOL_SHARE = 30;
export const CREATOR_ECONOMY_SHARE = 100 - PROTOCOL_SHARE;

/** V3: how the creator-economy 70% of the fee is split between the founder and the holder rewards pool. */
export const SPLITS: { key: SplitKey; label: string; creator: number; stakers: number; creatorShareBps: number; blurb: string }[] = [
  { key: "equal", label: "Equal", creator: 50, stakers: 50, creatorShareBps: 5000, blurb: "Half to you, half to the people who hold." },
  { key: "community", label: "Community", creator: 20, stakers: 80, creatorShareBps: 2000, blurb: "Most of it goes back to holders." },
  { key: "diamond", label: "Diamond Handers", creator: 0, stakers: 100, creatorShareBps: 0, blurb: "Every cent to holders. You earn by holding too." },
];
export const splitFromBps = (bps: number) => SPLITS.find((s) => s.creatorShareBps === bps) ?? SPLITS[0];

/** V3 percent-of-trade view of the fee for a given split. */
export function feeSummary(split: SplitKey) {
  const sp = SPLITS.find((s) => s.key === split) ?? SPLITS[0];
  const total = POOL_FEE_PCT;
  const platformPct = +(total * PROTOCOL_SHARE / 100).toFixed(3);
  const economy = total - platformPct;
  const creatorPct = +(economy * sp.creator / 100).toFixed(3);
  const stakerPct = +(economy - creatorPct).toFixed(3);
  return { total, platformPct, creatorPct, stakerPct, split: sp };
}

// ------------------------------------------------------------------ V4 factory (launchpad 1% + founder 0–10%)
/** Launchpad fee on every buy and sell, in V4 fee units (1e6 = 100%). LaunchFactoryV4.protocolFeePips. */
export const V4_PROTOCOL_FEE_PIPS = 10_000;
export const V4_PROTOCOL_FEE_PCT = V4_PROTOCOL_FEE_PIPS / 10_000;
export const MAX_CREATOR_FEE_PCT = 10;
export const CREATOR_FEE_STEP = 0.5;
export const DEFAULT_CREATOR_FEE_PCT = 5;
export const pctToPips = (pct: number) => Math.round(pct * 10_000);
export const pipsToPct = (pips: number) => pips / 10_000;

/** V4: how the founder routes their own fee. The community share goes to the holder rewards pool for Sunday payouts. */
export const CREATOR_SPLITS: { key: SplitKey; label: string; founder: number; community: number; creatorShareBps: number; blurb: string }[] = [
  { key: "equal", label: "50 / 50", founder: 50, community: 50, creatorShareBps: 5000, blurb: "Half to you, half to your holders every Sunday." },
  { key: "community", label: "20 / 80", founder: 20, community: 80, creatorShareBps: 2000, blurb: "Most of it goes back to the people who hold." },
  { key: "keep", label: "Keep it all", founder: 100, community: 0, creatorShareBps: 10_000, blurb: "Everything to you. You decide how to reward holders." },
];
export const creatorSplitFromBps = (bps?: number) => CREATOR_SPLITS.find((s) => s.creatorShareBps === bps) ?? CREATOR_SPLITS[0];

/** V4 percent-of-trade view: total fee and where each slice goes. */
export function feeSummaryV4(creatorFeePct: number, creatorShareBps: number) {
  const launchpad = V4_PROTOCOL_FEE_PCT;
  const founder = +(creatorFeePct * creatorShareBps / 10_000).toFixed(3);
  const community = +(creatorFeePct - founder).toFixed(3);
  const total = +(launchpad + creatorFeePct).toFixed(3);
  return { total, launchpad, founder, community, creatorFeePct };
}

export const LOCK_PCTS = [2, 5, 10] as const;
export const LOCK_DAYS = [90, 180, 365] as const;
/** Quick picks for the dev buy; any amount up to MAX_DEV_BUY_ETH can be typed. */
export const DEV_BUYS = [0, 0.1, 0.5, 1, 5, 10, 25, 50, 100] as const;
export const MAX_DEV_BUY_ETH = 100;
