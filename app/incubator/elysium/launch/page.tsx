"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatEther, parseEther, parseEventLogs, zeroHash } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../../launchpad/_components/Wallet";
import { useToast } from "../../../launchpad/_components/Toast";
import { BUYBACKS, DEFAULT_FEE, ELYSIUM, FEE_TIERS, LAUNCHPADS, MONTRA_BUILDER_CODE, PARENT, PERKS, SLOTS, explorerAddr } from "../../_lib/config";
import { Bonus, HelpLine } from "../../_components/Bits";
import { LAUNCH_ABI, MONTRA_FACTORY, SNIPE_WINDOWS, ZERO, builderSuffix, incubatorSplit, montra, pickRow, randomSalt, safeLink, short } from "../../_lib/montra";

type Step = "idle" | "switch" | "check" | "upload" | "sign" | "confirm" | "done";
const STEPS: [Step, string][] = [["switch", "Switch to Elysium"], ["check", "Check the launch terms on-chain"], ["upload", "Upload image + details"], ["sign", "Confirm in your wallet"], ["confirm", "Wait for Elysium to confirm"]];
/** Montra's launch fee is 0 today. If it ever jumps above this, the page stops and asks the creator to check first. */
const MAX_LAUNCH_FEE = parseEther("1");
const LINK_FIELDS = [
  ["website", "Website", "Website must be an https:// link."],
  ["twitter", "X", "X link must be an https://x.com/… link."],
  ["telegram", "Telegram", "Telegram link must be an https://t.me/… link."],
  ["discord", "Discord", "Discord link must be an https://discord.gg/… link."],
] as const;

