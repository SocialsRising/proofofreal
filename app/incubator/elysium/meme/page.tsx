"use client";
/* Meme coin launch template (Montra). 100% of the creator-side fee goes to holders, fixed forever. After launching, the
   creator sends EARLY's treasury 2%+ of the supply and DMs @Tradesgiving for a 24-hour amplification push. */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { erc20Abi, formatEther, formatUnits, parseEther } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../../launchpad/_components/Wallet";
import { useToast } from "../../../launchpad/_components/Toast";
import { ELYSIUM, LINKS, MEME, MONTRA_BUILDER_CODE, PARENT, explorerAddr, explorerTx, launchpad } from "../../_lib/config";
import { Bonus, HelpLine } from "../../_components/Bits";
import { LAUNCH_ABI, MONTRA_FACTORY, SNIPE_WINDOWS, isAddr, montra, pct, safeLink, short, usd, type MemeToken } from "../../_lib/montra";
import { launchedToken, prepareMontraLaunch } from "../../_lib/montraLaunch";

type Step = "idle" | "switch" | "check" | "upload" | "sign" | "confirm" | "done";
const STEPS: [Step, string][] = [["switch", "Switch to Elysium"], ["check", "Check the launch terms on-chain"], ["upload", "Upload image + details"], ["sign", "Confirm in your wallet"], ["confirm", "Wait for Elysium to confirm"]];
const LINK_FIELDS = [
  ["website", "Website", "Website must be an https:// link."],
  ["twitter", "X", "X link must be an https://x.com/… link."],
  ["telegram", "Telegram", "Telegram link must be an https://t.me/… link."],
] as const;
const lp = launchpad("montra");
const SNIPES = SNIPE_WINDOWS.filter((w) => lp.snipe.includes(w.s));
const Check = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const fmtPct = (n: number) => (n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.?0+$/, "");

function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const toast = useToast();
  return <button type="button" className="btn sm ghost" onClick={() => navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => {})}>{label}</button>;
}

