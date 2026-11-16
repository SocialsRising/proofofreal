/* =====================================================================================================
   EARLY Incubator — settings. Everything a non-developer may need to change lives here.
   ===================================================================================================== */

export const SITE = "https://proofofreal.app";
export const BRAND = "EARLY Incubator";
export const PARENT = "Socials Rising";

/** Montra Builders code: credits every launch through EARLY to the "early" builder account (25% of Montra's protocol fee for 90 days). */
export const MONTRA_BUILDER_CODE = (process.env.NEXT_PUBLIC_MONTRA_BUILDER_CODE || "early").trim().toLowerCase();

/** Where the creator side of every incubated token's trade fee goes. Basis points, must total 10,000, max 4 slots (Montra's limit).
    Fixed forever per token at launch — editing this only changes NEW launches. */
/** desc may contain {EARLY} and {BIRDS}: they render as links to buy $EARLY and the Early Birds collection. */
export type Slot = { key: string; bps: number; wallet: `0x${string}`; name: string; short: string; desc: string };
export const SLOTS: Slot[] = [
  {
    key: "community", bps: 6000, wallet: "0x65d9d73d1ebcf503a7341a161f2dce660cb5952a",
    name: "Community buyback", short: "community buyback",
    desc: "Buys back the token to fund the project's future community initiatives.",
  },
  {
    key: "supporters", bps: 2000, wallet: "0x795f869363271f516465a5986e593a5da5aa630b",
    name: "$EARLY & Early Birds buyback", short: "$EARLY & Early Birds",
    desc: "Buys back the token for active {EARLY} holders and {BIRDS} NFT holders who support it by buying, sharing and bringing people in.",
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
/** Tokens listed as incubated although they predate the split (they don't match SLOTS exactly). */
export const LEGACY_TOKENS: `0x${string}`[] = [
  "0x2a67aee95a8e28307d720685cf3e8b0ab10284a5", // $EARLY
];
/** Tokens never shown as incubated, even with a matching split: test launches, spam, scams. Lowercase. */
export const HIDDEN_TOKENS: `0x${string}`[] = [];
export const splitText = () => SLOTS.map((s) => `${s.bps / 100}% ${s.short}`).join(" · ");

/** How buybacks happen — shown everywhere fees are explained. */
export const BUYBACKS = "Buybacks run automatically every day, executed by the EARLY AI agent swarm.";

export const LINKS = {
  x: "https://x.com/mememaxxers",
  discord: "https://discord.gg/krVPuyksQy",
  telegram: "https://t.me/+Wzr9-0gNQtM2YTEx",
  earlyToken: "https://montramarkets.xyz/token/0x2a67aee95a8e28307d720685cf3e8b0ab10284a5",
  earlyBirds: "https://opensea.io/collection/early-birdss",
  helpTelegram: "https://t.me/Tradesgiving",
  helpX: "https://x.com/Tradesgiving",
  apply: "https://x.com/mememaxxers", // where creators ask for Socials Rising marketing support
};

/** Trading fee options on the launch page (total fee per trade, in pips of 1,000,000). */
export const FEE_TIERS = [
  { pips: 30000, label: "3%", name: "Growth", desc: "Lower fees for more trading, liquidity and community growth." },
  { pips: 50000, label: "5%", name: "Balanced", desc: "The sweet spot between trading activity and buybacks, right for most projects.", recommended: true },
  { pips: 100000, label: "10%", name: "Max Reinvestment", desc: "The most buybacks and rewards, for highly committed communities." },
] as const;
export const DEFAULT_FEE = 50000;

export const ELYSIUM = {
  chainId: 99901,
  name: "Elysium",
  gas: "HYPE",
  explorer: "https://elysium.kinetiq.xyz",
  bridgeHelp: "https://montramarkets.xyz/docs/elysium",
} as const;

export type Launchpad = {
  key: "montra"; name: string; chain: string; url: string; docs: string; pitch: string;
  bonus?: { title: string; text: string; href: string; extra?: { text: string; until: string } };
  tokenUrl: (t: string) => string;
};

/** Launchpads you can launch on through EARLY. Each one is a small adapter in _lib/<key>.ts. */
export const LAUNCHPADS: Launchpad[] = [
  {
    key: "montra", name: "Montra", chain: "Elysium", url: "https://montramarkets.xyz", docs: "https://montramarkets.xyz/docs",
    pitch: "Uniswap v4 pool from the first block, liquidity locked forever, no bonding curve.",
    bonus: {
      title: "Montra Season 2 airdrop is live",
      text: "Launching and trading earn points toward the 25% MONTRA airdrop, and tokens that hold market-cap levels earn their creator more.",
      href: "https://montramarkets.xyz/airdrop",
      extra: { text: "Trades count double until 17 Nov.", until: "2026-11-17T00:00:00Z" },
    },
    tokenUrl: (t) => `https://montramarkets.xyz/token/${t.toLowerCase()}`,
  },
];

export const explorerAddr = (a: string) => `${ELYSIUM.explorer}/address/${a}`;
export const explorerTx = (h: string) => `${ELYSIUM.explorer}/tx/${h}`;
