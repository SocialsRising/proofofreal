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
    name: "Your Community Initiatives", short: "community initiatives",
    desc: "Buys back your token to reward your community for product launches, feedback, content, referrals and more.",
  },
  {
    key: "supporters", bps: 2000, wallet: "0x795f869363271f516465a5986e593a5da5aa630b",
    name: "$EARLY & Early Birds Marketing Incentives", short: "$EARLY & Early Birds marketing incentives",
    desc: "Buys back your token for active {EARLY} and {BIRDS} holders only: the ones who buy your token, create content and refer others. Passive holders get nothing.",
  },
  {
    key: "builder", bps: 2000, wallet: "0xcde4df4245c295d505f2d25034da3a3395e7ae9b",
    name: "Your Builder Fund (KNTQ + MONTRA)", short: "Builder Fund (KNTQ + MONTRA)",
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
    links: [{ label: "Trade $EARLY on Olympus", href: "/incubator/olympus?t=0x2a67aee95a8e28307d720685cf3e8b0ab10284a5" }, { label: "Early Birds", href: "/incubator/olympus?t=early-birds" }],
    date: "Nov 2026",
  },
];

/** Wallets used before the 60/20/20 split. Kept so earlier tokens (e.g. $EARLY itself) stay in the directory and get labelled. */
export const LEGACY_WALLETS: { wallet: `0x${string}`; name: string }[] = [
  { wallet: "0xa823786b8417ad2d8d7318ac6f8a199017ff70f5", name: "EARLY treasury" },
  { wallet: "0x61fe6cb66e0c8fd081a037242a375e5f5782083f", name: "EARLY community rewards" },
];

/** Tokens listed as incubated although they predate the split (they don't match SLOTS exactly). */
export const LEGACY_TOKENS: `0x${string}`[] = [
  "0x2a67aee95a8e28307d720685cf3e8b0ab10284a5", // $EARLY
];
/** Tokens never shown as incubated, even with a matching split: spam, scams. Lowercase. */
export const HIDDEN_TOKENS: `0x${string}`[] = [];
/** The split as one line, e.g. "60% community initiatives · 20% … · 20% …". */
export const splitText = () => SLOTS.map((s) => `${s.bps / 100}% ${s.short}`).join(" · ");

/** How buybacks happen — shown everywhere fees are explained. */
export const BUYBACKS = "Buybacks run automatically every day, executed by the EARLY AI agent swarm.";

export const LINKS = {
  x: "https://x.com/socialsrising",
  discord: "https://discord.gg/krVPuyksQy",
  article: "https://x.com/tradesgiving/status/2119840504795812285", // the team / why we launched EARLY
  telegram: "https://t.me/+Wzr9-0gNQtM2YTEx",
  // On-site: the Olympus terminal (trades on Kalos). Early Birds shows its contract address there and links to Kalos once listed.
  earlyToken: "/incubator/olympus?t=0x2a67aee95a8e28307d720685cf3e8b0ab10284a5",
  earlyBirds: "/incubator/olympus?t=early-birds",
  helpTelegram: "https://t.me/Tradesgiving",
  helpX: "https://x.com/Tradesgiving",
};

/** Utility template fee options: total fee per trade, in percent. */
export const FEE_TIERS = [
  { pct: 3, label: "3%", name: "Growth", desc: "Lower fee, more trading." },
  { pct: 5, label: "5%", name: "Balanced", desc: "Right for most projects.", recommended: true },
  { pct: 10, label: "10%", name: "Max Reinvestment", desc: "The most buybacks and rewards." },
] as const;
export const DEFAULT_FEE_PCT = 5;

export const ELYSIUM = {
  chainId: 99901,
  name: "Elysium",
  gas: "HYPE",
  explorer: "https://elysium.kinetiq.xyz",
  bridgeHelp: "https://montramarkets.xyz/docs/elysium",
} as const;

/** Montra, the launchpad EARLY launches on. `fees` are the utility template's FEE_TIERS percentages; `snipe` its
    anti-snipe windows in seconds. `bonus` is the incentive note shown for it (`until` hides it after that time). */
