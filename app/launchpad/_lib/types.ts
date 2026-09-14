export type LaunchToken = {
  address: string;            // lowercase 0x
  chainId: number;
  name: string;
  symbol: string;
  image?: string | null;
  description?: string | null;
  creator: string;            // wallet
  split: "equal" | "community" | "diamond";
  pool?: string | null;
  tokenId?: string | null;    // LP position id in FeeLocker
  lockPct: number;            // 0 if none
  lockDays: number;
  devBuyEth: number;
  /** `business` is the AI agent business link. `web`/`game` remain only so older registry rows still type-check. */
  socials: { x?: string; chat?: string; business?: string; web?: string; game?: string };
  gameName?: string | null;   // legacy column, unused in the UI
  txHash?: string | null;
  referrer?: string | null;   // ?ref= that brought the creator here
  createdAt: string;
};

export type Submission = { type: "incubate"; pkg: string; project: string; contact: string; note: string; wallet?: string };
