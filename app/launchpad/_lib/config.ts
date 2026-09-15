export const BRAND = "Meme Maxxers";
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://proofofreal.app";
/** Every token launched here has exactly 1,000,000,000 supply. */
export const TOTAL_SUPPLY = 1_000_000_000;
export const ETH_USD_FALLBACK = 3400;
/** Starting market cap for a fresh token, in ETH — mirrors LaunchFactory.initialMcapWei. */
export const INITIAL_MCAP_ETH = 3;
export const LAUNCH_FEE_ETH = 0.0005;

/**
 * Public links shown in the nav and footer. Set the NEXT_PUBLIC_* vars in Vercel; an unset social
 * link is simply hidden. Docs fall back to the built-in /launchpad/docs page.
 * (Read as literal process.env.NAME — Next only inlines literal member access.)
 */
export const LINKS = {
  docs: process.env.NEXT_PUBLIC_DOCS_URL || "/launchpad/docs",
  x: process.env.NEXT_PUBLIC_X_URL || "https://x.com/mememaxxers",
  discord: process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/krVPuyksQy",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || "",
};