export type LaunchpadKey = "montra";
export type Launchpad = {
  key: LaunchpadKey; name: string; chain: string; site: string; tokenUrl: (t: string) => string;
  fees: number[]; snipe: number[];
  bonus?: { title: string; text: string; href: string; until?: string };
};

export const LAUNCHPADS: Launchpad[] = [
  {
    key: "montra", name: "Montra", chain: "Elysium", site: "https://montramarkets.xyz",
    tokenUrl: (t) => `https://montramarkets.xyz/token/${t.toLowerCase()}`,
    fees: [3, 5, 10], snipe: [0, 30, 60, 300, 900, 1800],
    bonus: {
      title: "Montra Season 2 airdrop is live",
      text: "Launching and trading earn points toward the 25% MONTRA airdrop.",
      href: "https://montramarkets.xyz/airdrop",
    },
  },
];
export const launchpad = (k: LaunchpadKey) => LAUNCHPADS.find((l) => l.key === k)!;

export const explorerAddr = (a: string) => `${ELYSIUM.explorer}/address/${a}`;
export const explorerTx = (h: string) => `${ELYSIUM.explorer}/tx/${h}`;

/* ----------------------------------------------------------------------------------- Stock meme template */
/** 3x stock tokens a meme can pair with on Montra. With 100% of fees to holders, Montra pays holders in the pair asset,
    so holders earn the 3x token, streamed hourly and claimable on Montra: no extra contracts. Names are the tokens' own. */
export const STOCKS: { address: `0x${string}`; symbol: string; name: string; ticker: string }[] = [
  { address: "0xc4be5f25dfaa81ed188db01fee37e2ed4163c8d5", symbol: "xyz:NVDA3L", name: "xyz:NVDA 3x Long", ticker: "NVDA 3x" },
  { address: "0xc03449cd7633b2fbe33c3b9ab49e7420f32b0b83", symbol: "xyz:ANT3L", name: "xyz:ANT 3x Long", ticker: "ANT 3x" },
];
/** Dev buy presets for stock memes, in dollars of the pair token. */
export const STOCK_BUY_USD = [50, 150, 300];

/* ----------------------------------------------------------------------------------- Meme coin launch template */
/** The meme template: every creator-side fee goes to the token's holders, fixed forever. The creator makes a dev buy,
    sends EARLY's treasury (the 60% Community Initiatives wallet) 2%+ of supply, then DMs @Tradesgiving for a 24-hour push. */
export const MEME = {
  fees: [
    { pct: 1, name: "Degen", desc: "Holders get up to 0.6% of every trade." },
    { pct: 2, name: "Balanced", desc: "Holders get up to 1.6% of every trade.", recommended: true },
    { pct: 3, name: "Max rewards", desc: "Holders get up to 2.6% of every trade." },
  ],
  defaultFee: 2,
  /** Montra's HOLDERS route: address(1) in the fee recipients makes the token pay its own holders. */
  holders: "0x0000000000000000000000000000000000000001" as `0x${string}`,
  treasury: SLOTS[0].wallet,
  minAllocPct: 2,
  allocChoices: [2, 3, 5, 10],
  firstBuyPresets: ["1", "3", "5"],
  defaultFirstBuy: "3",
  /** The 24h push by how much of the supply the creator sends. Effort, never results. */
  /** Bonus for deployers who send the minimum allocation or more. */
  birdsBonus: "Deployers who send 2%+ also get bonus Early Birds NFT rewards.",
  pushTiers: [
    { pct: 2, text: "EARLY + Socials Rising accounts, raids and a creator wave." },
    { pct: 5, text: "Bigger creators and more posts." },
    { pct: 10, text: "Our biggest creators, the most posts, priority spotlights." },
  ],
  /** Trending themes, shown big on the meme template. */
  ideas: [
    { theme: "GTA 6", emoji: "🌴", hook: "Heists, wanted stars, Vice City sunsets." },
    { theme: "Anthropic IPO", emoji: "🔔", hook: "Ringing the bell, AI-pilled traders, agents doing the work." },
  ],
};
