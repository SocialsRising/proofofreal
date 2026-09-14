"use client";
import { useQuery } from "@tanstack/react-query";
import { listTokens, getToken } from "./registry";
import { EXAMPLE_TOKENS } from "./mock";
import type { LaunchToken } from "./types";

/** Real launches first, then the example set so the site never looks empty. */
export function useTokens() {
  return useQuery({
    queryKey: ["launchpad-tokens"],
    queryFn: async () => { const real = await listTokens(); return [...real, ...EXAMPLE_TOKENS] as LaunchToken[]; },
    staleTime: 15_000,
  });
}
export function useToken(id: string) {
  return useQuery({
    queryKey: ["launchpad-token", id.toLowerCase()],
    queryFn: async () => (EXAMPLE_TOKENS.find((t) => t.address === id) ?? (await getToken(id))) as LaunchToken | null,
  });
}
