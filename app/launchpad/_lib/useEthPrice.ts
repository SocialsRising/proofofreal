"use client";
import { useQuery } from "@tanstack/react-query";
import { ETH_USD_FALLBACK } from "./config";

/** Live ETH/USD for the estimates on the launch page; falls back to a constant if the feed is unreachable. */
export function useEthPrice() {
  const q = useQuery({
    queryKey: ["eth-usd"], staleTime: 60_000, retry: 1,
    queryFn: async () => {
      const r = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
      if (!r.ok) throw new Error("price feed");
      const n = Number((await r.json())?.data?.amount);
      if (!n) throw new Error("price feed");
      return n;
    },
  });
  return { eth: q.data ?? ETH_USD_FALLBACK, live: q.data !== undefined };
}
