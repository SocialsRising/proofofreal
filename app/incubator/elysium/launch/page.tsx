"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatEther, isAddress, parseEther, parseEventLogs, zeroHash } from "viem";
import { useAccount, useBalance, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../../launchpad/_components/Wallet";
import { useToast } from "../../../launchpad/_components/Toast";
import { COMMUNITY, ELYSIUM, MONTRA_BUILDER_CODE, SPLIT, TREASURY, explorerAddr } from "../../_lib/config";
import { FEE_TIERS, LAUNCH_ABI, MONTRA_FACTORY, SNIPE_WINDOWS, builderSuffix, incubatorSplit, montra, pickRow, randomSalt, short } from "../../_lib/montra";

type Step = "idle" | "switch" | "upload" | "check" | "sign" | "confirm" | "done";
const STEPS: [Step, string][] = [["switch", "Switch to Elysium"], ["upload", "Upload image + metadata"], ["check", "Check the launch with Montra"], ["sign", "Confirm in your wallet"], ["confirm", "Wait for Elysium to confirm"]];
const URL_RE = /^https:\/\/\S+$/i;

export default function LaunchPage() {
  const router = useRouter();
  const toast = useToast();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const bal = useBalance({ address, chainId: ELYSIUM.chainId, query: { enabled: !!address } });

  const [f, setF] = useState({ name: "", symbol: "", description: "", website: "", twitter: "", telegram: "", discord: "", payout: "", firstBuy: "0.01" });
  const [fee, setFee] = useState<number>(10000);
  const [snipe, setSnipe] = useState<number>(60);
  const [img, setImg] = useState<File | null>(null);
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const preview = useMemo(() => (img ? URL.createObjectURL(img) : null), [img]);

  const payout = (f.payout.trim() || address || "") as `0x${string}`;
  const firstBuy = (() => { try { return f.firstBuy.trim() ? parseEther(f.firstBuy.trim()) : BigInt(0); } catch { return BigInt(-1); } })();
  const problems = [
    !f.name.trim() && "Add a name.",
    !/^[A-Z0-9]{2,10}$/.test(f.symbol) && "Ticker: 2–10 letters or numbers.",
    !img && "Add an image (PNG, JPEG, WebP or GIF, 2 MB max).",
    img && img.size > 2 * 1024 * 1024 && "Image must be 2 MB or smaller.",
    payout && !isAddress(payout) && "Payout wallet isn't a valid address.",
    payout && (payout.toLowerCase() === TREASURY || payout.toLowerCase() === COMMUNITY) && "Your payout wallet can't be an EARLY wallet.",
    firstBuy < BigInt(0) && "First buy must be a number (in HYPE).",
    ...(["website", "twitter", "telegram", "discord"] as const).map((k) => f[k].trim() && !URL_RE.test(f[k].trim()) && `${k[0].toUpperCase() + k.slice(1)} link must start with https://`),
    !ack && "Tick the box to confirm you've read how it works.",
  ].filter(Boolean) as string[];
  const busy = step !== "idle" && step !== "done";

  async function launch() {
    setErr("");
    if (!isConnected || !address || !client) return setErr("Connect your wallet first.");
    if (problems.length) return setErr(problems[0]);
    try {
      if (chainId !== ELYSIUM.chainId) { setStep("switch"); await switchChainAsync({ chainId: ELYSIUM.chainId }); }

      setStep("upload");
      const fd = new FormData();
      fd.set("image", img!); fd.set("name", f.name.trim()); fd.set("symbol", f.symbol); fd.set("description", f.description.trim());
      for (const k of ["website", "twitter", "telegram", "discord"] as const) fd.set(k, f[k].trim());
      const up = await fetch("/api/incubator/metadata", { method: "POST", body: fd });
      const meta = await up.json();
      if (!up.ok) throw new Error(meta.error ?? "Upload failed.");

      setStep("check");
      const cfg = await montra.config();
      const row = pickRow(cfg.configs, fee, snipe);
      if (!row) throw new Error("Montra doesn't offer that fee + anti-snipe combination right now. Pick another.");
      const [launchFee, enabled] = await Promise.all([
        client.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee" }),
        client.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchEnabled" }),
      ]);
      if (!enabled) throw new Error("Montra has launches paused at the moment. Try again later.");
      const { feeRecipients, feeShares } = incubatorSplit(payout);
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
      const [ev] = parseEventLogs({ abi: LAUNCH_ABI, eventName: "TokenLaunched", logs: receipt.logs });
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
      <div className="eyebrow">Launch through EARLY · Montra on Elysium</div>
      <h1 style={{ marginTop: 10, fontSize: "clamp(2rem,5vw,3.2rem)" }}>Launch your token</h1>
      <p className="muted" style={{ maxWidth: "62ch", marginTop: 10 }}>One transaction from your wallet to Montra&apos;s own factory. Your whole supply goes into a Uniswap v4 pool with liquidity locked forever, and your fees split {SPLIT.creator / 100} / {SPLIT.treasury / 100} / {SPLIT.community / 100} on-chain.</p>

      <div className="grid2" style={{ marginTop: 26 }}>
        <div className="card pad" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "start" }}>
            <label className="upload" style={{ width: 120 }}>
              {preview ? <img src={preview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: ".8rem" }}>Image<br />2 MB max</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
            </label>
            <div style={{ display: "grid", gap: 12 }}>
              <div className="field"><label>Name <span className="req">*</span></label><input className="inp" maxLength={32} value={f.name} onChange={set("name")} placeholder="Agent Smith" /></div>
              <div className="field"><label>Ticker <span className="req">*</span></label><input className="inp mono" maxLength={10} value={f.symbol} onChange={(e) => setF((s) => ({ ...s, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} placeholder="SMITH" /></div>
            </div>
          </div>
          <div className="field"><label>What is it?</label><textarea className="inp" rows={4} maxLength={1000} value={f.description} onChange={set("description")} placeholder="What your project or agent does, in a few sentences. Your AI growth agent writes from this." /><span className="hint">Fixed forever at launch. Your growth agent only says what you write here.</span></div>
          <div className="g2 grid" style={{ gap: 12 }}>
            {(["website", "twitter", "telegram", "discord"] as const).map((k) => (
              <div key={k} className="field"><label>{k === "twitter" ? "X" : k[0].toUpperCase() + k.slice(1)}</label><input className="inp" value={f[k]} onChange={set(k)} placeholder="https://" /></div>
            ))}
          </div>

          <div className="field"><label>Trading fee</label>
            <div className="chips">{FEE_TIERS.map((t) => <button key={t.pips} type="button" className={`chip ${fee === t.pips ? "on" : ""}`} onClick={() => setFee(t.pips)}>{t.label}</button>)}</div>
            <span className="hint">Paid in HYPE on every buy and sell. Montra keeps 0.4%; the rest is the creator side that gets split. Can&apos;t be changed after launch with a split.</span>
          </div>
          <div className="field"><label>Anti-snipe</label>
            <div className="chips">{SNIPE_WINDOWS.map((w) => <button key={w.s} type="button" className={`chip ${snipe === w.s ? "on" : ""}`} onClick={() => setSnipe(w.s)}>{w.label}</button>)}</div>
            <span className="hint">Buys start at a 99% fee and fall to your fee over this window, so bots that buy in the first second pay you instead. Your own first buy is exempt.</span>
          </div>
          <div className="field"><label>Your first buy (HYPE)</label><input className="inp mono" value={f.firstBuy} onChange={set("firstBuy")} inputMode="decimal" placeholder="0" /><span className="hint">Optional. Lands in the launch transaction itself, so nobody can buy ahead of you.</span></div>
          <div className="field"><label>Payout wallet for your 80%</label><input className="inp mono" value={f.payout} onChange={set("payout")} placeholder={address ?? "0x… (defaults to your connected wallet)"} /><span className="hint">Use a wallet you control. There&apos;s no undo.</span></div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card pad">
            <div className="eyebrow">Your split</div>
            <div className="bar3"><i className="c" style={{ width: "80%" }} /><i className="t" style={{ width: "10%" }} /><i className="h" style={{ width: "10%" }} /></div>
            <div className="kv"><span>You {payout ? <span className="mono muted">{short(payout)}</span> : null}</span><b>{SPLIT.creator / 100}%</b></div>
            <div className="kv"><span>EARLY treasury <a className="mono muted" href={explorerAddr(TREASURY)} target="_blank" rel="noreferrer">{short(TREASURY)} ↗</a></span><b>{SPLIT.treasury / 100}%</b></div>
            <div className="kv"><span>Community rewards <a className="mono muted" href={explorerAddr(COMMUNITY)} target="_blank" rel="noreferrer">{short(COMMUNITY)} ↗</a></span><b>{SPLIT.community / 100}%</b></div>
            <p className="muted" style={{ fontSize: ".82rem", marginTop: 10 }}>Shares of the creator side of each trade fee, enforced by Montra&apos;s FeeSplitter and fixed at launch. Paid in HYPE.</p>
          </div>

          <div className="card pad">
            <div className="eyebrow">You get</div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 6, fontSize: ".93rem" }}>
              <li>An AI growth agent: launch post, thread, pinned welcome, FAQ and a 7-day plan</li>
              <li>A community Q&amp;A agent on your project page, grounded in your live data</li>
              <li>A listing in the EARLY directory from your first trade</li>
              <li>The right to apply for Socials Rising marketing support (approved case by case)</li>
            </ul>
          </div>

          <div className="card pad" style={{ display: "grid", gap: 12 }}>
            {!isConnected ? <WalletButton size="lg" /> : (
              <>
                <div className="kv" style={{ borderBottom: 0, padding: 0 }}><span className="muted">HYPE on Elysium</span><b className="mono">{bal.data ? Number(formatEther(bal.data.value)).toFixed(4) : "—"}</b></div>
                {bal.data && bal.data.value === BigInt(0) && <div className="warn">You need a little HYPE on Elysium for gas{firstBuy > BigInt(0) ? " and your first buy" : ""}. <a href={ELYSIUM.bridgeHelp} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>How to bridge ↗</a></div>}
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: ".86rem" }}>
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
                  <span className="muted">I&apos;m launching this token myself on Montra. I understand the split is fixed at launch, nothing here promises returns, airdrops or marketing, and Elysium is a new network.</span>
                </label>
                <button className="btn primary lg full" onClick={launch} disabled={busy}>{busy ? "Launching…" : `Launch $${f.symbol || "TICKER"}`}</button>
                {busy && <div className="stepper">{STEPS.map(([s, l], i) => <div key={s} className={i < stepIdx ? "done" : i === stepIdx ? "on" : ""}><i>{i < stepIdx ? "✓" : i + 1}</i>{l}</div>)}</div>}
                {err && <div className="warn">{err}</div>}
                {!err && !busy && problems.length > 0 && <p className="muted" style={{ fontSize: ".82rem" }}>{problems[0]}</p>}
              </>
            )}
            <p className="muted" style={{ fontSize: ".78rem" }}>Sent to Montra&apos;s factory <a className="mono" href={explorerAddr(MONTRA_FACTORY)} target="_blank" rel="noreferrer">{short(MONTRA_FACTORY)} ↗</a>{MONTRA_BUILDER_CODE ? <> · credited to builder code <span className="mono">{MONTRA_BUILDER_CODE}</span></> : null}. Prefer Volta? <Link href="/incubator/elysium#how" style={{ textDecoration: "underline" }}>Coming Tuesday</Link>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
