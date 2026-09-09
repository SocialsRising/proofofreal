/** Uniswap V3 1% pool fee — the highest tier available without a V4 hook. Every trade pays this. */
export const POOL_FEE_PCT = 1;
/** Launchpad share of every trading fee (LaunchFactory.protocolBps = 3000). */
export const PROTOCOL_SHARE = 30;
export const CREATOR_ECONOMY_SHARE = 100 - PROTOCOL_SHARE;

export type SplitKey = "equal" | "community" | "diamond";
export const SPLITS: { key: SplitKey; label: string; creator: number; stakers: number; creatorShareBps: number; blurb: string }[] = [
  { key: "equal", label: "Equal", creator: 50, stakers: 50, creatorShareBps: 5000, blurb: "Half to you, half to the people who hold." },
  { key: "community", label: "Community", creator: 20, stakers: 80, creatorShareBps: 2000, blurb: "Most of it goes back to holders." },
  { key: "diamond", label: "Diamond Handers", creator: 0, stakers: 100, creatorShareBps: 0, blurb: "Every cent to holders. You earn by holding too." },
];
export const splitFromBps = (bps: number) => SPLITS.find((s) => s.creatorShareBps === bps) ?? SPLITS[0];

export const LOCK_PCTS = [2, 5, 10] as const;
export const LOCK_DAYS = [90, 180, 365] as const;
export const DEV_BUYS = [0, 0.05, 0.1, 0.25, 0.5] as const;

/** Soft-staking tiers: hold at least this many tokens (of 1B) at the Sunday snapshot to qualify. */
export const HOLD_TIERS = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];
/** Consecutive-week streak boost, capped. */
export const STREAK_BOOST = (weeks: number) => Math.min(3, 1 + Math.max(0, weeks - 1) * 0.2);

/** Percent-of-trade view of the fee for a given split. */
export function feeSummary(split: SplitKey) {
  const sp = SPLITS.find((s) => s.key === split)!;
  const total = POOL_FEE_PCT;
  const platformPct = +(total * PROTOCOL_SHARE / 100).toFixed(3);
  const economy = total - platformPct;
  const creatorPct = +(economy * sp.creator / 100).toFixed(3);
  const stakerPct = +(economy - creatorPct).toFixed(3);
  return { total, platformPct, creatorPct, stakerPct, split: sp };
}
