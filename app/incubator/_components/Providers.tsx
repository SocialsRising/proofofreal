"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider, type ResolvedRegister } from "wagmi";
import { incubatorWagmi } from "../_lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  // wagmi's global types are registered by the launchpad's config (which also includes Elysium); at runtime the
  // incubator gets its own Elysium-only config, so only the static type needs bridging here.
  return (
    <WagmiProvider config={incubatorWagmi as unknown as ResolvedRegister["config"]}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
