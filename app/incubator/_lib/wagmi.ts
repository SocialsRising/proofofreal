// Wallet setup for the EARLY Incubator only: Elysium is the only chain, and wallets show "EARLY Incubator" with the
// EARLY logo when asking to connect (the launchpad has its own config with its own name).
// Reads go to Kinetiq's own Elysium RPC first (Kinetiq runs the chain), then Montra's, so the on-chain checks before a
// launch don't depend on the same operator as Montra's API.
import { fallback, http, createConfig, cookieStorage, createStorage } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { elysium } from "../../launchpad/_lib/chains";
import { BRAND, SITE } from "./config";

const RPCS = [process.env.NEXT_PUBLIC_ELYSIUM_RPC, "https://rpc.elysium.kinetiq.xyz", "https://rpc.montramarkets.xyz"].filter((u): u is string => !!u);

export const incubatorWagmi = createConfig({
  chains: [elysium],
  connectors: [injected(), coinbaseWallet({ appName: BRAND, appLogoUrl: `${SITE}/incubator/icon-180.png`, preference: "all" })],
  storage: createStorage({ storage: cookieStorage, key: "early-incubator" }),
  ssr: true,
  // Batched JSON-RPC: a page's many reads go out as a few requests, which keeps us under public RPC rate limits.
  transports: { [elysium.id]: fallback(RPCS.map((u) => http(u, { batch: { batchSize: 40, wait: 20 } }))) },
});
