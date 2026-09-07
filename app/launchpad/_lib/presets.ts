export const CREATOR_FEES = [1, 2, 3, 4] as const;
export const PLATFORM_FEE = 1; // percent, to the Meme Maxxers treasury

export type SplitKey = "equal" | "community" | "diamond";
export const SPLITS: { key: SplitKey; label: string; creator: number; stakers: number; blurb: string }[] = [
  { key: "equal", label: "Equal", creator: 50, stakers: 50, blurb: "Half to you, half to the people who lock." },
  { key: "community", label: "Community", creator: 20, stakers: 80, blurb: "Most of it goes back to stakers." },
  { key: "diamond", label: "Diamond Handers", creator: 0, stakers: 100, blurb: "Every cent to stakers. You earn by locking too." },
];

export const LOCK_PCTS = [2, 5, 10] as const;
export const LOCK_DAYS = [90, 180, 365] as const;
export const DEV_BUYS = [0, 0.05, 0.1, 0.25, 0.5] as const;

/** Time-weighted staking multipliers (days → weight). */
export const MULTIPLIERS: [number, number][] = [[7, 1], [14, 1.25], [30, 1.5], [60, 1.75], [90, 2], [180, 3]];

export function feeSummary(creatorFee: number, split: SplitKey) {
  const sp = SPLITS.find((s) => s.key === split)!;
  const total = creatorFee + PLATFORM_FEE;
  const creatorPct = +((creatorFee * sp.creator) / 100).toFixed(2);
  const stakerPct = +((creatorFee * sp.stakers) / 100).toFixed(2);
  return { total, creatorPct, stakerPct, platformPct: PLATFORM_FEE, split: sp };
}

/**
 * Convert the fee model into Clanker v4 reward-recipient basis points.
 * Clanker splits *all* LP fees among recipients by bps (sum = 10000), so each party's
 * share of the pool equals its share of the total fee percentage.
 */
export function rewardBps(creatorFee: number, split: SplitKey) {
  const { total, creatorPct, stakerPct } = feeSummary(creatorFee, split);
  const platform = Math.round((PLATFORM_FEE / total) * 10000);
  const creator = Math.round((creatorPct / total) * 10000);
  let stakers = Math.round((stakerPct / total) * 10000);
  stakers = 10000 - platform - creator; // absorb rounding so the sum is exact
  return { platform, creator, stakers };
}
