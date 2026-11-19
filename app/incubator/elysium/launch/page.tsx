"use client";
/* Launch on Montra with one of two templates:
   - Utility: the creator side of every fee is split 60/20/20 to EARLY's three public wallets and funds buybacks.
   - Meme: the creator side goes 100% to holders; afterwards the creator sends EARLY 2%+ of supply for a 24h push. */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../../launchpad/_components/Wallet";
import { useToast } from "../../../launchpad/_components/Toast";
import Link from "next/link";
import { BUYBACKS, DEFAULT_FEE_PCT, ELYSIUM, FEE_TIERS, LINKS, MEME, MONTRA_BUILDER_CODE, PERKS, SLOTS, explorerAddr, launchpad } from "../../_lib/config";
import { Bonus, HelpLine } from "../../_components/Bits";
import { MemeFeed, MemeNextSteps, fmtPct } from "../../_components/Meme";
import { LAUNCH_ABI, MONTRA_FACTORY, SNIPE_WINDOWS, ZERO, incubatorSplit, isAddr, montra, safeLink, short } from "../../_lib/montra";
import { launchedToken, prepareMontraLaunch } from "../../_lib/montraLaunch";

type Template = "utility" | "meme";
type Step = "idle" | "switch" | "check" | "upload" | "sign" | "confirm" | "done";
const STEPS: [Step, string][] = [["switch", "Switch to Elysium"], ["check", "Check the launch terms on-chain"], ["upload", "Upload image + details"], ["sign", "Confirm in your wallet"], ["confirm", "Wait for Elysium to confirm"]];
const TEMPLATES: { key: Template; name: string; sub: string }[] = [
  { key: "utility", name: "Utility", sub: "Fees fund buybacks for your community" },
  { key: "meme", name: "Meme", sub: "Fees go to holders, plus a 24h push" },
];
const LINK_FIELDS = [
  ["website", "Website", "Website must be an https:// link."],
  ["twitter", "X", "X link must be an https://x.com/… link."],
  ["telegram", "Telegram", "Telegram link must be an https://t.me/… link."],
  ["discord", "Discord", "Discord link must be an https://discord.gg/… link."],
] as const;
const lp = launchpad("montra");
const SNIPES = SNIPE_WINDOWS.filter((w) => lp.snipe.includes(w.s));
const UTILITY_FIRST_BUY = "0.01";
const Check = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Launch() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const bal = useBalance({ address, chainId: ELYSIUM.chainId, query: { enabled: !!address } });
  const launchFee = useReadContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee", chainId: ELYSIUM.chainId }).data ?? BigInt(0);

  const [tpl, setTpl] = useState<Template>(params.get("template") === "meme" ? "meme" : "utility");
  const isMeme = tpl === "meme";
  const [f, setF] = useState({ name: "", symbol: "", description: "", website: "", twitter: "", telegram: "", discord: "", firstBuy: isMeme ? MEME.defaultFirstBuy : UTILITY_FIRST_BUY });
  const [feePct, setFeePct] = useState<number>(isMeme ? MEME.defaultFee : DEFAULT_FEE_PCT);
  const [snipe, setSnipe] = useState<number>(60);
  const [img, setImg] = useState<File | null>(null);
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [err, setErr] = useState("");
  const [launched, setLaunched] = useState<{ token: `0x${string}`; firstBuyOut: bigint } | null>(null);
  const [opening, setOpening] = useState<number | null>(null); // opening market cap in HYPE, for the dev-buy estimate
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const preview = useMemo(() => (img ? URL.createObjectURL(img) : null), [img]);
  useEffect(() => {
    montra.config().then((c) => { const o = Number((c.configs.find((x) => x.quote === ZERO) as { opening?: string } | undefined)?.opening) / 1e18; if (o > 0) setOpening(o); }).catch(() => {});
  }, []);

  function pickTemplate(k: Template) {
    if (k === tpl) return;
    setTpl(k); setErr(""); setAck(false); setLaunched(null);
    setFeePct(k === "meme" ? MEME.defaultFee : DEFAULT_FEE_PCT);
    setF((s) => ({ ...s, firstBuy: k === "meme" ? MEME.defaultFirstBuy : UTILITY_FIRST_BUY }));
    router.replace(`/incubator/elysium/launch${k === "meme" ? "?template=meme" : ""}`, { scroll: false });
  }

  const fees = isMeme ? MEME.fees.map((t) => ({ pct: t.pct, name: t.name, desc: t.desc, rec: "recommended" in t && !!t.recommended }))
    : FEE_TIERS.filter((t) => lp.fees.includes(t.pct)).map((t) => ({ pct: t.pct, name: t.name, desc: t.desc, rec: "recommended" in t && !!t.recommended }));
  const firstBuy = (() => { try { return f.firstBuy.trim() ? parseEther(f.firstBuy.trim()) : BigInt(0); } catch { return BigInt(-1); } })();
  // About what share of supply a dev buy gets at the opening price, after the fee. A rough guide, not a quote.
  const estPct = (h: number) => (opening && h > 0 ? (100 * h * (1 - feePct / 100)) / (opening + h * (1 - feePct / 100)) : null);
  const est = firstBuy > BigInt(0) ? estPct(Number(formatEther(firstBuy))) : null;
  const problems = [
    !f.name.trim() && "Add a name.",
    !/^[A-Z0-9]{2,10}$/.test(f.symbol) && "Ticker: 2–10 letters or numbers.",
    !img && "Add an image (PNG, JPEG, WebP or GIF, 2 MB max).",
    img && img.size > 2 * 1024 * 1024 && "Image must be 2 MB or smaller.",
    firstBuy < BigInt(0) && "Dev buy must be a number (in HYPE).",
    ...LINK_FIELDS.map(([k, , msg]) => f[k].trim() && !safeLink(f[k].trim(), k) && msg),
    !ack && "Tick the box to confirm.",
  ].filter(Boolean) as string[];
  const busy = step !== "idle" && step !== "done";
  const total = firstBuy >= BigInt(0) ? firstBuy + launchFee : null;

  async function upload() {
    const fd = new FormData();
    fd.set("launchpad", "montra"); fd.set("image", img!); fd.set("name", f.name.trim()); fd.set("symbol", f.symbol); fd.set("description", f.description.trim());
    for (const [k] of LINK_FIELDS) fd.set(k, f[k].trim());
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
        name: f.name.trim(), symbol: f.symbol, description: f.description.trim(), feePct, snipe, firstBuy,
        fees: isMeme ? { feeRecipients: [MEME.holders], feeShares: [10000] } : incubatorSplit(), upload, onStep: setStep,
      });
      setStep("sign");
      const hash = await writeContractAsync({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launch", ...call, chainId: ELYSIUM.chainId });
      setStep("confirm");
      const { token, firstBuyOut } = launchedToken(await client.waitForTransactionReceipt({ hash, timeout: 180_000 }));
      setStep("done");
      toast(`$${f.symbol} is live 🚀`);
      if (isMeme) {
        setLaunched({ token, firstBuyOut });
        router.replace(`/incubator/elysium/launch?template=meme&token=${token.toLowerCase()}`, { scroll: false });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else router.push(`/incubator/elysium/p/${token.toLowerCase()}?new=1`);
    } catch (e) {
      const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Something went wrong.";
      setErr(/rejected|denied/i.test(m) ? "You cancelled in your wallet." : m.slice(0, 260));
      setStep("idle");
    }
  }

  const paramToken = params.get("token") ?? "";
  const memeDone = isMeme ? (launched?.token ?? (isAddr(paramToken) ? (paramToken.toLowerCase() as `0x${string}`) : null)) : null;
  const stepIdx = STEPS.findIndex(([s]) => s === step);
  return (
    <>
      <section className="blk" style={{ paddingTop: 36 }}>
        <div className="eyebrow">Launch on {lp.name} · {lp.chain}</div>
        <h1 style={{ marginTop: 12, fontSize: "clamp(2.2rem,5vw,3.4rem)" }}>Launch your token</h1>
        <div className="tplpick" role="group" aria-label="Template">
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" aria-pressed={tpl === t.key} className={`tplopt ${tpl === t.key ? "on" : ""}`} onClick={() => pickTemplate(t.key)} disabled={busy}>
              <b>{t.name}</b><small>{t.sub}</small>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, maxWidth: 760 }}><Bonus lp={lp} /></div>

        {memeDone ? <div style={{ marginTop: 24 }}><MemeNextSteps token={memeDone} firstBuyOut={launched?.firstBuyOut} /></div> : (
          <>
            {isMeme && (
              <div className="memehot">
                {MEME.ideas.map((i) => (
                  <div key={i.theme} className="hot"><span className="hot-tag">🔥 Trending</span><span className="hot-emoji" aria-hidden>{i.emoji}</span><b>{i.theme}</b><p>{i.hook}</p></div>
                ))}
              </div>
            )}

            <div className="grid2" style={{ marginTop: 22 }}>
              <div className="card pad" style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "start" }}>
                  <label className="upload" style={{ width: 120 }}>
                    {preview ? <img src={preview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: ".8rem" }}>Image<br />2 MB max</span>}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
                  </label>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div className="field"><label htmlFor="f-name">Name <span className="req">*</span></label><input id="f-name" className="inp" maxLength={32} value={f.name} onChange={set("name")} placeholder={isMeme ? "Wanted Level" : "Agent Smith"} /></div>
                    <div className="field"><label htmlFor="f-symbol">Ticker <span className="req">*</span></label><input id="f-symbol" className="inp mono" maxLength={10} value={f.symbol} onChange={(e) => setF((s) => ({ ...s, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} placeholder={isMeme ? "WANTED" : "SMITH"} /></div>
                  </div>
                </div>
                <div className="field"><label htmlFor="f-desc">{isMeme ? "The meme" : "What is it?"}</label><textarea id="f-desc" className="inp" rows={isMeme ? 3 : 4} maxLength={1000} value={f.description} onChange={set("description")} placeholder={isMeme ? "The joke in a sentence or two." : "What your project or agent does, in a few sentences."} /><span className="hint">Fixed forever at launch.</span></div>
                <div className="g2 grid" style={{ gap: 12 }}>
                  {LINK_FIELDS.map(([k, label]) => (
                    <div key={k} className="field"><label htmlFor={`f-${k}`}>{label}</label><input id={`f-${k}`} type="url" className="inp" value={f[k]} onChange={set(k)} placeholder={{ website: "https://", twitter: "https://x.com/…", telegram: "https://t.me/…", discord: "https://discord.gg/…" }[k]} /></div>
                  ))}
                </div>

                <div className="field"><span className="flabel">Trading fee{isMeme ? " · 100% to holders" : ""}</span>
                  <div className="feeopts" role="group" aria-label="Trading fee">
                    {fees.map((t) => (
                      <button key={t.pct} type="button" aria-pressed={feePct === t.pct} className={`feeopt ${feePct === t.pct ? "on" : ""}`} onClick={() => setFeePct(t.pct)}>
                        {t.rec && <span className="rec">Recommended</span>}
                        <span className="pc">{t.pct}%</span><span className="nm">{t.name}</span><span className="ds">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                  <span className="hint">Fixed forever. Montra keeps 0.4%; {isMeme ? "the rest streams to holders every hour, you included." : "the rest funds the buybacks."}</span>
                </div>
                <div className="field"><span className="flabel">Anti-snipe</span>
                  <div className="chips" role="group" aria-label="Anti-snipe window">{SNIPES.map((w) => <button key={w.s} type="button" aria-pressed={snipe === w.s} className={`chip ${snipe === w.s ? "on" : ""}`} onClick={() => setSnipe(w.s)}>{w.label}</button>)}</div>
                  <span className="hint">Bots pay up to 99% during this window. Your dev buy is exempt.</span>
                </div>
                <div className="field"><label htmlFor="f-buy">Dev buy (HYPE)</label>
                  {isMeme && <div className="chips" role="group" aria-label="Dev buy" style={{ marginBottom: 8 }}>{MEME.firstBuyPresets.map((p) => <button key={p} type="button" aria-pressed={f.firstBuy === p} className={`chip ${f.firstBuy === p ? "on" : ""}`} onClick={() => setF((s) => ({ ...s, firstBuy: p }))}>{p} HYPE{estPct(Number(p)) != null ? ` · ~${fmtPct(estPct(Number(p))!)}%` : ""}</button>)}</div>}
                  <input id="f-buy" className="inp mono" value={f.firstBuy} onChange={set("firstBuy")} inputMode="decimal" placeholder={isMeme ? "Custom amount" : "0"} />
                  <span className="hint">{isMeme ? `Same transaction, before anyone else.${est != null ? ` About ${fmtPct(est)}% of supply.` : ""}` : "Optional. Same transaction, before anyone else."}</span>
                  {isMeme && est != null && est < MEME.minAllocPct && <div className="warn" style={{ marginTop: 8 }}>That&apos;s under {MEME.minAllocPct}% of supply, not enough to send EARLY its allocation.</div>}
                </div>
              </div>

              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div className="card pad">
                  <div className="eyebrow">Where your fees go</div>
                  {isMeme ? (
                    <>
                      <div className="bar3" style={{ marginTop: 14 }}><i className="a" style={{ width: "100%" }} /></div>
                      <div className="kv"><span>Token holders, in HYPE every hour</span><b>100%</b></div>
                    </>
                  ) : (
                    <>
                      <div className="bar3" style={{ marginTop: 14 }}>{SLOTS.map((s, i) => <i key={s.key} className={["a", "b", "c", "b"][i]} style={{ width: `${s.bps / 100}%` }} />)}</div>
                      {SLOTS.map((s) => <div key={s.key} className="kv"><span>{s.name} <a className="mono muted" href={explorerAddr(s.wallet)} target="_blank" rel="noreferrer">{short(s.wallet)} ↗</a></span><b>{s.bps / 100}%</b></div>)}
                      <p className="muted" style={{ fontSize: ".82rem", marginTop: 10 }}>You don&apos;t take a cut. {BUYBACKS}</p>
                    </>
                  )}
                </div>

                {isMeme && (
                  <div className="card pad">
                    <div className="eyebrow">After launch: send EARLY {MEME.minAllocPct}%+, get a 24h push</div>
                    <ul className="perklist" style={{ marginTop: 10 }}>
                      {MEME.pushTiers.map((t, i) => <li key={t.pct}><Check /><span><b>{t.pct}%{i === MEME.pushTiers.length - 1 ? "+" : ""}</b>{t.text}</span></li>)}
                    </ul>
                    <Link className="birdsbonus" href={LINKS.earlyBirds}><img src="/olympus/gods/early-birds.webp" alt="" width={40} height={40} /><span><b>Bonus: Early Birds NFT rewards</b>{MEME.birdsBonus}</span></Link>
                  </div>
                )}

                <div className="card pad" style={{ display: "grid", gap: 12 }}>
                  <div className="kv" style={{ padding: 0, borderBottom: 0 }}><span>You pay now</span><b className="mono">{total == null ? "—" : `${formatEther(total)} HYPE + gas`}</b></div>
                  {!isConnected ? <WalletButton size="lg" /> : (
                    <>
                      <div className="kv" style={{ borderBottom: 0, padding: 0 }}><span className="muted">HYPE on Elysium</span><b className="mono">{bal.data ? Number(formatEther(bal.data.value)).toFixed(4) : "—"}</b></div>
                      {bal.data && total != null && bal.data.value < total && <div className="warn">Not enough HYPE on Elysium. <a href={ELYSIUM.bridgeHelp} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>How to bridge ↗</a></div>}
                      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".86rem" }}>
                        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
                        <span className="muted">{isMeme
                          ? <>I&apos;m launching this myself. 100% of fees go to holders, fixed at launch. EARLY&apos;s allocation pays for marketing effort, not results. Nothing here promises returns.</>
                          : <>I&apos;m launching this myself. I get none of the trading fees and the split is fixed at launch. Rewards depend on trading. Nothing here promises returns.</>}</span>
                      </label>
                      <button className="btn primary lg full" onClick={launch} disabled={busy}>{busy ? "Launching…" : `Launch $${f.symbol || "TICKER"}`}</button>
                      {busy && <div className="stepper">{STEPS.map(([s, l], i) => <div key={s} className={i < stepIdx ? "done" : i === stepIdx ? "on" : ""}><i>{i < stepIdx ? "✓" : i + 1}</i>{l}</div>)}</div>}
                      {err && <div className="warn">{err}</div>}
                      {!err && !busy && problems.length > 0 && <p className="muted" style={{ fontSize: ".82rem" }}>{problems[0]}</p>}
                    </>
                  )}
                  <p className="muted" style={{ fontSize: ".78rem" }}>Sent to Montra&apos;s factory <a className="mono" href={explorerAddr(MONTRA_FACTORY)} target="_blank" rel="noreferrer">{short(MONTRA_FACTORY)} ↗</a>{MONTRA_BUILDER_CODE ? <> · builder code <span className="mono">{MONTRA_BUILDER_CODE}</span></> : null}.</p>
                  <HelpLine />
                </div>

                {!isMeme && (
                  <div className="card pad">
                    <div className="eyebrow">You get</div>
                    <ul className="perklist">
                      {[...PERKS, { title: "A launch kit and a directory spot", text: "Ready-to-post launch posts plus a listing in the EARLY directory." }].map((p) => (
                        <li key={p.title}><Check /><span><b>{p.title}</b>{p.text}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
      {isMeme && <MemeFeed />}
    </>
  );
}

export default function LaunchPage() {
  return <Suspense fallback={<section className="blk"><div className="empty">Loading…</div></section>}><Launch /></Suspense>;
}
