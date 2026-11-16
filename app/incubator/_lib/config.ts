/* =====================================================================================================
   EARLY Incubator — settings. Everything a non-developer may need to change lives here.
   ===================================================================================================== */

export const SITE = "https://proofofreal.app";
export const BRAND = "EARLY Incubator";
export const PARENT = "Socials Rising";

/** Montra Builders code: credits every launch through EARLY to the "early" builder account (25% of Montra's protocol fee for 90 days). */
export const MONTRA_BUILDER_CODE = (process.env.NEXT_PUBLIC_MONTRA_BUILDER_CODE || "early").trim().toLowerCase();

/** Where the creator side of every incubated token's trade fee goes. Basis points, must total 10,000, max 4 slots (Montra's limit).
    Fixed forever per token at launch — editing this only changes NEW launches. Buybacks are done by hand at first. */
export type Slot = { key: string; bps: number; wallet: `0x${string}`; name: string; short: string; desc: string };
export const SLOTS: Slot[] = [
  {
    key: "community", bps: 6000, wallet: "0x65d9d73d1ebcf503a7341a161f2dce660cb5952a",
    name: "Community buyback", short: "community buyback",
    desc: "Buys back the token to fund that project's future community initiatives.",
  },
  {
    key: "supporters", bps: 2000, wallet: "0x795f869363271f516465a5986e593a5da5aa630b",
    name: "$EARLY & Early Birds buyback", short: "$EARLY & Early Birds",
    desc: "Buys back the token for active $EARLY and Early Birds NFT holders who support it — buying, sharing and bringing people in.",
  },
  {
    key: "builder", bps: 2000, wallet: "0xcde4df4245c295d505f2d25034da3a3395e7ae9b",
    name: "Builder Fund (KNTQ + MONTRA)", short: "Builder Fund (KNTQ + MONTRA)",
    desc: "Buys KNTQ and MONTRA (10% each), held for the project's team and unlocked as it hits market-cap and builder milestones.",
  },
];

/** Wallets used before the 60/20/20 split. Kept so earlier tokens (e.g. $EARLY itself) stay in the directory and get labelled. */
export const LEGACY_WALLETS: { wallet: `0x${string}`; name: string }[] = [
  { wallet: "0xa823786b8417ad2d8d7318ac6f8a199017ff70f5", name: "EARLY treasury" },
  { wallet: "0x61fe6cb66e0c8fd081a037242a375e5f5782083f", name: "EARLY community rewards" },
];

/** Every wallet that marks a token as incubated. */
export const EARLY_WALLETS = [...SLOTS.map((s) => s.wallet), ...LEGACY_WALLETS.map((l) => l.wallet)];
/** Wallets the directory is built from: every new launch pays the first slot; $EARLY pays the old treasury. */
export const DIRECTORY_WALLETS = [SLOTS[0].wallet, LEGACY_WALLETS[0].wallet];
export const splitText = () => SLOTS.map((s) => `${s.bps / 100}% ${s.short}`).join(" · ");

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
    split: "Native 3-way split: 60% community buyback · 20% $EARLY & Early Birds · 20% Builder Fund (KNTQ + MONTRA).",
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
