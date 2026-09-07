export type LaunchToken = {
  address: string;            // lowercase 0x
  chainId: number;
  name: string;
  symbol: string;
  image?: string | null;
  description?: string | null;
  creator: string;            // wallet
  creatorFee: number;         // 1–4
  split: "equal" | "community" | "diamond";
  lockPct: number;            // 0 if none
  lockDays: number;
  devBuyEth: number;
  socials: { x?: string; chat?: string; web?: string; game?: string };
  gameName?: string | null;
  txHash?: string | null;
  createdAt: string;
  /** example rows carry display-only numbers so the site looks alive before real volume exists */
  example?: { holders: number; vol24: number; mcap: number; change: number; stakedPct: number; rewardsEth: number; apr: number; tagline: string; gameKind?: string };
};

export type GameNight = {
  id: string;
  token: string;              // address or example id
  title: string;
  when: string;
  day: string; mon: string;
  status: "upcoming" | "done";
  prize: string;
  sponsor?: string | null;
  players: number;
  leaderboard: { n: string; s: string; r: string }[];
};

export type Submission =
  | { type: "game"; token: string; url: string; name: string; players: string; wallet?: string }
  | { type: "incubate"; pkg: string; project: string; contact: string; note: string; wallet?: string };
