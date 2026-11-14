import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { BRAND } from "./config";
import { elysium, robinhood } from "./chains";

export const wagmiConfig = createConfig({
  chains: [base, robinhood, elysium, baseSepolia],
  connectors: [injected(), coinbaseWallet({ appName: `${BRAND} Launchpad`, preference: "all" })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC),
    [robinhood.id]: http(process.env.NEXT_PUBLIC_ROBINHOOD_RPC ?? "https://rpc.mainnet.chain.robinhood.com"),
    [elysium.id]: http(process.env.NEXT_PUBLIC_ELYSIUM_RPC ?? "https://rpc.montramarkets.xyz"),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC),
  },
});

declare module "wagmi" {
  interface Register { config: typeof wagmiConfig; }
}
