"use client";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { useState } from "react";
import { CHAINS, type ChainInfo } from "../_lib/chains";
import { RewardsDistributorAbi } from "../_lib/abi";
import { useToast } from "./Toast";
import { readable } from "../_lib/launchpad";

type Claim = { account: string; amount: string; proof: `0x${string}`[]; detail: { token: string; symbol: string; tier: number; streak: number; amount: string }[] };
type Epoch = { id: number; total: string; root: string | null; createdAt: string; published?: boolean; claims?: Claim[] };

async function loadEpochs(chainId: number, account: string) {
  const idx = await fetch(`/launchpad/epochs/${chainId}/index.json`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!idx) return [] as (Epoch & { mine: Claim | undefined })[];
  const out = [];
  for (const e of idx.epochs as Epoch[]) {
    if (!e.published) continue;
    const full = await fetch(`/launchpad/epochs/${chainId}/${e.id}.json`).then((r) => r.json()).catch(() => null);
    const mine = full?.claims?.find((c: Claim) => c.account.toLowerCase() === account.toLowerCase());
    out.push({ ...e, mine });
  }
  return out;
}

function ChainRewards({ chain }: { chain: ChainInfo }) {
  const { address, chainId } = useAccount();
  const { data: epochs = [] } = useQuery({ queryKey: ["epochs", chain.id, address], enabled: !!address, queryFn: () => loadEpochs(chain.id, address!) });
  const mine = epochs.filter((e) => e.mine);
  const { data: claimed, refetch } = useReadContracts({
    allowFailure: true, query: { enabled: mine.length > 0 && !!chain.distributor },
    contracts: mine.map((e) => ({ address: chain.distributor!, abi: RewardsDistributorAbi, functionName: "hasClaimed" as const, args: [BigInt(e.id), address!] as const, chainId: chain.id })),
  });
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: chain.id });
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);

  async function claim(e: Epoch & { mine: Claim | undefined }) {
    if (!chain.distributor || !e.mine || !publicClient || !address) return;
    setBusy(e.id);
    try {
      if (chainId !== chain.id) await switchChainAsync({ chainId: chain.id });
      const hash = await writeContractAsync({ address: chain.distributor, abi: RewardsDistributorAbi, functionName: "claim", args: [BigInt(e.id), address, BigInt(e.mine.amount), e.mine.proof], chainId: chain.id });
      await publicClient.waitForTransactionReceipt({ hash });
      toast(`Claimed ${Number(formatEther(BigInt(e.mine.amount))).toFixed(5)} ETH`); refetch();
    } catch (err) { toast(readable(err)); } finally { setBusy(null); }
  }

  if (!address || !mine.length) return null;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {mine.map((e, i) => {
        const done = claimed?.[i]?.result === true;
        return (
          <div key={e.id} className="card pad" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div className="eyebrow">{chain.short} · week {e.id} · {new Date(e.createdAt).toLocaleDateString()}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700 }}>{Number(formatEther(BigInt(e.mine!.amount))).toFixed(5)} ETH</div>
              <div className="muted" style={{ fontSize: ".85rem" }}>{e.mine!.detail.map((d: Claim["detail"][number]) => `$${d.symbol} tier ${d.tier} · ${d.streak}w streak`).join(" · ")}</div>
            </div>
            <button className="btn primary" disabled={done || busy === e.id} onClick={() => claim(e)}>{done ? "Claimed" : busy === e.id ? "Claiming…" : "Claim"}</button>
          </div>
        );
      })}
    </div>
  );
}

export function Rewards() {
  const chains = Object.values(CHAINS).filter((c) => c.distributor);
  return <>{chains.map((c) => <ChainRewards key={c.key} chain={c} />)}</>;
}
