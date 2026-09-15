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
/** Uniswap V4 periphery a chain needs for the V4 factory + in-app swaps. */
export type V4Infra = { poolManager: `0x${string}`; positionManager: `0x${string}`; stateView: `0x${string}`; quoter: `0x${string}`; universalRouter: `0x${string}`; permit2: `0x${string}` };
export type ChainInfo = {
  key: ChainKey; id: SupportedChainId; label: string; short: string; testnet: boolean; explorer: string;
  weth: `0x${string}`; factory?: `0x${string}`; distributor?: `0x${string}`;
  /** LaunchFactoryV4 (launchpad 1% + founder 0–10%). When set, new launches use it and the V3 factory is retired. */
  factoryV4?: `0x${string}`; hook?: `0x${string}`; v4?: V4Infra;
  swapUrl: (token: string) => string; chartUrl?: (token: string) => string;
};

const addr = (s?: string) => (s as `0x${string}` | undefined) || undefined;
// NEXT_PUBLIC_* vars must be read as literal `process.env.NAME` — Next only inlines literal member access into client bundles.

export const CHAINS: Record<ChainKey, ChainInfo> = {
  base: {
    key: "base", id: base.id, label: "Base", short: "Base", testnet: false, explorer: "https://basescan.org",
    weth: "0x4200000000000000000000000000000000000006",
    factory: addr(process.env.NEXT_PUBLIC_FACTORY_8453), distributor: addr(process.env.NEXT_PUBLIC_DISTRIBUTOR_8453),
    swapUrl: (t) => `https://app.uniswap.org/swap?chain=base&outputCurrency=${t}`,
    chartUrl: (t) => `https://dexscreener.com/base/${t}?embed=1&theme=dark&trades=0&info=0`,
  },
  robinhood: {
    key: "robinhood", id: robinhood.id, label: "Robinhood Chain", short: "Robinhood", testnet: false, explorer: "https://robinhoodchain.blockscout.com",
    weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    factory: addr(process.env.NEXT_PUBLIC_FACTORY_4663), distributor: addr(process.env.NEXT_PUBLIC_DISTRIBUTOR_4663),
    factoryV4: addr(process.env.NEXT_PUBLIC_FACTORY_V4_4663), hook: addr(process.env.NEXT_PUBLIC_HOOK_4663),
    v4: {
      poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951", positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7",
      stateView: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b", quoter: "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
      universalRouter: "0x8876789976decbfcbbbe364623c63652db8c0904", permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    },
    swapUrl: (t) => `https://app.uniswap.org/swap?chain=robinhood&outputCurrency=${t}`,
    chartUrl: (t) => `https://dexscreener.com/robinhood/${t}?embed=1&theme=dark&trades=0&info=0`,
  },
  "base-sepolia": {
    key: "base-sepolia", id: baseSepolia.id, label: "Base Sepolia (testnet)", short: "Base Sepolia", testnet: true, explorer: "https://sepolia.basescan.org",
    weth: "0x4200000000000000000000000000000000000006",
    factory: addr(process.env.NEXT_PUBLIC_FACTORY_84532), distributor: addr(process.env.NEXT_PUBLIC_DISTRIBUTOR_84532),
    swapUrl: (t) => `https://sepolia.basescan.org/token/${t}`,
  },
};

export const VIEM_CHAINS = { [base.id]: base, [robinhood.id]: robinhood, [baseSepolia.id]: baseSepolia } as const;
export const chainById = (id?: number) => Object.values(CHAINS).find((c) => c.id === id);
/** True when the chain launches through the V4 factory (custom creator fee). */
export const isV4Chain = (c: ChainInfo) => !!(c.factoryV4 && c.v4);
/** Chains offered in the launch UI: only those with a deployed factory, testnet included when NEXT_PUBLIC_SHOW_TESTNET=1. */
export const LAUNCH_CHAINS = (["base", "robinhood", "base-sepolia"] as ChainKey[])
  .map((k) => CHAINS[k])
  .filter((c) => (c.factoryV4 || c.factory) && (!c.testnet || process.env.NEXT_PUBLIC_SHOW_TESTNET === "1"));
export const DEFAULT_CHAIN: ChainInfo = LAUNCH_CHAINS[0] ?? CHAINS.robinhood;
