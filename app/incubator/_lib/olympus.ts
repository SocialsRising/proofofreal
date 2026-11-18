/* Olympus: the EARLY trading terminal on top of Kalos (kalos.fun), Elysium's swap router.
   Quotes come from Kalos's router (through our server: it doesn't allow browser calls from other sites);
   the trade itself happens on Kalos's own page for the token, so this site never builds or signs a swap. */

export const KALOS_QUOTER = "https://kalos-quoter.onrender.com";
export const KALOS = "https://www.kalos.fun";
/** Wrapped HYPE on Elysium mainnet, as Kalos uses it for routing (from Kalos's live config). */
export const WHYPE = "0xba876237b0f021a6c6d852d6c26e107997cc5e81" as const;
export const kalosTradeUrl = (token: string) => `${KALOS}/trade/${token.toLowerCase()}`;

/** The 39 Early Birds gods (public/olympus/gods/<slug>.webp). */
export const GODS = ["Aether", "Aphrodite", "Apollo", "Ares", "Aristaeus", "Artemis", "Atlas", "Boreas", "Brontes", "Chaos", "Chronos", "Coeus", "Deimos",
  "Eosphorus", "Erato", "Erebus", "Glaucus", "Hecate", "Helios", "Hephaestus", "Hermes", "Hypnos", "Kratos", "Leto", "Nemesis", "Nike", "Nyx", "Oceanus",
  "Pan", "Phoebe", "Poseidon", "Proteus", "Selene", "Thalia", "Thanatos", "Triton", "Uranus", "Zelus", "Zeus"] as const;
export type God = (typeof GODS)[number];
export const godImg = (g: God, large = false) => `/olympus/gods/${g.toLowerCase()}${large ? "-lg" : ""}.webp`;

const EARLY = "0x2a67aee95a8e28307d720685cf3e8b0ab10284a5";
/** Zeus guards $EARLY; every other token gets a god picked from its address, so it keeps the same one. */
export function godFor(address: string): God {
  const a = address.toLowerCase();
  if (a === EARLY) return "Zeus";
  const reserved = new Set<God>(["Zeus", ...MAJORS.map((m) => m.god)]); // verified assets keep their own gods
  const pool = GODS.filter((g) => !reserved.has(g));
  return pool[parseInt(a.slice(-6), 16) % pool.length];
}

/** Verified Elysium assets: Volta's approved quote assets (read from its PairedTokenRegistry price calculators) and
    MONTRA from Montra's own index. Kalos indexes every token, copycats included, so only these get the verified badge. */
export type Major = { address: `0x${string}`; symbol: string; name: string; decimals: number; god: God; kind: "Ecosystem" | "Majors" | "Stocks" };
export const MAJORS: Major[] = [
  { address: "0xe45a355d9e9cad2ad85f2d03e3ee3102a036acf0", symbol: "KNTQ", name: "Kinetiq", decimals: 18, god: "Atlas", kind: "Ecosystem" },
  { address: "0x063f7cc5339f92a5fd7baf3d22233044fda1f327", symbol: "MONTRA", name: "Montra", decimals: 18, god: "Hermes", kind: "Ecosystem" },
  { address: "0x0f79931689af199e7cf868ed1107bba2c83c68f7", symbol: "VOLTA", name: "Volta", decimals: 18, god: "Brontes", kind: "Ecosystem" },
  { address: "0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65", symbol: "USDC", name: "USD Coin", decimals: 6, god: "Coeus", kind: "Majors" },
  { address: "0xe9c29585eae4b9a55b02a9605aea892b40d972e8", symbol: "UBTC", name: "Unit Bitcoin", decimals: 8, god: "Kratos", kind: "Majors" },
  { address: "0x7a66a75fe41bc26867c17fe1bc7d1c076ebd4ecd", symbol: "UETH", name: "Unit Ethereum", decimals: 18, god: "Aether", kind: "Majors" },
  { address: "0xd78ec40ac7412069ca0f223413c7e5e1d18f4315", symbol: "USOL", name: "Unit Solana", decimals: 9, god: "Helios", kind: "Majors" },
  { address: "0x11265018bf2d5a99fb71efae73ad670203c1df44", symbol: "wNVDAx", name: "Wrapped NVIDIA xStock", decimals: 18, god: "Hephaestus", kind: "Stocks" },
  { address: "0x437c847644ff22cbcf0ea56896aa25504aad93b4", symbol: "wSPYx", name: "Wrapped S&P 500 xStock", decimals: 18, god: "Nike", kind: "Stocks" },
  { address: "0x9039ebd84ee2a0e198eb265e692390762995872c", symbol: "wQQQx", name: "Wrapped Nasdaq xStock", decimals: 18, god: "Apollo", kind: "Stocks" },
  { address: "0x7559191f12413d122493fe43de6d0b4544c6579f", symbol: "EQTSLA", name: "EQX Tokenized TSLA", decimals: 8, god: "Boreas", kind: "Stocks" },
  { address: "0x8264c91cedfe6cc078116083d5a3e198c16b1898", symbol: "EQSPCX", name: "EQX Tokenized SPCX", decimals: 8, god: "Uranus", kind: "Stocks" },
];
export const majorOf = (a: string) => MAJORS.find((m) => m.address === a.toLowerCase());

/** A token as the terminal lists it. */
export type OlyToken = { address: string; symbol: string; name: string; decimals: number; tier: "pantheon" | "verified" | "unverified"; god?: God;
  imageUrl?: string | null; launchpad?: string; launchpadUrl?: string; marketCapUsd?: number | null; change24hPct?: number | null; holders?: number };

/** What /api/incubator/olympus/quote answers. */
export type OlyQuote = {
  amountIn: string; amountOut: string | null; minimumOut: string | null; error?: string; hops: { kind: string; fee: number }[]; legs: number; paths: number; simulated: number; block: number | null;
  /** The token's own launchpad pool (Montra/Volta), if it has one: price in HYPE per token and its trade fee. */
  ref: { venue: "Montra" | "Volta"; url: string; price: number; feePct: number } | null;
  /** Kalos's output ÷ the value at the launchpad pool price. Well below 1 means Kalos's route is a bad deal. */
  efficiency: number | null;
};
/** Below this, Kalos's route returns too little versus the launchpad's own pool, and the terminal sends traders there instead. */
export const MIN_ROUTE_EFFICIENCY = 0.8;
