"use client";
import { useQuery } from "@tanstack/react-query";
import { listTokens, getToken } from "./registry";
import type { LaunchToken } from "./types";

/** Real launches from the registry — nothing else. Empty until the first token goes through the factory. */
export function useTokens() {
  return useQuery({
    queryKey: ["launchpad-tokens"],
    queryFn: async () => (await listTokens()) as LaunchToken[],
    staleTime: 15_000,
  });
}
export function useToken(id: string) {
  return useQuery({
    queryKey: ["launchpad-token", id.toLowerCase()],
    queryFn: async () => (await getToken(id)) as LaunchToken | null,
  });
}
