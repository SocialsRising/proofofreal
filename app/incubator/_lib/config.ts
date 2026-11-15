/* =====================================================================================================
   EARLY Incubator — settings. Everything a non-developer may need to change lives here.
   ===================================================================================================== */

export const SITE = "https://proofofreal.app";
export const BRAND = "EARLY Incubator";
export const PARENT = "Socials Rising";

/** Wallet that receives EARLY's 10% slot of every incubated token's creator fees. Set NEXT_PUBLIC_EARLY_TREASURY in Vercel to change it. */
export const TREASURY = ((process.env.NEXT_PUBLIC_EARLY_TREASURY ?? "0xa823786b8417AD2d8D7318ac6f8a199017Ff70F5").toLowerCase()) as `0x${string}`;

/** Montra Builders code: credits every launch through EARLY to the "early" builder account (25% of Montra's protocol fee for 90 days). */
export const MONTRA_BUILDER_CODE = (process.env.NEXT_PUBLIC_MONTRA_BUILDER_CODE || "early").trim().toLowerCase();

/** The incubator split of the creator side of every trade fee, in basis points of that side (must total 10,000). */
export const SPLIT = { creator: 8000, treasury: 1000, community: 1000 } as const;

/** Wallet that receives the 10% community slot: funds bounties, contests and holder rewards for incubated projects
    (later rotatable to a Genesis NFT rewards contract for NEW launches). Set NEXT_PUBLIC_EARLY_COMMUNITY in Vercel to change it. */
export const COMMUNITY = ((process.env.NEXT_PUBLIC_EARLY_COMMUNITY ?? "0x61fE6cb66E0C8fd081A037242A375e5F5782083F").toLowerCase()) as `0x${string}`;

export const LINKS = {
  x: "https://x.com/mememaxxers",
  discord: "https://discord.gg/krVPuyksQy",
  telegram: "",
  apply: "https://x.com/mememaxxers", // where creators ask for Socials Rising marketing support
};

export const ELYSIUM = {
  chainId: 99901,
  name: "Elysium",
  gas: "HYPE",
  explorer: "https://elysium.kinetiq.xyz",
  bridgeHelp: "https://montramarkets.xyz/docs/elysium",
} as const;

export type LaunchpadKey = "montra" | "volta";
export type Launchpad = {
  key: LaunchpadKey; name: string; live: boolean; when?: string; url: string; docs: string;
  pitch: string; split: string; tokenUrl: (t: string) => string;
};

/** Launchpads the incubator sits on top of. Each new one is a small adapter in _lib/<key>.ts. */
export const LAUNCHPADS: Launchpad[] = [
  {
    key: "montra", name: "Montra", live: true, url: "https://montramarkets.xyz", docs: "https://montramarkets.xyz/docs",
    pitch: "Uniswap v4 pool from the first block, liquidity locked forever, no bonding curve.",
    split: "Native 3-way split: you 80% · EARLY 10% · community rewards 10%.",
    tokenUrl: (t) => `https://montramarkets.xyz/token/${t.toLowerCase()}`,
  },
  {
    key: "volta", name: "Volta", live: false, when: "Tuesday", url: "https://www.volta.family", docs: "https://www.volta.family/docs",
    pitch: "Official Uniswap v4 on Elysium. Creator, buyback-and-burn and holder rewards split.",
    split: "Creator / buyback / holders split, set at launch.",
    tokenUrl: (t) => `https://www.volta.family/token/${t}`,
  },
];

export const explorerAddr = (a: string) => `${ELYSIUM.explorer}/address/${a}`;
export const explorerTx = (h: string) => `${ELYSIUM.explorer}/tx/${h}`;