/** After launch: send EARLY's allocation, then DM @Tradesgiving. Works from the launch itself or any later visit (?token=). */
function NextSteps({ token, firstBuyOut }: { token: `0x${string}`; firstBuyOut?: bigint }) {
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
  const pctOf = (x?: bigint) => (x != null && supply ? Number((x * BigInt(1_000_000)) / supply) / 10_000 : null);
  const treasuryPct = pctOf(treasuryBal), myPct = pctOf(myBal);
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
    if (myBal == null || myBal < amount) return setErr(`You hold ${myPct != null ? fmtPct(myPct) : "—"}% of the supply. Pick a smaller share, or buy more first.`);
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
  const dm = `gm @Tradesgiving 👋 Just launched ${symbol} with the EARLY meme template on Montra.\nCA: ${token}\nSent ${sentPct}% of supply to the EARLY treasury${tx ? `: ${explorerTx(tx)}` : ""}\nReady for the 24h push 🚀`;

  return (
    <div className="card pad memenext">
      <div className="eyebrow">Your next steps</div>
      <h2 style={{ marginTop: 8 }}>{symbol} is live. Now let&apos;s make it loud.</h2>
      {firstBuyOut != null && supply ? <p className="muted" style={{ marginTop: 6 }}>Your first buy got {Number(formatEther(firstBuyOut)).toLocaleString(undefined, { maximumFractionDigits: 0 })} {symbol} ({fmtPct(pctOf(firstBuyOut) ?? 0)}% of supply).</p> : null}
      <ol className="memeflow">
        <li className={sent ? "done" : "on"}>
          <i>{sent ? "✓" : "1"}</i>
          <div>
            <b>Send EARLY at least {MEME.minAllocPct}% of the supply</b>
            <p>It goes to the EARLY treasury <a className="mono" href={explorerAddr(MEME.treasury)} target="_blank" rel="noreferrer">{short(MEME.treasury)} ↗</a> and funds the 24-hour push. The bigger the allocation, the bigger the creators and the more posts we can put behind it.</p>
            <div className="chips" role="group" aria-label="Share of supply to send">
              {MEME.allocChoices.map((p) => <button key={p} type="button" aria-pressed={alloc === p} className={`chip ${alloc === p ? "on" : ""}`} onClick={() => setAlloc(p)}>{p}%</button>)}
            </div>
            <p className="muted" style={{ fontSize: ".82rem", marginTop: 8 }}>
              {MEME.pushTiers.filter((t) => t.pct <= alloc).slice(-1)[0]?.text}
              {myPct != null && <> You hold <b style={{ color: "var(--fg)" }}>{fmtPct(myPct)}%</b>.</>}
              {treasuryPct != null && treasuryPct > 0 && <> EARLY holds <b style={{ color: "var(--fg)" }}>{fmtPct(treasuryPct)}%</b>.</>}
            </p>
            {!isConnected ? <div style={{ marginTop: 10 }}><WalletButton /></div>
              : <button className="btn primary" style={{ marginTop: 10 }} onClick={send} disabled={busy || !amount}>{busy ? "Sending…" : `Send ${alloc}% ${amount ? `(${Number(formatUnits(amount, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${symbol})` : ""} to EARLY`}</button>}
            {tx && <p style={{ fontSize: ".85rem", marginTop: 8 }}>Sent ✓ <a href={explorerTx(tx)} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>View transaction ↗</a></p>}
            {err && <div className="warn" style={{ marginTop: 10 }}>{err}</div>}
          </div>
        </li>
        <li className={sent ? "on" : ""}>
          <i>2</i>
          <div>
            <b>DM @Tradesgiving on Telegram right after</b>
            <p>So the team can line up the creators and posts for the next 24 hours. Paste this:</p>
            <pre className="memedm">{dm}</pre>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Copy text={dm} label="Copy message" />
              <a className="btn sm primary" href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">Open @Tradesgiving ↗</a>
            </div>
          </div>
        </li>
        <li>
          <i>3</i>
          <div>
            <b>Post, raid and ride Montra Season 2</b>
            <p>Every launch and trade on Montra earns points toward the 25% MONTRA airdrop, so tell your buyers. Your launch kit has the posts ready.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Link className="btn sm" href={`/incubator/elysium/p/${token}`}>Launch kit + project page →</Link>
              <a className="btn sm ghost" href={lp.tokenUrl(token)} target="_blank" rel="noreferrer">Montra page ↗</a>
              <a className="btn sm ghost" href={lp.bonus?.href} target="_blank" rel="noreferrer">MONTRA airdrop ↗</a>
            </div>
          </div>
        </li>
      </ol>
    </div>
  );
}

function MemeFeed() {
  const [list, setList] = useState<MemeToken[] | null>(null);
  useEffect(() => { fetch("/api/incubator/memes").then((r) => r.json()).then((d: { tokens?: MemeToken[] }) => setList(d.tokens ?? [])).catch(() => setList([])); }, []);
  return (
    <section className="blk">
      <div className="sh"><div className="eyebrow">Fresh memes</div><h2>Launched with the EARLY meme template</h2><p>Every token here sent EARLY its allocation. The share shown is read live from the treasury wallet.</p></div>
      {list == null ? <div className="empty">Loading…</div> : list.length === 0 ? <div className="empty">No meme launches yet. Yours could be the first one here.</div> : (
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
      )}
    </section>
  );
}

function MemeLaunch() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const paramToken = params.get("token") ?? "";
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const bal = useBalance({ address, chainId: ELYSIUM.chainId, query: { enabled: !!address } });
  const launchFee = useReadContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee", chainId: ELYSIUM.chainId }).data ?? BigInt(0);

  const [f, setF] = useState({ name: "", symbol: "", description: "", website: "", twitter: "", telegram: "", firstBuy: MEME.defaultFirstBuy });
  const [feePct, setFeePct] = useState<number>(MEME.defaultFee);
  const [snipe, setSnipe] = useState<number>(60);
  const [parody, setParody] = useState(true);
  const [img, setImg] = useState<File | null>(null);
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [err, setErr] = useState("");
  const [launched, setLaunched] = useState<{ token: `0x${string}`; firstBuyOut: bigint } | null>(null);
  const [opening, setOpening] = useState<number | null>(null); // opening market cap in HYPE, for the first-buy estimate
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const preview = useMemo(() => (img ? URL.createObjectURL(img) : null), [img]);
  useEffect(() => { montra.config().then((c) => { const r = c.configs.find((x) => x.quote === "0x0000000000000000000000000000000000000000" && "opening" in x); const o = r && Number((r as { opening?: string }).opening) / 1e18; if (o && o > 0) setOpening(o); }).catch(() => {}); }, []);

  const firstBuy = (() => { try { return f.firstBuy.trim() ? parseEther(f.firstBuy.trim()) : BigInt(0); } catch { return BigInt(-1); } })();
  const buyHype = firstBuy > BigInt(0) ? Number(formatEther(firstBuy)) : 0;
  // About what share of supply a first buy gets at the opening price (after the fee; a rough guide, not a quote).
  const estPct = (h: number) => (opening ? (100 * h * (1 - feePct / 100)) / (opening + h * (1 - feePct / 100)) : null);
  const est = estPct(buyHype);
  const description = (f.description.trim() + (parody ? `${f.description.trim() ? "\n\n" : ""}${MEME.parodyLine}` : "")).slice(0, 1000);
  const problems = [
    !f.name.trim() && "Add a name.",
    !/^[A-Z0-9]{2,10}$/.test(f.symbol) && "Ticker: 2–10 letters or numbers.",
    !img && "Add an image (PNG, JPEG, WebP or GIF, 2 MB max).",
    img && img.size > 2 * 1024 * 1024 && "Image must be 2 MB or smaller.",
    firstBuy < BigInt(0) && "First buy must be a number (in HYPE).",
    ...LINK_FIELDS.map(([k, , msg]) => f[k].trim() && !safeLink(f[k].trim(), k) && msg),
    !ack && "Tick the box to confirm you've read how it works.",
  ].filter(Boolean) as string[];
  const busy = step !== "idle" && step !== "done";
  const total = firstBuy >= BigInt(0) ? firstBuy + launchFee : null;

  async function upload() {
    const fd = new FormData();
    fd.set("launchpad", "montra"); fd.set("image", img!); fd.set("name", f.name.trim()); fd.set("symbol", f.symbol); fd.set("description", description);
    for (const [k] of LINK_FIELDS) fd.set(k, f[k].trim());
    fd.set("discord", "");
    const up = await fetch("/api/incubator/metadata", { method: "POST", body: fd });
    const meta = await up.json();
    if (!up.ok) throw new Error(meta.error ?? "Upload failed.");
    return meta as { imageUri: string; metadataUri: string; socials: Record<string, string> };
  }

  async function launch() {
    setErr("");
    if (!isConnected || !address || !client) return setErr("Connect your wallet first.");
    if (problems.length) return setErr(problems[0]);
    try {
      if (chainId !== ELYSIUM.chainId) { setStep("switch"); await switchChainAsync({ chainId: ELYSIUM.chainId }); }
      const call = await prepareMontraLaunch(client, address, {
        name: f.name.trim(), symbol: f.symbol, description, feePct, snipe, firstBuy,
        fees: { feeRecipients: [MEME.holders], feeShares: [10000] }, upload, onStep: setStep,
      });
      setStep("sign");
      const hash = await writeContractAsync({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launch", ...call, chainId: ELYSIUM.chainId });
      setStep("confirm");
      const { token, firstBuyOut } = launchedToken(await client.waitForTransactionReceipt({ hash, timeout: 180_000 }));
      setStep("done"); setLaunched({ token, firstBuyOut });
      toast(`$${f.symbol} is live 🚀`);
      router.replace(`/incubator/elysium/meme?token=${token.toLowerCase()}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Something went wrong.";
      setErr(/rejected|denied/i.test(m) ? "You cancelled in your wallet." : m.slice(0, 260));
      setStep("idle");
    }
  }

  const done = launched?.token ?? (isAddr(paramToken) ? (paramToken.toLowerCase() as `0x${string}`) : null);
  const stepIdx = STEPS.findIndex(([s]) => s === step);
  return (
    <>
      <section className="blk" style={{ paddingTop: 36 }}>
        <div className="eyebrow">Meme coin launch · {lp.name} · Elysium</div>
        <h1 style={{ marginTop: 12, fontSize: "clamp(2.2rem,5vw,3.4rem)" }}>Launch a meme coin</h1>
        <p className="muted" style={{ maxWidth: "62ch", marginTop: 12, fontSize: "1.05rem" }}>One transaction on {lp.name}: liquidity locked forever, your first buy before anyone else, and 100% of the trading fees paid to holders. Send EARLY {MEME.minAllocPct}%+ of the supply and the {PARENT} network pushes it for 24 hours.</p>
        <div style={{ marginTop: 16, maxWidth: 760 }}><Bonus lp={lp} /></div>

        {done ? <div style={{ marginTop: 24 }}><NextSteps token={done} firstBuyOut={launched?.firstBuyOut} /></div> : (
          <>
            <ol className="memesteps">
              <li><b>1 · Launch</b><span>{feePct}% fee, all of it to holders</span></li>
              <li><b>2 · Dev buy</b><span>In the same transaction, before anyone</span></li>
              <li><b>3 · Send EARLY {MEME.minAllocPct}%+</b><span>To the treasury, for the push</span></li>
              <li><b>4 · DM @Tradesgiving</b><span>24-hour creator + community push</span></li>
            </ol>

            <div className="card pad memeideas">
              <div className="eyebrow">What&apos;s hot right now</div>
              <div className="memeidea-grid">
                {MEME.ideas.map((i) => (
                  <div key={i.theme} className="memeidea">
                    <b>{i.theme}</b><p>{i.hook}</p>
                    <div className="chips">{i.tickers.map((t) => <button key={t} type="button" className={`chip ${f.symbol === t ? "on" : ""}`} onClick={() => setF((s) => ({ ...s, symbol: t, description: s.description || i.hook }))}>${t}</button>)}</div>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: ".8rem", marginTop: 10 }}>Keep it a parody: no official names or logos (Rockstar, GTA, Anthropic, Claude), no claims of being affiliated, and never suggest the token is a share or tied to a real IPO. Copycat tokens get flagged by traders and launchpads.</p>
            </div>

            <div className="grid2" style={{ marginTop: 18 }}>
              <div className="card pad" style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "start" }}>
                  <label className="upload" style={{ width: 120 }}>
                    {preview ? <img src={preview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: ".8rem" }}>Image<br />2 MB max</span>}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
                  </label>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div className="field"><label htmlFor="m-name">Name <span className="req">*</span></label><input id="m-name" className="inp" maxLength={32} value={f.name} onChange={set("name")} placeholder="Wanted Level" /></div>
                    <div className="field"><label htmlFor="m-symbol">Ticker <span className="req">*</span></label><input id="m-symbol" className="inp mono" maxLength={10} value={f.symbol} onChange={(e) => setF((s) => ({ ...s, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} placeholder="WANTED" /></div>
                  </div>
                </div>
                <div className="field"><label htmlFor="m-desc">The meme</label><textarea id="m-desc" className="inp" rows={3} maxLength={900} value={f.description} onChange={set("description")} placeholder="The joke in a sentence or two. Short and funny travels furthest." />
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".84rem", marginTop: 6 }}><input type="checkbox" checked={parody} onChange={(e) => setParody(e.target.checked)} /><span className="muted">Add a &quot;parody, not affiliated&quot; line (recommended for themes based on real brands)</span></label>
                  <span className="hint">Fixed forever at launch.</span></div>
                <div className="g2 grid" style={{ gap: 12 }}>
                  {LINK_FIELDS.map(([k, label]) => (
                    <div key={k} className="field"><label htmlFor={`m-${k}`}>{label}</label><input id={`m-${k}`} type="url" className="inp" value={f[k]} onChange={set(k)} placeholder={{ website: "https://", twitter: "https://x.com/…", telegram: "https://t.me/…" }[k]} /></div>
                  ))}
                </div>

                <div className="field"><span className="flabel">Trading fee · 100% to holders</span>
                  <div className="feeopts" role="group" aria-label="Trading fee">
                    {MEME.fees.map((t) => (
                      <button key={t.pct} type="button" aria-pressed={feePct === t.pct} className={`feeopt ${feePct === t.pct ? "on" : ""}`} onClick={() => setFeePct(t.pct)}>
                        {"recommended" in t && t.recommended && <span className="rec">Recommended</span>}
                        <span className="pc">{t.pct}%</span><span className="nm">{t.name}</span><span className="ds">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                  <span className="hint">Paid in HYPE on every buy and sell, fixed forever. Montra keeps 0.4% (plus a liquidity share once the token passes its LP line); everything else streams to holders every hour, you included.</span>
                </div>
                <div className="field"><span className="flabel">Anti-snipe</span>
                  <div className="chips" role="group" aria-label="Anti-snipe window">{SNIPES.map((w) => <button key={w.s} type="button" aria-pressed={snipe === w.s} className={`chip ${snipe === w.s ? "on" : ""}`} onClick={() => setSnipe(w.s)}>{w.label}</button>)}</div>
                  <span className="hint">Buys in this window start at a 99% fee that falls to your fee by the end, so sniping bots pay heavily. Your own first buy is exempt.</span>
                </div>
                <div className="field"><label htmlFor="m-buy">Your dev buy (HYPE)</label>
                  <div className="chips" role="group" aria-label="Dev buy presets" style={{ marginBottom: 8 }}>{MEME.firstBuyPresets.map((p) => <button key={p} type="button" aria-pressed={f.firstBuy === p} className={`chip ${f.firstBuy === p ? "on" : ""}`} onClick={() => setF((s) => ({ ...s, firstBuy: p }))}>{p} HYPE{estPct(Number(p)) != null ? ` · ~${fmtPct(estPct(Number(p))!)}%` : ""}</button>)}</div>
                  <input id="m-buy" className="inp mono" value={f.firstBuy} onChange={set("firstBuy")} inputMode="decimal" placeholder="1" />
                  <span className="hint">Happens in the same transaction, so nobody buys before you.{est != null && buyHype > 0 ? ` About ${fmtPct(est)}% of the supply at the opening price.` : ""} Buy enough to send EARLY {MEME.minAllocPct}%+ and keep a bag: holders earn the fees too.</span>
                  {est != null && buyHype > 0 && est < MEME.minAllocPct + 0.5 && <div className="warn" style={{ marginTop: 8 }}>That buy gets about {fmtPct(est)}% of the supply: not enough to send EARLY {MEME.minAllocPct}% and keep some. Try {MEME.firstBuyPresets.find((p) => (estPct(Number(p)) ?? 0) >= MEME.minAllocPct * 2) ?? "more"} HYPE.</div>}
                </div>
              </div>

              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div className="card pad">
                  <div className="eyebrow">Where your fees go</div>
                  <div className="bar3" style={{ marginTop: 14 }}><i className="a" style={{ width: "100%" }} /></div>
                  <div className="kv"><span>Token holders, paid in HYPE and streamed hourly</span><b>100%</b></div>
                  <p className="muted" style={{ fontSize: ".82rem", marginTop: 10 }}>Fixed on-chain at launch and can never be changed. You earn as a holder on the bag you keep.</p>
                </div>
                <div className="card pad">
                  <div className="eyebrow">Your 24-hour push</div>
                  <ul className="perklist" style={{ marginTop: 10 }}>
                    {MEME.pushTiers.map((t) => <li key={t.pct}><Check /><span><b>Send {t.pct}%{t.pct === MEME.pushTiers[MEME.pushTiers.length - 1].pct ? "+" : ""}</b>{t.text}</span></li>)}
                  </ul>
                  <p className="muted" style={{ fontSize: ".8rem", marginTop: 10 }}>We put real effort behind every push, but nobody can promise views, price or volume.</p>
                </div>
                <div className="card pad" style={{ display: "grid", gap: 12 }}>
                  <div className="kv" style={{ padding: 0, borderBottom: 0 }}><span>You pay now</span><b className="mono">{total == null ? "—" : `${formatEther(total)} HYPE + gas`}</b></div>
                  <p className="muted" style={{ fontSize: ".8rem", marginTop: -6 }}>Dev buy {firstBuy >= BigInt(0) ? formatEther(firstBuy) : "—"} HYPE · {lp.name} launch fee {launchFee > BigInt(0) ? `${formatEther(launchFee)} HYPE` : "free"}</p>
                  {!isConnected ? <WalletButton size="lg" /> : (
                    <>
                      <div className="kv" style={{ borderBottom: 0, padding: 0 }}><span className="muted">HYPE on Elysium</span><b className="mono">{bal.data ? Number(formatEther(bal.data.value)).toFixed(4) : "—"}</b></div>
                      {bal.data && total != null && bal.data.value < total && <div className="warn">You need {formatEther(total)} HYPE on Elysium plus gas. <a href={ELYSIUM.bridgeHelp} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>How to bridge ↗</a></div>}
                      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".86rem" }}>
                        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
                        <span className="muted">I&apos;m launching this meme coin myself on Montra. I understand 100% of the trading fees go to holders and that&apos;s fixed at launch, sending EARLY an allocation is my choice and pays for marketing effort (not results), the meme doesn&apos;t use real brands&apos; names or logos or claim any affiliation, nothing here promises returns or price, and Elysium is a new network.</span>
                      </label>
                      <button className="btn primary lg full" onClick={launch} disabled={busy}>{busy ? "Launching…" : `Launch $${f.symbol || "TICKER"} on ${lp.name}`}</button>
                      {busy && <div className="stepper">{STEPS.map(([s, l], i) => <div key={s} className={i < stepIdx ? "done" : i === stepIdx ? "on" : ""}><i>{i < stepIdx ? "✓" : i + 1}</i>{l}</div>)}</div>}
                      {err && <div className="warn">{err}</div>}
                      {!err && !busy && problems.length > 0 && <p className="muted" style={{ fontSize: ".82rem" }}>{problems[0]}</p>}
                    </>
                  )}
                  <p className="muted" style={{ fontSize: ".78rem" }}>Sent to Montra&apos;s factory <a className="mono" href={explorerAddr(MONTRA_FACTORY)} target="_blank" rel="noreferrer">{short(MONTRA_FACTORY)} ↗</a>{MONTRA_BUILDER_CODE ? <> · credited to builder code <span className="mono">{MONTRA_BUILDER_CODE}</span>, which earns EARLY a share of Montra&apos;s own 0.4% (never from holders&apos; fees)</> : null}.</p>
                  <HelpLine />
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      <MemeFeed />
    </>
  );
}

export default function MemePage() {
  return <Suspense fallback={<section className="blk"><div className="empty">Loading…</div></section>}><MemeLaunch /></Suspense>;
}
