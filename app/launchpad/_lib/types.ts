export type SplitKey = "equal" | "community" | "diamond" | "keep";

export type LaunchToken = {
  address: string;            // lowercase 0x
  chainId: number;
  name: string;
  symbol: string;
  image?: string | null;
  description?: string | null;
  creator: string;            // wallet
  /** v3 rows: fee-split preset. v4 rows: how the founder splits their own fee (equal 50/50, community 20/80, keep 100/0). */
  split: SplitKey;
  pool?: string | null;
  tokenId?: string | null;    // LP position id in the fee locker
  lockPct: number;            // 0 if none
  lockDays: number;
  devBuyEth: number;
  /** `business` is the AI agent business link. `web`/`game` remain only so older registry rows still type-check. */
  socials: { x?: string; chat?: string; business?: string; web?: string; game?: string };
  gameName?: string | null;   // legacy column, unused in the UI
  txHash?: string | null;
  referrer?: string | null;   // ?ref= that brought the creator here
  createdAt: string;
  // --- V4 launches (LaunchFactoryV4) ---
  version?: "v3" | "v4";
  poolId?: string | null;         // bytes32 pool id
  creatorFeePips?: number;        // founder's fee in V4 units (10_000 = 1%)
  creatorShareBps?: number;       // founder's share of their own fee (10000 / 5000 / 2000)
  hook?: string | null;
};

export type Submission = { type: "incubate"; pkg: string; project: string; contact: string; note: string; wallet?: string };
