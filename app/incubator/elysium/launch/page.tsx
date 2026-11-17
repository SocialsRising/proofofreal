"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatEther, parseEther, parseEventLogs, zeroHash } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../../launchpad/_components/Wallet";
import { useToast } from "../../../launchpad/_components/Toast";
import { BUYBACKS, DEFAULT_FEE_PCT, ELYSIUM, FEE_TIERS, LAUNCHPADS, MONTRA_BUILDER_CODE, PARENT, PERKS, SLOTS, VOLTA_CREATOR, explorerAddr, launchpad, type LaunchpadKey } from "../../_lib/config";
import { Bonus, HelpLine } from "../../_components/Bits";
import { LAUNCH_ABI, MONTRA_FACTORY, SNIPE_WINDOWS, ZERO, builderSuffix, incubatorSplit, montra, pickRow, randomSalt, safeLink, short } from "../../_lib/montra";
import { VOLTA_ABI, VOLTA_PM } from "../../_lib/volta";

type Step = "idle" | "switch" | "check" | "upload" | "sign" | "confirm" | "done";
const STEPS: [Step, string][] = [["switch", "Switch to Elysium"], ["check", "Check the launch terms on-chain"], ["upload", "Upload image + details"], ["sign", "Confirm in your wallet"], ["confirm", "Wait for Elysium to confirm"]];
/** Both launchpads charge no launch fee today. If one ever jumps above this, the page stops and asks the creator to check first. */
const MAX_LAUNCH_FEE = parseEther("1");
const LINK_FIELDS = [
  ["website", "Website", "Website must be an https:// link."],
  ["twitter", "X", "X link must be an https://x.com/… link."],
  ["telegram", "Telegram", "Telegram link must be an https://t.me/… link."],
  ["discord", "Discord", "Discord link must be an https://discord.gg/… link."],
] as const;
const Check = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function LaunchPage() {
  const router = useRouter();
  const toast = useToast();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const bal = useBalance({ address, chainId: ELYSIUM.chainId, query: { enabled: !!address } });
  const montraFee = useReadContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee", chainId: ELYSIUM.chainId }).data ?? BigInt(0);
  const voltaFee = useReadContract({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "getFlaunchingFee", args: ["0x"], chainId: ELYSIUM.chainId }).data ?? BigInt(0);

  const [lpKey, setLpKey] = useState<LaunchpadKey>("montra");
  const lp = launchpad(lpKey);
  const isVolta = lpKey === "volta";
  const [f, setF] = useState({ name: "", symbol: "", description: "", website: "", twitter: "", telegram: "", discord: "", firstBuy: "0.01" });
  const [feePct, setFeePct] = useState<number>(DEFAULT_FEE_PCT);
  const [snipe, setSnipe] = useState<number>(60);
  const [img, setImg] = useState<File | null>(null);
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const preview = useMemo(() => (img ? URL.createObjectURL(img) : null), [img]);

  /** Switching launchpad keeps the choices valid for it (Volta allows fees up to 5% and anti-snipe up to 15 minutes). */
  function pickLaunchpad(k: LaunchpadKey) {
    const next = launchpad(k);
    setLpKey(k); setErr("");
    if (!next.fees.includes(feePct)) setFeePct(DEFAULT_FEE_PCT);
    if (!next.snipe.includes(snipe)) setSnipe(Math.max(...next.snipe.filter((s) => s <= snipe)));
  }

  // Volta launches through EARLY skip the dev buy: its tokens would go to the creator-NFT holder (EARLY's wallet), not the creator.
  const firstBuy = isVolta ? BigInt(0) : (() => { try { return f.firstBuy.trim() ? parseEther(f.firstBuy.trim()) : BigInt(0); } catch { return BigInt(-1); } })();
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
  const launchFeeNow = isVolta ? voltaFee : montraFee;
  const total = firstBuy >= BigInt(0) ? firstBuy + launchFeeNow : null;

  /** Image + details → Montra's metadata service (via our route). Returns the image and document URIs. */
  async function upload() {
    setStep("upload");
    const fd = new FormData();
    fd.set("image", img!); fd.set("name", f.name.trim()); fd.set("symbol", f.symbol); fd.set("description", f.description.trim());
    for (const [k] of LINK_FIELDS) fd.set(k, f[k].trim());
    const up = await fetch("/api/incubator/metadata", { method: "POST", body: fd });
    const meta = await up.json();
    if (!up.ok) throw new Error(meta.error ?? "Upload failed.");
    return meta as { imageUri: string; metadataUri: string; socials: Record<string, string> };
  }

  async function launchMontra(from: `0x${string}`) {
    const c = client!;
    // Check the terms before uploading anything: Montra's menu row, then that same row on the contract itself,
    // so a wrong or tampered API answer can never put a different fee into what the creator signs.
    setStep("check");
    const fee = feePct * 10000;
    const cfg = await montra.config();
    if (cfg.contracts?.factory && cfg.contracts.factory.toLowerCase() !== MONTRA_FACTORY) throw new Error("Montra reports a different factory than this page expects, so we stopped. Message @Tradesgiving.");
    const row = pickRow(cfg.configs, fee, snipe);
    if (!row) throw new Error("Montra doesn't offer that fee + anti-snipe combination right now. Pick another.");
    const [onchain, launchFee, enabled] = await Promise.all([
      c.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "getConfig", args: [BigInt(row.id)] }),
      c.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee" }),
      c.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchEnabled" }),
    ]);
    if (!enabled) throw new Error("Montra has launches paused at the moment. Try again later.");
    const termsMatch = onchain.exists && onchain.enabled && onchain.quote.toLowerCase() === ZERO && onchain.totalFeePips === fee
      && onchain.earlyBuyFeeWindow === snipe && (snipe === 0 || onchain.earlyBuyFeeStartPips > 0);
    if (!termsMatch) throw new Error("Montra's fee menu doesn't match its contract right now, so we stopped before anything was signed. Try again in a few minutes.");
    if (launchFee > MAX_LAUNCH_FEE) throw new Error(`Montra's launch fee is now ${formatEther(launchFee)} HYPE, above this page's safety limit. Message @Tradesgiving before launching.`);

    const meta = await upload();
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
    await c.simulateContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launch", args: [params], account: from, value, dataSuffix });

    setStep("sign");
    const hash = await writeContractAsync({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launch", args: [params], value, dataSuffix, chainId: ELYSIUM.chainId });
    setStep("confirm");
    const receipt = await c.waitForTransactionReceipt({ hash, timeout: 180_000 });
    const [ev] = parseEventLogs({ abi: LAUNCH_ABI, eventName: "TokenLaunched", logs: receipt.logs.filter((l) => l.address.toLowerCase() === MONTRA_FACTORY) });
    if (!ev) throw new Error("Launched, but the receipt had no TokenLaunched event. Check your wallet's activity.");
    return ev.args.token;
  }

  async function launchVolta(from: `0x${string}`) {
    const c = client!;
    // Volta's own limits, read from its contract before anything is uploaded or signed.
    setStep("check");
    const swapFee = feePct * 100;
    const [flaunchFee, minFee, maxFee, snipeFee, maxSnipe] = await Promise.all([
      c.readContract({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "getFlaunchingFee", args: ["0x"] }),
      c.readContract({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "MIN_SWAP_FEE" }),
      c.readContract({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "MAX_SWAP_FEE" }),
      c.readContract({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "MAX_ANTI_SNIPE_FEE" }),
      c.readContract({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "MAX_ANTI_SNIPE_DURATION" }),
    ]);
    if (swapFee < minFee || swapFee > maxFee) throw new Error(`Volta doesn't allow a ${feePct}% fee right now. Pick another.`);
    if (snipe > maxSnipe) throw new Error("Volta doesn't allow that anti-snipe window right now. Pick a shorter one.");
    if (flaunchFee > MAX_LAUNCH_FEE) throw new Error(`Volta's launch fee is now ${formatEther(flaunchFee)} HYPE, above this page's safety limit. Message @Tradesgiving before launching.`);

    const meta = await upload();
    const params = {
      name: f.name.trim(), symbol: f.symbol, tokenUri: meta.metadataUri, premineAmount: BigInt(0),
      creator: VOLTA_CREATOR, swapFee, creatorSplit: { creator: 10000, buyback: 0, holders: 0 },
      antiSnipe: snipe ? { startFee: snipeFee, duration: snipe } : { startFee: 0, duration: 0 },
      flaunchAt: BigInt(0), initialPriceParams: "0x", pairedToken: ZERO,
    } as const;
    await c.simulateContract({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "flaunch", args: [params], account: from, value: flaunchFee });

    setStep("sign");
    const hash = await writeContractAsync({ address: VOLTA_PM, abi: VOLTA_ABI, functionName: "flaunch", args: [params], value: flaunchFee, chainId: ELYSIUM.chainId });
    setStep("confirm");
    const receipt = await c.waitForTransactionReceipt({ hash, timeout: 180_000 });
    const [ev] = parseEventLogs({ abi: VOLTA_ABI, eventName: "PoolCreated", logs: receipt.logs.filter((l) => l.address.toLowerCase() === VOLTA_PM) });
    if (!ev) throw new Error("Launched, but the receipt had no PoolCreated event. Check your wallet's activity.");
    return ev.args._memecoin;
  }

  async function launch() {
    setErr("");
    if (!isConnected || !address || !client) return setErr("Connect your wallet first.");
    if (problems.length) return setErr(problems[0]);
    try {
      if (chainId !== ELYSIUM.chainId) { setStep("switch"); await switchChainAsync({ chainId: ELYSIUM.chainId }); }
      const token = isVolta ? await launchVolta(address) : await launchMontra(address);
      setStep("done");
      toast(`$${f.symbol} is live 🚀`);
      router.push(`/incubator/elysium/p/${token.toLowerCase()}?new=1`);
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
            <div className="lppick" role="group" aria-label="Launchpad">
              {LAUNCHPADS.map((x) => (
                <button key={x.key} type="button" aria-pressed={x.key === lpKey} className={`lpopt ${x.key === lpKey ? "on" : ""}`} onClick={() => pickLaunchpad(x.key)} disabled={busy}>
                  <b>{x.name}</b><small>{x.chain} · gas in {ELYSIUM.gas}</small>
                </button>
              ))}
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
          <div className="field"><label htmlFor="f-desc">What is it?</label><textarea id="f-desc" className="inp" rows={4} maxLength={1000} value={f.description} onChange={set("description")} placeholder="What your project or agent does, in a few sentences. Your launch kit is written from this." /><span className="hint">Fixed forever at launch. Shown on {lp.name} and your project page.</span></div>
          <div className="g2 grid" style={{ gap: 12 }}>
            {LINK_FIELDS.map(([k, label]) => (
              <div key={k} className="field"><label htmlFor={`f-${k}`}>{label}</label><input id={`f-${k}`} type="url" className="inp" value={f[k]} onChange={set(k)} placeholder={{ website: "https://", twitter: "https://x.com/…", telegram: "https://t.me/…", discord: "https://discord.gg/…" }[k]} /></div>
            ))}
          </div>

          <div className="field"><span className="flabel">Trading fee</span>
            <div className="feeopts" role="group" aria-label="Trading fee">
              {FEE_TIERS.filter((t) => lp.fees.includes(t.pct)).map((t) => (
                <button key={t.pct} type="button" aria-pressed={feePct === t.pct} className={`feeopt ${feePct === t.pct ? "on" : ""}`} onClick={() => setFeePct(t.pct)}>
                  {"recommended" in t && t.recommended && <span className="rec">Recommended</span>}
                  <span className="pc">{t.label}</span><span className="nm">{t.name}</span><span className="ds">{t.desc}</span>
                </button>
              ))}
            </div>
            <span className="hint">{isVolta
              ? "Paid in HYPE on every buy and sell, fixed forever. Volta keeps 30%; the other 70% funds the buybacks."
              : "Paid in HYPE on every buy and sell, fixed forever. Montra keeps 0.4% (plus a 0.5–1% liquidity share once a token passes its LP line); the rest funds the buybacks."}</span>
          </div>
          <div className="field"><span className="flabel">Anti-snipe</span>
            <div className="chips" role="group" aria-label="Anti-snipe window">{SNIPE_WINDOWS.filter((w) => lp.snipe.includes(w.s)).map((w) => <button key={w.s} type="button" aria-pressed={snipe === w.s} className={`chip ${snipe === w.s ? "on" : ""}`} onClick={() => setSnipe(w.s)}>{w.label}</button>)}</div>
            <span className="hint">{isVolta
              ? "Buys in this window start at a 30% fee that falls to your normal fee by the end; what bots pay above your fee is burned."
              : "Buys in this window start at a 99% fee that falls to your normal fee by the end, so sniping bots pay heavily. Your own first buy is exempt."}</span>
          </div>
          {isVolta
            ? <div className="note">No dev buy on Volta: EARLY&apos;s community wallet holds your token&apos;s creator NFT, and Volta sends dev-buy tokens to that wallet, not to you. Anti-snipe keeps bots out instead.</div>
            : <div className="field"><label htmlFor="f-buy">Your first buy (HYPE)</label><input id="f-buy" className="inp mono" value={f.firstBuy} onChange={set("firstBuy")} inputMode="decimal" placeholder="0" /><span className="hint">Optional. Happens in the same transaction, so nobody can buy before you.</span></div>}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card pad">
            <div className="eyebrow">Where your fees go</div>
            {isVolta ? (
              <>
                <div className="kv" style={{ marginTop: 10 }}><span>EARLY community wallet (holds the creator NFT) <a className="mono muted" href={explorerAddr(VOLTA_CREATOR)} target="_blank" rel="noreferrer">{short(VOLTA_CREATOR)} ↗</a></span><b>70%</b></div>
                <div className="kv"><span>Volta protocol</span><b>30%</b></div>
                <p className="muted" style={{ fontSize: ".82rem", marginTop: 10 }}>EARLY splits its 70% the same way as every incubated project: {SLOTS.map((s) => `${s.bps / 100}% ${s.name}`).join(", ")}. <b style={{ color: "var(--fg)" }}>You don&apos;t take a cut of trading fees.</b> {BUYBACKS}</p>
              </>
            ) : (
              <>
                <div className="bar3" style={{ marginTop: 14 }}>{SLOTS.map((s, i) => <i key={s.key} className={["a", "b", "c", "b"][i]} style={{ width: `${s.bps / 100}%` }} />)}</div>
                {SLOTS.map((s) => <div key={s.key} className="kv"><span>{s.name} <a className="mono muted" href={explorerAddr(s.wallet)} target="_blank" rel="noreferrer">{short(s.wallet)} ↗</a></span><b>{s.bps / 100}%</b></div>)}
                <p className="muted" style={{ fontSize: ".82rem", marginTop: 10 }}><b style={{ color: "var(--fg)" }}>You don&apos;t take a cut of trading fees.</b> They all go to these wallets, fixed on-chain at launch. {BUYBACKS}</p>
              </>
            )}
          </div>

          <div className="card pad" style={{ display: "grid", gap: 12 }}>
            <div className="kv" style={{ padding: 0, borderBottom: 0 }}><span>You pay now</span><b className="mono">{total == null ? "—" : `${formatEther(total)} HYPE + gas`}</b></div>
            <p className="muted" style={{ fontSize: ".8rem", marginTop: -6 }}>{isVolta ? "" : `First buy ${firstBuy >= BigInt(0) ? formatEther(firstBuy) : "—"} HYPE · `}{lp.name} launch fee {launchFeeNow > BigInt(0) ? `${formatEther(launchFeeNow)} HYPE` : "free"}</p>
            {!isConnected ? <WalletButton size="lg" /> : (
              <>
                <div className="kv" style={{ borderBottom: 0, padding: 0 }}><span className="muted">HYPE on Elysium</span><b className="mono">{bal.data ? Number(formatEther(bal.data.value)).toFixed(4) : "—"}</b></div>
                {bal.data && bal.data.value === BigInt(0) && <div className="warn">You need a little HYPE on Elysium for gas{firstBuy > BigInt(0) ? " and your first buy" : ""}. <a href={ELYSIUM.bridgeHelp} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>How to bridge ↗</a></div>}
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".86rem" }}>
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
                  <span className="muted">{isVolta
                    ? <>I&apos;m launching this token myself on Volta. I understand EARLY&apos;s community wallet receives the creator NFT and all creator-side fees, I receive none of the trading fees, this is fixed at launch, reward amounts depend on trading, Builder Fund unlocks are at EARLY&apos;s discretion, nothing here promises returns or price, and Elysium is a new network.</>
                    : <>I&apos;m launching this token myself on Montra. I understand I receive none of the trading fees, the split is fixed at launch, reward amounts depend on trading, Builder Fund unlocks are at EARLY&apos;s discretion, nothing here promises returns or price, and Elysium is a new network.</>}</span>
                </label>
                <button className="btn primary lg full" onClick={launch} disabled={busy}>{busy ? "Launching…" : `Launch $${f.symbol || "TICKER"} on ${lp.name}`}</button>
                {busy && <div className="stepper">{STEPS.map(([s, l], i) => <div key={s} className={i < stepIdx ? "done" : i === stepIdx ? "on" : ""}><i>{i < stepIdx ? "✓" : i + 1}</i>{l}</div>)}</div>}
                {err && <div className="warn">{err}</div>}
                {!err && !busy && problems.length > 0 && <p className="muted" style={{ fontSize: ".82rem" }}>{problems[0]}</p>}
              </>
            )}
            <p className="muted" style={{ fontSize: ".78rem" }}>{isVolta
              ? <>Sent to Volta&apos;s launch contract <a className="mono" href={explorerAddr(VOLTA_PM)} target="_blank" rel="noreferrer">{short(VOLTA_PM)} ↗</a>.</>
              : <>Sent to Montra&apos;s factory <a className="mono" href={explorerAddr(MONTRA_FACTORY)} target="_blank" rel="noreferrer">{short(MONTRA_FACTORY)} ↗</a>{MONTRA_BUILDER_CODE ? <> · credited to builder code <span className="mono">{MONTRA_BUILDER_CODE}</span>, which earns EARLY a share of Montra&apos;s own 0.4% (never from your fees)</> : null}.</>}</p>
            <HelpLine />
          </div>
          <div className="card pad">
            <div className="eyebrow">You get</div>
            <ul className="perklist">
              {[...PERKS, { title: "A launch kit and a directory spot", text: "Ready-to-post launch post, thread, welcome, FAQ and first-week plan, plus a listing in the EARLY directory." }].map((p) => (
                <li key={p.title}><Check /><span><b>{p.title}</b>{p.text}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
