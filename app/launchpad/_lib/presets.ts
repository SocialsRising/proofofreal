/** Uniswap V3 1% pool fee — the highest tier available without a V4 hook. Every buy and sell pays this. */
export const POOL_FEE_PCT = 1;
/** Launchpad share of every trading fee (LaunchFactory.protocolBps = 3000). */
export const PROTOCOL_SHARE = 30;
export const CREATOR_ECONOMY_SHARE = 100 - PROTOCOL_SHARE;

export type SplitKey = "equal" | "community" | "diamond";
/** How the creator-economy 70% of the fee is split between the founder and the holder rewards pool. Holders never get less than half. */
export const SPLITS: { key: SplitKey; label: string; creator: number; stakers: number; creatorShareBps: number; blurb: string }[] = [
  { key: "equal", label: "Equal", creator: 50, stakers: 50, creatorShareBps: 5000, blurb: "Half to you, half to the people who hold." },
  { key: "community", label: "Community", creator: 20, stakers: 80, creatorShareBps: 2000, blurb: "Most of it goes back to holders." },
  { key: "diamond", label: "Diamond Handers", creator: 0, stakers: 100, creatorShareBps: 0, blurb: "Every cent to holders. You earn by holding too." },
];
export const splitFromBps = (bps: number) => SPLITS.find((s) => s.creatorShareBps === bps) ?? SPLITS[0];

export const LOCK_PCTS = [2, 5, 10] as const;
export const LOCK_DAYS = [90, 180, 365] as const;
/** Quick picks for the dev buy; any amount up to MAX_DEV_BUY_ETH can be typed. */
export const DEV_BUYS = [0, 0.1, 0.5, 1, 5, 10, 25, 50, 100] as const;
export const MAX_DEV_BUY_ETH = 100;

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