export default function LaunchPage() {
  const router = useRouter();
  const toast = useToast();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const bal = useBalance({ address, chainId: ELYSIUM.chainId, query: { enabled: !!address } });
  const feeRead = useReadContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee", chainId: ELYSIUM.chainId });
  const launchFeeNow = feeRead.data ?? BigInt(0);

  const [f, setF] = useState({ name: "", symbol: "", description: "", website: "", twitter: "", telegram: "", discord: "", firstBuy: "0.01" });
  const [fee, setFee] = useState<number>(DEFAULT_FEE);
  const lp = LAUNCHPADS[0]; // the only launchpad for now; the picker below lists every entry in LAUNCHPADS
  const [snipe, setSnipe] = useState<number>(60);
  const [img, setImg] = useState<File | null>(null);
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const preview = useMemo(() => (img ? URL.createObjectURL(img) : null), [img]);

  const firstBuy = (() => { try { return f.firstBuy.trim() ? parseEther(f.firstBuy.trim()) : BigInt(0); } catch { return BigInt(-1); } })();
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
  const total = firstBuy >= BigInt(0) ? firstBuy + launchFeeNow : null;

  async function launch() {
    setErr("");
    if (!isConnected || !address || !client) return setErr("Connect your wallet first.");
    if (problems.length) return setErr(problems[0]);
    try {
      if (chainId !== ELYSIUM.chainId) { setStep("switch"); await switchChainAsync({ chainId: ELYSIUM.chainId }); }

      // Check the terms before uploading anything: Montra's menu row, then that same row on the contract itself,
      // so a wrong or tampered API answer can never put a different fee into what the creator signs.
      setStep("check");
      const cfg = await montra.config();
      if (cfg.contracts?.factory && cfg.contracts.factory.toLowerCase() !== MONTRA_FACTORY) throw new Error("Montra reports a different factory than this page expects, so we stopped. Message @Tradesgiving.");
      const row = pickRow(cfg.configs, fee, snipe);
      if (!row) throw new Error("Montra doesn't offer that fee + anti-snipe combination right now. Pick another.");
      const [onchain, launchFee, enabled] = await Promise.all([
        client.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "getConfig", args: [BigInt(row.id)] }),
        client.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee" }),
        client.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchEnabled" }),
      ]);
      if (!enabled) throw new Error("Montra has launches paused at the moment. Try again later.");
      const termsMatch = onchain.exists && onchain.enabled && onchain.quote.toLowerCase() === ZERO && onchain.totalFeePips === fee
        && onchain.earlyBuyFeeWindow === snipe && (snipe === 0 || onchain.earlyBuyFeeStartPips > 0);
      if (!termsMatch) throw new Error("Montra's fee menu doesn't match its contract right now, so we stopped before anything was signed. Try again in a few minutes.");
      if (launchFee > MAX_LAUNCH_FEE) throw new Error(`Montra's launch fee is now ${formatEther(launchFee)} HYPE, above this page's safety limit. Message @Tradesgiving before launching.`);

      setStep("upload");
      const fd = new FormData();
      fd.set("image", img!); fd.set("name", f.name.trim()); fd.set("symbol", f.symbol); fd.set("description", f.description.trim());
      for (const [k] of LINK_FIELDS) fd.set(k, f[k].trim());
      const up = await fetch("/api/incubator/metadata", { method: "POST", body: fd });
      const meta = await up.json();
      if (!up.ok) throw new Error(meta.error ?? "Upload failed.");

      const { feeRecipients, feeShares } = incubatorSplit();
      const params = {
        name: f.name.trim(), symbol: f.symbol, metadataURI: meta.metadataUri,
        profile: { logo: meta.imageUri, description: f.description.trim(), socials: { telegram: meta.socials.telegram ?? "", twitter: meta.socials.twitter ?? "", discord: meta.socials.discord ?? "", website: meta.socials.website ?? "", extra: "" } },
        configId: BigInt(row.id), supply: BigInt(0), salt: randomSalt(), feeRecipients, feeShares,
        firstBuyAmount: firstBuy, firstBuyMinOut: BigInt(0),
        permit: { deadline: BigInt(0), v: 0, r: zeroHash, s: zeroHash },
      } as const;
      const value = launchFee + firstBuy;
      const dataSuffix = builderSuffix();
      await client.simulateContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launch", args: [params], account: address, value, dataSuffix });

      setStep("sign");
      const hash = await writeContractAsync({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launch", args: [params], value, dataSuffix, chainId: ELYSIUM.chainId });

      setStep("confirm");
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
      const factoryLogs = receipt.logs.filter((l) => l.address.toLowerCase() === MONTRA_FACTORY);
      const [ev] = parseEventLogs({ abi: LAUNCH_ABI, eventName: "TokenLaunched", logs: factoryLogs });
      if (!ev) throw new Error("Launched, but the receipt had no TokenLaunched event. Check your wallet's activity.");
      setStep("done");
      toast(`$${f.symbol} is live 🚀`);
      router.push(`/incubator/elysium/p/${ev.args.token.toLowerCase()}?new=1`);
    } catch (e) {
      const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Something went wrong.";
      setErr(/rejected|denied/i.test(m) ? "You cancelled in your wallet." : m.slice(0, 260));
      setStep("idle");
    }
  }

  const stepIdx = STEPS.findIndex(([s]) => s === step);
  return (
    <section className="blk" style={{ paddingTop: 36 }}>
      <div className="eyebrow">Launch through EARLY</div>
      <h1 style={{ marginTop: 12, fontSize: "clamp(2.2rem,5vw,3.4rem)" }}>Launch your token</h1>
      <p className="muted" style={{ maxWidth: "60ch", marginTop: 12, fontSize: "1.05rem" }}>One transaction from your wallet. Liquidity is locked forever, the {PARENT} team gets behind you, and every trade funds daily buybacks for your community.</p>

      <div className="grid2" style={{ marginTop: 26 }}>
        <div className="card pad" style={{ display: "grid", gap: 16 }}>
          <div className="field"><span className="flabel">Launchpad &amp; chain</span>
            <div className="lppick">
              {LAUNCHPADS.map((x) => <div key={x.key} className="lpopt"><b>{x.name}</b><small>{x.chain} · gas in {ELYSIUM.gas}</small></div>)}
              <div className="lpopt soon"><small>More launchpads soon</small></div>
            </div>
            <div style={{ marginTop: 8 }}><Bonus lp={lp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "start" }}>
            <label className="upload" style={{ width: 120 }}>
              {preview ? <img src={preview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: ".8rem" }}>Image<br />2 MB max</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
            </label>
            <div style={{ display: "grid", gap: 12 }}>
              <div className="field"><label htmlFor="f-name">Name <span className="req">*</span></label><input id="f-name" className="inp" maxLength={32} value={f.name} onChange={set("name")} placeholder="Agent Smith" /></div>
              <div className="field"><label htmlFor="f-symbol">Ticker <span className="req">*</span></label><input id="f-symbol" className="inp mono" maxLength={10} value={f.symbol} onChange={(e) => setF((s) => ({ ...s, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} placeholder="SMITH" /></div>
            </div>
          </div>
          <div className="field"><label htmlFor="f-desc">What is it?</label><textarea id="f-desc" className="inp" rows={4} maxLength={1000} value={f.description} onChange={set("description")} placeholder="What your project or agent does, in a few sentences. Your launch kit is written from this." /><span className="hint">Fixed forever at launch. Shown on Montra and your project page.</span></div>
          <div className="g2 grid" style={{ gap: 12 }}>
            {LINK_FIELDS.map(([k, label]) => (
              <div key={k} className="field"><label htmlFor={`f-${k}`}>{label}</label><input id={`f-${k}`} type="url" className="inp" value={f[k]} onChange={set(k)} placeholder={{ website: "https://", twitter: "https://x.com/…", telegram: "https://t.me/…", discord: "https://discord.gg/…" }[k]} /></div>
            ))}
          </div>

          <div className="field"><span className="flabel">Trading fee</span>
            <div className="feeopts" role="group" aria-label="Trading fee">
              {FEE_TIERS.map((t) => (
                <button key={t.pips} type="button" aria-pressed={fee === t.pips} className={`feeopt ${fee === t.pips ? "on" : ""}`} onClick={() => setFee(t.pips)}>
                  {"recommended" in t && t.recommended && <span className="rec">Recommended</span>}
                  <span className="pc">{t.label}</span><span className="nm">{t.name}</span><span className="ds">{t.desc}</span>
                </button>
              ))}
            </div>
            <span className="hint">Paid in HYPE on every buy and sell, fixed forever. Montra keeps 0.4% (plus a 0.5–1% liquidity share once a token passes its LP line); the rest funds the buybacks.</span>
          </div>
          <div className="field"><span className="flabel">Anti-snipe</span>
            <div className="chips" role="group" aria-label="Anti-snipe window">{SNIPE_WINDOWS.map((w) => <button key={w.s} type="button" aria-pressed={snipe === w.s} className={`chip ${snipe === w.s ? "on" : ""}`} onClick={() => setSnipe(w.s)}>{w.label}</button>)}</div>
            <span className="hint">Buys in this window start at a 99% fee that falls to your normal fee by the end, so sniping bots pay heavily. Your own first buy is exempt.</span>
          </div>
          <div className="field"><label htmlFor="f-buy">Your first buy (HYPE)</label><input id="f-buy" className="inp mono" value={f.firstBuy} onChange={set("firstBuy")} inputMode="decimal" placeholder="0" /><span className="hint">Optional. Happens in the same transaction, so nobody can buy before you.</span></div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card pad">
            <div className="eyebrow">Where your fees go</div>
            <div className="bar3" style={{ marginTop: 14 }}>{SLOTS.map((s, i) => <i key={s.key} className={["a", "b", "c", "b"][i]} style={{ width: `${s.bps / 100}%` }} />)}</div>
            {SLOTS.map((s) => <div key={s.key} className="kv"><span>{s.name} <a className="mono muted" href={explorerAddr(s.wallet)} target="_blank" rel="noreferrer">{short(s.wallet)} ↗</a></span><b>{s.bps / 100}%</b></div>)}
            <p className="muted" style={{ fontSize: ".82rem", marginTop: 10 }}><b style={{ color: "var(--fg)" }}>You don&apos;t take a cut of trading fees.</b> They all go to these wallets, fixed on-chain at launch. {BUYBACKS}</p>
          </div>

          <div className="card pad" style={{ display: "grid", gap: 12 }}>
            <div className="kv" style={{ padding: 0, borderBottom: 0 }}><span>You pay now</span><b className="mono">{total == null ? "—" : `${formatEther(total)} HYPE + gas`}</b></div>
            <p className="muted" style={{ fontSize: ".8rem", marginTop: -6 }}>First buy {firstBuy >= BigInt(0) ? formatEther(firstBuy) : "—"} HYPE · Montra launch fee {launchFeeNow > BigInt(0) ? `${formatEther(launchFeeNow)} HYPE` : "free"}</p>
            {!isConnected ? <WalletButton size="lg" /> : (
              <>
                <div className="kv" style={{ borderBottom: 0, padding: 0 }}><span className="muted">HYPE on Elysium</span><b className="mono">{bal.data ? Number(formatEther(bal.data.value)).toFixed(4) : "—"}</b></div>
                {bal.data && bal.data.value === BigInt(0) && <div className="warn">You need a little HYPE on Elysium for gas{firstBuy > BigInt(0) ? " and your first buy" : ""}. <a href={ELYSIUM.bridgeHelp} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>How to bridge ↗</a></div>}
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".86rem" }}>
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
                  <span className="muted">I&apos;m launching this token myself on Montra. I understand I receive none of the trading fees, the split is fixed at launch, reward amounts depend on trading, Builder Fund unlocks are at EARLY&apos;s discretion, nothing here promises returns or price, and Elysium is a new network.</span>
                </label>
                <button className="btn primary lg full" onClick={launch} disabled={busy}>{busy ? "Launching…" : `Launch $${f.symbol || "TICKER"}`}</button>
                {busy && <div className="stepper">{STEPS.map(([s, l], i) => <div key={s} className={i < stepIdx ? "done" : i === stepIdx ? "on" : ""}><i>{i < stepIdx ? "✓" : i + 1}</i>{l}</div>)}</div>}
                {err && <div className="warn">{err}</div>}
                {!err && !busy && problems.length > 0 && <p className="muted" style={{ fontSize: ".82rem" }}>{problems[0]}</p>}
              </>
            )}
            <p className="muted" style={{ fontSize: ".78rem" }}>Sent to Montra&apos;s factory <a className="mono" href={explorerAddr(MONTRA_FACTORY)} target="_blank" rel="noreferrer">{short(MONTRA_FACTORY)} ↗</a>{MONTRA_BUILDER_CODE ? <> · credited to builder code <span className="mono">{MONTRA_BUILDER_CODE}</span>, which earns EARLY a share of Montra&apos;s own 0.4% (never from your fees)</> : null}.</p>
            <HelpLine />
          </div>
          <div className="card pad">
            <div className="eyebrow">You get</div>
            <ul className="perklist">
              {[...PERKS, { title: "A launch kit and a directory spot", text: "Ready-to-post launch post, thread, welcome, FAQ and first-week plan, plus a listing in the EARLY directory." }].map((p) => (
                <li key={p.title}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span><b>{p.title}</b>{p.text}</span></li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
