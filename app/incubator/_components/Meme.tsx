"use client";
/* Meme template pieces for the launch page: the after-launch steps and the feed of meme launches. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, usePublicClient, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../launchpad/_components/Wallet";
import { useToast } from "../../launchpad/_components/Toast";
import { ELYSIUM, LINKS, MEME, explorerAddr, explorerTx, launchpad } from "../_lib/config";
import { pct, short, usd, type MemeToken } from "../_lib/montra";

const lp = launchpad("montra");
export const fmtPct = (n: number) => (n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.?0+$/, "");

function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const toast = useToast();
  return <button type="button" className="btn sm ghost" onClick={() => navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => {})}>{label}</button>;
}

/** After a meme launch: send EARLY's allocation, then DM @Tradesgiving. Works right after launch or on any later visit. */
export function MemeNextSteps({ token, firstBuyOut }: { token: `0x${string}`; firstBuyOut?: bigint }) {
  const toast = useToast();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const reads = useReadContracts({
    contracts: [
      { address: token, abi: erc20Abi, functionName: "symbol", chainId: ELYSIUM.chainId },
      { address: token, abi: erc20Abi, functionName: "totalSupply", chainId: ELYSIUM.chainId },
      { address: token, abi: erc20Abi, functionName: "balanceOf", args: [MEME.treasury], chainId: ELYSIUM.chainId },
      { address: token, abi: erc20Abi, functionName: "balanceOf", args: [address ?? MEME.treasury], chainId: ELYSIUM.chainId },
    ],
    query: { refetchInterval: 15_000 },
  });
  const [sym, supply, treasuryBal, myBalRaw] = (reads.data ?? []).map((r) => r.result) as [string | undefined, bigint | undefined, bigint | undefined, bigint | undefined];
  const myBal = address ? myBalRaw : undefined;
  const share = (x?: bigint) => (x != null && supply ? Number((x * BigInt(1_000_000)) / supply) / 10_000 : null);
  const treasuryPct = share(treasuryBal), myPct = share(myBal);
  const [alloc, setAlloc] = useState<number>(MEME.minAllocPct);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<`0x${string}` | null>(null);
  const [err, setErr] = useState("");
  const amount = supply ? (supply * BigInt(alloc * 100)) / BigInt(10_000) : null;
  const sent = treasuryPct != null && treasuryPct >= MEME.minAllocPct;
  const symbol = sym ? `$${sym}` : "your token";

  async function send() {
    setErr("");
    if (!address || !client || !amount) return;
    if (myBal == null || myBal < amount) return setErr(`You hold ${myPct != null ? fmtPct(myPct) : "—"}% of the supply. Pick a smaller share.`);
    try {
      setBusy(true);
      if (chainId !== ELYSIUM.chainId) await switchChainAsync({ chainId: ELYSIUM.chainId });
      const hash = await writeContractAsync({ address: token, abi: erc20Abi, functionName: "transfer", args: [MEME.treasury, amount], chainId: ELYSIUM.chainId });
      await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
      setTx(hash); toast(`Sent ${alloc}% to EARLY ✓`); reads.refetch();
    } catch (e) {
      const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Something went wrong.";
      setErr(/rejected|denied/i.test(m) ? "You cancelled in your wallet." : m.slice(0, 220));
    } finally { setBusy(false); }
  }

  const sentPct = treasuryPct != null && treasuryPct > 0 ? fmtPct(treasuryPct) : `${alloc}`;
  const dm = `gm @Tradesgiving 👋 Just launched ${symbol} with the EARLY meme template.\nCA: ${token}\nSent ${sentPct}% of supply to the EARLY treasury${tx ? `: ${explorerTx(tx)}` : ""}\nReady for the 24h push 🚀`;

  return (
    <div className="card pad memenext">
      <h2>{symbol} is live 🚀</h2>
      {firstBuyOut != null && supply ? <p className="muted" style={{ marginTop: 6 }}>Your dev buy got {fmtPct(share(firstBuyOut) ?? 0)}% of the supply.</p> : null}
      <ol className="memeflow">
        <li className={sent ? "done" : "on"}>
          <i>{sent ? "✓" : "1"}</i>
          <div>
            <b>Send EARLY {MEME.minAllocPct}%+ of the supply</b>
            <p>Bigger allocation, bigger creators, more posts. Goes to <a className="mono" href={explorerAddr(MEME.treasury)} target="_blank" rel="noreferrer">{short(MEME.treasury)} ↗</a></p>
            <div className="chips" role="group" aria-label="Share of supply to send">
              {MEME.allocChoices.map((p) => <button key={p} type="button" aria-pressed={alloc === p} className={`chip ${alloc === p ? "on" : ""}`} onClick={() => setAlloc(p)}>{p}%</button>)}
            </div>
            {(myPct != null || (treasuryPct ?? 0) > 0) && <p className="muted" style={{ fontSize: ".82rem", marginTop: 8 }}>{myPct != null && <>You hold {fmtPct(myPct)}%. </>}{(treasuryPct ?? 0) > 0 && <>EARLY holds {fmtPct(treasuryPct!)}%.</>}</p>}
            {!isConnected ? <div style={{ marginTop: 10 }}><WalletButton /></div>
              : <button className="btn primary" style={{ marginTop: 10 }} onClick={send} disabled={busy || !amount}>{busy ? "Sending…" : `Send ${alloc}%${amount ? ` (${Number(formatUnits(amount, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${symbol})` : ""}`}</button>}
            {tx && <p style={{ fontSize: ".85rem", marginTop: 8 }}>Sent ✓ <a href={explorerTx(tx)} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>View ↗</a></p>}
            {err && <div className="warn" style={{ marginTop: 10 }}>{err}</div>}
          </div>
        </li>
        <li className={sent ? "on" : ""}>
          <i>2</i>
          <div>
            <b>DM @Tradesgiving right after</b>
            <pre className="memedm">{dm}</pre>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Copy text={dm} label="Copy message" />
              <a className="btn sm primary" href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">Open Telegram ↗</a>
            </div>
          </div>
        </li>
        <li>
          <i>3</i>
          <div>
            <b>Post and push Montra Season 2</b>
            <p>Every trade earns MONTRA airdrop points, so tell your buyers.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Link className="btn sm" href={`/incubator/elysium/p/${token}`}>Launch kit →</Link>
              <a className="btn sm ghost" href={lp.tokenUrl(token)} target="_blank" rel="noreferrer">Montra page ↗</a>
            </div>
          </div>
        </li>
      </ol>
    </div>
  );
}

/** Meme launches through EARLY, read from the treasury's holdings (so each one has sent its allocation). */
export function MemeFeed() {
  const [list, setList] = useState<MemeToken[] | null>(null);
  useEffect(() => { fetch("/api/incubator/memes").then((r) => r.json()).then((d: { tokens?: MemeToken[] }) => setList(d.tokens ?? [])).catch(() => setList([])); }, []);
  if (!list?.length) return null;
  return (
    <section className="blk">
      <div className="sh"><div className="eyebrow">Fresh memes</div><h2>Launched with EARLY</h2></div>
      <div className="memegrid">
        {list.slice(0, 12).map((t) => (
          <Link key={t.address} className="memecard" href={`/incubator/elysium/p/${t.address}`}>
            {t.imageUrl ? <img src={t.imageUrl} alt="" loading="lazy" /> : <span className="ph" />}
            <span><b>${t.symbol}</b><small>{t.name}</small></span>
            <span className="r"><b>{usd(t.marketCapUsd)}</b><small className={(t.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(t.change24hPct)}</small></span>
            <em>EARLY holds {fmtPct(t.allocPct)}%</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

