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
    name: "Your Community Initiatives", short: "your community initiatives",
    desc: "Buys back your token to reward your community for product launches, feedback, content, referrals and more.",
  },
  {
    key: "supporters", bps: 2000, wallet: "0x795f869363271f516465a5986e593a5da5aa630b",
    name: "$EARLY & Early Birds Marketing Incentives", short: "$EARLY & Early Birds marketing incentives",
    desc: "Buys back your token for active {EARLY} and {BIRDS} holders only: the ones who buy your token, create content and refer others. Passive holders get nothing.",
  },
  {
    key: "builder", bps: 2000, wallet: "0xcde4df4245c295d505f2d25034da3a3395e7ae9b",
    name: "Your Builder Fund (KNTQ + MONTRA)", short: "your Builder Fund (KNTQ + MONTRA)",
    desc: "Buys KNTQ and MONTRA (10% each), held for your team and unlocked as you hit market-cap and builder milestones.",
  },
];

/** What a project gets for launching through EARLY: the landing page grid and the launch page's "You get" list. */
export const PERKS: { title: string; text: string }[] = [
  { title: "Community cultivation from day one", text: "We help you gather and organize your first holders: channels set up, welcome pinned, questions answered." },
  { title: "Marketing from Socials Rising creators", text: "Creators in the Socials Rising network make content, memes, art and threads about your project." },
  { title: "Social media amplification", text: "Your launch and milestones get pushed across the EARLY and Socials Rising accounts and communities." },
  { title: "Partnerships across the ecosystem", text: "Intros to projects, communities and partners across Elysium and Montra." },
  { title: "Airdrop rewards for active holders", text: "Daily buybacks reward the people who buy, create and refer, not passive wallets." },
  { title: "Your Builder Fund", text: "KNTQ and MONTRA accumulate for your team and unlock as you hit milestones." },
];

/** Incubator results: success stories shown on the landing page. EDIT WEEKLY — newest first.
    `token` pulls live market cap / 24h / holders from Montra. Only put real numbers, partners and quotes here. */
export type Result = {
  token?: `0x${string}`;
  name: string;
  ticker?: string;
  headline: string;
  points?: string[];
  quote?: { text: string; by: string; href?: string };
  links?: { label: string; href: string }[];
  date: string;
};
export const RESULTS: Result[] = [
  {
    token: "0x2a67aee95a8e28307d720685cf3e8b0ab10284a5",
    name: "EARLY AI", ticker: "EARLY",
    headline: "The first project through the incubator",
    points: [
      "Launched on Montra · Elysium on 9 Nov 2026",
      "Its 3% trading fee is committed to $EARLY buybacks",
      "Early Birds NFT collection live alongside the token",
    ],
    links: [{ label: "Trade $EARLY", href: "https://montramarkets.xyz/token/0x2a67aee95a8e28307d720685cf3e8b0ab10284a5" }, { label: "Early Birds", href: "https://opensea.io/collection/early-birdss" }],
    date: "Nov 2026",
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
export const HIDDEN_TOKENS: `0x${string}`[] = [
  "0xe56419c4b1558609297b7d9c7006ecbfeb7118d7", // $HERMES — test launch, 16 Nov
  "0x6e1a6f8c355d094847e75d50bfd27d949b96de4c", // $ZOO — test launch, 16 Nov
];
export const splitText = () => SLOTS.map((s) => `${s.bps / 100}% ${s.short}`).join(" · ");

/** How buybacks happen — shown everywhere fees are explained. */
export const BUYBACKS = "Buybacks run automatically every day, executed by the EARLY AI agent swarm.";

export const LINKS = {
  x: "https://x.com/socialsrising",
  discord: "https://discord.gg/krVPuyksQy",
  article: "https://x.com/tradesgiving/status/2119840504795812285", // the team / why we launched EARLY
  telegram: "https://t.me/+Wzr9-0gNQtM2YTEx",
  earlyToken: "https://montramarkets.xyz/token/0x2a67aee95a8e28307d720685cf3e8b0ab10284a5",
  earlyBirds: "https://opensea.io/collection/early-birdss",
  helpTelegram: "https://t.me/Tradesgiving",
  helpX: "https://x.com/Tradesgiving",
  apply: "https://x.com/socialsrising", // where creators ask for Socials Rising marketing support
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
