import { base, baseSepolia } from "viem/chains";

/** Chain the launchpad talks to. Set NEXT_PUBLIC_LAUNCHPAD_CHAIN=base for mainnet. */
export const NETWORK = process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN === "base" ? "base" : "base-sepolia";
export const CHAIN = NETWORK === "base" ? base : baseSepolia;
export const CHAIN_ID = CHAIN.id as 8453 | 84532;
export const IS_TESTNET = NETWORK !== "base";

/** Treasury wallet that receives the 1% launchpad fee (Daniel supplies this; falls back to zero-address guard). */
export const TREASURY = (process.env.NEXT_PUBLIC_LAUNCHPAD_TREASURY ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

/**
 * Staking rewards collector. Until the staking contract ships (Shot 4), the stakers' share of fees
 * accrues here so it can be distributed by the weekly Merkle drop. Defaults to the treasury.
 */
export const STAKING_COLLECTOR = (process.env.NEXT_PUBLIC_LAUNCHPAD_STAKING_COLLECTOR ??
  process.env.NEXT_PUBLIC_LAUNCHPAD_TREASURY ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const TREASURY_SET = TREASURY !== "0x0000000000000000000000000000000000000000";

export const EXPLORER = IS_TESTNET ? "https://sepolia.basescan.org" : "https://basescan.org";
export const BRAND = "Meme Maxxers";
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://proofofreal.vercel.app";

/** Clanker v4 fixes total supply at 100B for every token. */
export const TOTAL_SUPPLY = 100_000_000_000;
export const ETH_USD_FALLBACK = 3400;
