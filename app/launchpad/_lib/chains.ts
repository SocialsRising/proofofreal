import { defineChain } from "viem";
import { base, baseSepolia } from "viem/chains";

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ROBINHOOD_RPC ?? "https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
});

export type ChainKey = "base" | "robinhood" | "base-sepolia";

export type SupportedChainId = 8453 | 4663 | 84532;
export type ChainInfo = {
  key: ChainKey; id: SupportedChainId; label: string; short: string; testnet: boolean; explorer: string;
  weth: `0x${string}`; factory?: `0x${string}`; distributor?: `0x${string}`;
  swapUrl: (token: string) => string; chartUrl?: (token: string) => string;
};

// NEXT_PUBLIC_* vars must be read as literal `process.env.NAME` — Next only inlines literal member access into client bundles.

export const CHAINS: Record<ChainKey, ChainInfo> = {
  base: {
    key: "base", id: base.id, label: "Base", short: "Base", testnet: false, explorer: "https://basescan.org",
    weth: "0x4200000000000000000000000000000000000006",
    factory: (process.env.NEXT_PUBLIC_FACTORY_8453 as `0x${string}` | undefined) || undefined, distributor: (process.env.NEXT_PUBLIC_DISTRIBUTOR_8453 as `0x${string}` | undefined) || undefined,
    swapUrl: (t) => `https://app.uniswap.org/swap?chain=base&outputCurrency=${t}`,
    chartUrl: (t) => `https://dexscreener.com/base/${t}?embed=1&theme=dark&trades=0&info=0`,
  },
  robinhood: {
    key: "robinhood", id: robinhood.id, label: "Robinhood Chain", short: "Robinhood", testnet: false, explorer: "https://robinhoodchain.blockscout.com",
    weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    factory: (process.env.NEXT_PUBLIC_FACTORY_4663 as `0x${string}` | undefined) || undefined, distributor: (process.env.NEXT_PUBLIC_DISTRIBUTOR_4663 as `0x${string}` | undefined) || undefined,
    swapUrl: (t) => `https://app.uniswap.org/swap?chain=robinhood&outputCurrency=${t}`,
    chartUrl: (t) => `https://dexscreener.com/robinhood/${t}?embed=1&theme=dark&trades=0&info=0`,
  },
  "base-sepolia": {
    key: "base-sepolia", id: baseSepolia.id, label: "Base Sepolia (testnet)", short: "Base Sepolia", testnet: true, explorer: "https://sepolia.basescan.org",
    weth: "0x4200000000000000000000000000000000000006",
    factory: (process.env.NEXT_PUBLIC_FACTORY_84532 as `0x${string}` | undefined) || undefined, distributor: (process.env.NEXT_PUBLIC_DISTRIBUTOR_84532 as `0x${string}` | undefined) || undefined,
    swapUrl: (t) => `https://sepolia.basescan.org/token/${t}`,
  },
};

export const VIEM_CHAINS = { [base.id]: base, [robinhood.id]: robinhood, [baseSepolia.id]: baseSepolia } as const;
export const chainById = (id?: number) => Object.values(CHAINS).find((c) => c.id === id);
/** Chains offered in the launch UI: only those with a deployed factory, testnet included when NEXT_PUBLIC_SHOW_TESTNET=1. */
export const LAUNCH_CHAINS = (["base", "robinhood", "base-sepolia"] as ChainKey[])
  .map((k) => CHAINS[k])
  .filter((c) => c.factory && (!c.testnet || process.env.NEXT_PUBLIC_SHOW_TESTNET === "1"));
export const DEFAULT_CHAIN: ChainInfo = LAUNCH_CHAINS[0] ?? CHAINS.base;
