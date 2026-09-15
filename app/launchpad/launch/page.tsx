"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { Art } from "../_components/Art";
import { WalletButton } from "../_components/Wallet";
import { useToast } from "../_components/Toast";
import { CREATOR_FEE_STEP, CREATOR_SPLITS, DEFAULT_CREATOR_FEE_PCT, DEV_BUYS, LOCK_DAYS, LOCK_PCTS, MAX_CREATOR_FEE_PCT, MAX_DEV_BUY_ETH, SPLITS, V4_PROTOCOL_FEE_PCT, feeSummary, feeSummaryV4, pctToPips, POOL_FEE_PCT, PROTOCOL_SHARE, type SplitKey } from "../_lib/presets";
import { INITIAL_MCAP_ETH, LAUNCH_FEE_ETH, TOTAL_SUPPLY } from "../_lib/config";
import { DEFAULT_CHAIN, LAUNCH_CHAINS, isV4Chain, type ChainInfo } from "../_lib/chains";
import { LaunchFactoryAbi, LaunchFactoryV4Abi } from "../_lib/abi";
import { buildLaunchArgs, buildLaunchArgsV4, parseLaunched, parseLaunchedV4, readable } from "../_lib/launchpad";
import { registerToken, uploadImage } from "../_lib/registry";
import { getRef } from "../_components/RefCapture";
import { simulateDevBuy } from "../_lib/curve";
import { useEthPrice } from "../_lib/useEthPrice";
import { fmt, price, usd, usdFull } from "../_lib/format";

type Form = { chain: ChainInfo; name: string; symbol: string; desc: string; file: File | null; preview: string | null; creatorFeePct: number; split: SplitKey; lock: boolean; lockPct: number; lockDays: number; devBuy: number; x: string; chat: string; business: string };
const initial: Form = { chain: DEFAULT_CHAIN, name: "", symbol: "", desc: "", file: null, preview: null, creatorFeePct: DEFAULT_CREATOR_FEE_PCT, split: "equal", lock: true, lockPct: 5, lockDays: 180, devBuy: 0.1, x: "", chat: "", business: "" };
type Busy = "uploading" | "signing" | "confirming" | "saving" | null;

const ethFmt = (n: number) => n >= 1000 ? fmt(n) : n >= 10 ? n.toFixed(1) : n.toFixed(n >= 1 ? 2 : 3);
const clampBuy = (n: number) => Math.min(MAX_DEV_BUY_ETH, Math.max(0, Number.isFinite(n) ? n : 0));

export default function LaunchPage() {
  const [f, setF] = useState<Form>(initial);
  const [devText, setDevText] = useState(String(initial.devBuy));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const setBuy = (n: number) => { const v = clampBuy(n); set("devBuy", v); setDevText(String(v)); };
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: f.chain.id });
  const router = useRouter();
  const toast = useToast();
  const { eth: ethUsd, live: priceLive } = useEthPrice();

  const v4 = isV4Chain(f.chain);
  const factory = v4 ? f.chain.factoryV4 : f.chain.factory;
  const { data: launchFeeWei } = useReadContract({ address: factory, abi: v4 ? LaunchFactoryV4Abi : LaunchFactoryAbi, functionName: "launchFee", chainId: f.chain.id, query: { enabled: !!factory } });
  const launchFeeEth = launchFeeWei !== undefined ? Number(formatEther(launchFeeWei)) : LAUNCH_FEE_ETH;

  // Fee picture: V4 = launchpad 1% + founder's own fee split with their community; V3 = fixed 1% split by preset.
  const split = v4 ? (CREATOR_SPLITS.find((s) => s.key === f.split) ?? CREATOR_SPLITS[0]) : null;
  const fee = v4
    ? feeSummaryV4(f.creatorFeePct, split!.creatorShareBps)
    : (() => { const s = feeSummary(f.split); return { total: s.total, launchpad: s.platformPct, founder: s.creatorPct, community: s.stakerPct, creatorFeePct: 0 }; })();

  const gasEth = 0.0008;
  const lockPct = f.lock ? f.lockPct : 0;
  const est = useMemo(() => simulateDevBuy(f.devBuy, lockPct, fee.total), [f.devBuy, lockPct, fee.total]);
  const buyFee = f.devBuy * fee.total / 100;
  const totalEth = f.devBuy + launchFeeEth + gasEth;
  const missing = useMemo(() => [!f.name.trim() && "name", !f.symbol && "ticker"].filter(Boolean) as string[], [f.name, f.symbol]);
  const ready = missing.length === 0;
  const symbol = f.symbol || "TICKR";
  const noFactory = !factory;
  const bigBuy = est.pctSupply > 50;

  const onFile = (file: File | null) => { if (!file) return; set("file", file); const r = new FileReader(); r.onload = (e) => set("preview", String(e.target?.result)); r.readAsDataURL(file); };

  async function launch() {
    setErr(null);
    if (!ready) { setTouched(true); toast("Name and ticker are required"); return; }
    if (!address || !publicClient || !factory) { toast("Connect a wallet first"); return; }
    try {
      if (chainId !== f.chain.id) await switchChainAsync({ chainId: f.chain.id });
      let image: string | null = null;
      if (f.file) { setBusy("uploading"); image = await uploadImage(f.file); }
      const socials = { x: f.x.trim() || undefined, chat: f.chat.trim() || undefined, business: f.business.trim() || undefined };
      // Small JSON blob emitted in the Launched event so the token is self-describing even if our registry is down.
      const metadata = { name: f.name, symbol: f.symbol.toUpperCase(), description: f.desc.slice(0, 280), image, socials };
      const common = { name: f.name, symbol: f.symbol, split: f.split, lock: f.lock, lockPct: f.lockPct, lockDays: f.lockDays, devBuyEth: f.devBuy, metadataURI: JSON.stringify(metadata) };
      const base = { chainId: f.chain.id, name: f.name, symbol: f.symbol.toUpperCase(), image, description: f.desc, creator: address, split: f.split, lockPct: f.lock ? f.lockPct : 0, lockDays: f.lock ? f.lockDays : 0, devBuyEth: f.devBuy, socials, gameName: null, referrer: getRef(), createdAt: new Date().toISOString() };

      setBusy("signing");
      if (v4) {
        const { params, value } = buildLaunchArgsV4({ ...common, creatorFeePct: f.creatorFeePct }, launchFeeWei ?? BigInt(0));
        const hash = await writeContractAsync({ address: factory, abi: LaunchFactoryV4Abi, functionName: "launch", args: [params], value, chainId: f.chain.id });
        setBusy("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const ev = parseLaunchedV4(receipt);
        if (!ev) throw new Error("Launched, but the event was not found. Check the transaction on the explorer.");
        setBusy("saving");
        await registerToken({ ...base, address: ev.token, pool: null, tokenId: ev.tokenId.toString(), txHash: hash, version: "v4", poolId: ev.poolId, creatorFeePips: pctToPips(f.creatorFeePct), creatorShareBps: split!.creatorShareBps, hook: f.chain.hook ?? null });
        toast("Launched 🎉");
        router.push(`/launchpad/token/${ev.token}`);
      } else {
        const { params, value } = buildLaunchArgs(common, launchFeeWei ?? BigInt(0));
        const hash = await writeContractAsync({ address: factory, abi: LaunchFactoryAbi, functionName: "launch", args: [params], value, chainId: f.chain.id });
        setBusy("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const ev = parseLaunched(receipt);
        if (!ev) throw new Error("Launched, but the event was not found. Check the transaction on the explorer.");
        setBusy("saving");
        await registerToken({ ...base, address: ev.token, pool: ev.pool, tokenId: ev.tokenId.toString(), txHash: hash, version: "v3" });
        toast("Launched 🎉");
        router.push(`/launchpad/token/${ev.token}`);
      }
    } catch (e) { setErr(readable(e)); } finally { setBusy(null); }
  }

  const busyLabel: Record<NonNullable<Busy>, string> = { uploading: "Uploading image…", signing: "Confirm in your wallet…", confirming: `Waiting for ${f.chain.short}…`, saving: "Saving…" };

  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Launch</div>
        <h2 style={{ margin: "8px 0" }}>Launch your token</h2>
        <p className="muted" style={{ maxWidth: "54ch" }}>Two required fields, one transaction. 1 billion supply, liquidity created and locked forever, fees start flowing on the first trade.</p>
      </section>
      <div className="split">
        <div style={{ display: "grid", gap: 18 }}>
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <div><h3>Chain</h3><p className="muted" style={{ fontSize: ".93rem" }}>Same launchpad, same fees. More chains as they go live.</p></div>
            {LAUNCH_CHAINS.length ? <div className="chips">{LAUNCH_CHAINS.map((c) => <button key={c.key} className={`chip big ${f.chain.key === c.key ? "on" : ""}`} onClick={() => set("chain", c)}><b>{c.short}</b><small>{c.testnet ? "test ETH" : "live"}</small></button>)}</div>
              : <div className="note">No factory is deployed for this build.</div>}
          </div>

          <div className="card pad" style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "120px 1fr", alignItems: "start" }}>
              <label className="upload">{f.preview ? <img src={f.preview} alt="" /> : <div><div style={{ fontSize: "1.4rem", color: "var(--fg-2)" }}>＋</div><div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--fg-2)" }}>Token image</div></div>}<input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></label>
              <div style={{ display: "grid", gap: 12 }}>
                <div className="field"><label>Token name <span className="req">required</span></label><input className={`inp ${!f.name.trim() && touched ? "err" : ""}`} placeholder="Swarm Labs" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="field"><label>Ticker <span className="req">required</span></label><input className={`inp mono ${!f.symbol && touched ? "err" : ""}`} placeholder="SWARM" maxLength={8} value={f.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></div>
              </div>
            </div>
            <div className="field"><label>Short description</label><textarea className="inp" placeholder="What your agents do, and why holders should care." value={f.desc} onChange={(e) => set("desc", e.target.value)} /></div>
            <div className="note" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span>Total supply</span><b className="mono" style={{ color: "var(--fg)" }}>{TOTAL_SUPPLY.toLocaleString()} · same for every launch</b></div>
          </div>

          {v4 ? (
            <div className="card pad" style={{ display: "grid", gap: 18 }}>
              <div><h3>Your creator fee</h3><p className="muted" style={{ fontSize: ".93rem" }}>Every buy and sell pays the launchpad&apos;s {V4_PROTOCOL_FEE_PCT}% plus whatever you set here — {0}–{MAX_CREATOR_FEE_PCT}%. Your fee is yours to split with your holders.</p></div>
              <div className="feeslider">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="muted" style={{ fontSize: ".85rem" }}>Creator fee</span>
                  <span className="mono" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-.03em" }}>{f.creatorFeePct}%</span>
                </div>
                <input type="range" className="range" min={0} max={MAX_CREATOR_FEE_PCT} step={CREATOR_FEE_STEP} value={f.creatorFeePct} onChange={(e) => set("creatorFeePct", parseFloat(e.target.value))} aria-label="Creator fee percent" />
                <div className="row" style={{ justifyContent: "space-between" }}><span className="muted mono" style={{ fontSize: ".74rem" }}>0% · no creator fee</span><span className="muted mono" style={{ fontSize: ".74rem" }}>{MAX_CREATOR_FEE_PCT}% · max</span></div>
              </div>
              <div className="field"><label>Where your {f.creatorFeePct}% goes</label>
                <div className="chips">{CREATOR_SPLITS.map((s) => <button key={s.key} className={`chip big ${f.split === s.key ? "on" : ""}`} onClick={() => set("split", s.key)}><b>{s.label}</b><small>{s.founder}% you · {s.community}% holders</small></button>)}</div>
                <span className="hint">{split!.blurb} The holder share funds Sunday payouts for your token.</span>
              </div>
              <div className="note" style={{ display: "grid", gap: 0 }}>
                <div className="kv"><span>Total fee on every trade</span><b>{fee.total}%</b></div>
                <div className="kv"><span>→ launchpad</span><b>{fee.launchpad}%</b></div>
                <div className="kv"><span>→ you</span><b>{fee.founder}%</b></div>
                <div className="kv"><span>→ your holders (Sunday payouts)</span><b>{fee.community}%</b></div>
              </div>
            </div>
          ) : (
            <div className="card pad" style={{ display: "grid", gap: 18 }}>
              <div><h3>Trading fee &amp; split</h3><p className="muted" style={{ fontSize: ".93rem" }}>Every buy and sell pays a {POOL_FEE_PCT}% fee. {PROTOCOL_SHARE}% runs the launchpad. You choose how the other {100 - PROTOCOL_SHARE}% splits between you and the holder rewards pool — holders never get less than half.</p></div>
              <div className="chips">{SPLITS.map((s) => <button key={s.key} className={`chip big ${f.split === s.key ? "on" : ""}`} onClick={() => set("split", s.key)}><b>{s.label}</b><small>{s.creator}% you · {s.stakers}% holders</small></button>)}</div>
            </div>
          )}

          <div className="card pad" style={{ display: "grid", gap: 16 }}>
            <div><h3>Founder lock <span className="tag lemon" style={{ verticalAlign: "middle", marginLeft: 6 }}>Trust signal</span></h3><p className="muted" style={{ fontSize: ".93rem" }}>Lock part of the supply in a vault nobody can open early. It shows on your token page and every share card.</p></div>
            <div className={`toggle ${f.lock ? "on" : ""}`} onClick={() => set("lock", !f.lock)}><span className="sw" /><span><b>Lock supply at launch</b><br /><span className="muted" style={{ fontSize: ".88rem" }}>Free. Locked tokens come from supply, not your wallet, and count toward your Sunday payouts.</span></span></div>
            {f.lock && (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <div className="field"><label>Percent of supply</label><div className="chips">{LOCK_PCTS.map((v) => <button key={v} className={`chip ${f.lockPct === v ? "on" : ""}`} onClick={() => set("lockPct", v)}>{v}%</button>)}</div></div>
                <div className="field"><label>Lock for</label><div className="chips">{LOCK_DAYS.map((v) => <button key={v} className={`chip ${f.lockDays === v ? "on" : ""}`} onClick={() => set("lockDays", v)}>{v}d</button>)}</div></div>
              </div>
            )}
          </div>

          <div className="card pad" style={{ display: "grid", gap: 16 }}>
            <div><h3>Dev buy <span className="req">optional · up to {MAX_DEV_BUY_ETH} ETH</span></h3><p className="muted" style={{ fontSize: ".93rem" }}>Buy {symbol} from the pool the moment it exists, in the same transaction, before anyone else can. Starts at a {INITIAL_MCAP_ETH} ETH market cap.{v4 ? ` Your buy pays the full ${fee.total}% fee like any trade.` : ""}</p></div>
            <div className="chips">{DEV_BUYS.map((v) => <button key={v} className={`chip ${f.devBuy === v ? "on" : ""}`} onClick={() => setBuy(v)}>{v === 0 ? "None" : `${v} ETH`}</button>)}</div>
            <div className="buyrow">
              <input type="range" className="range" min={0} max={MAX_DEV_BUY_ETH} step={0.01} value={f.devBuy} onChange={(e) => setBuy(parseFloat(e.target.value))} aria-label="Dev buy in ETH" />
              <div className="inp mono buyinp"><input type="number" inputMode="decimal" min={0} max={MAX_DEV_BUY_ETH} step="any" value={devText} onChange={(e) => { setDevText(e.target.value); set("devBuy", clampBuy(parseFloat(e.target.value))); }} onBlur={() => setDevText(String(f.devBuy))} /><span>ETH</span></div>
            </div>
            {f.devBuy > 0 ? (
              <div className="est">
                <div className="est-head"><span className="eyebrow">After your buy</span><span className="muted" style={{ fontSize: ".78rem" }}>≈ · ETH {usdFull(ethUsd)} {priceLive ? "live" : "est."}</span></div>
                <div className="est-grid">
                  <div><small>Market cap</small><b className="mono">{ethFmt(est.mcapEth)} ETH</b><span className="muted mono">{usd(est.mcapEth * ethUsd)}</span></div>
                  <div><small>You receive</small><b className="mono">{fmt(est.tokensOut)} {symbol}</b><span className="muted mono">{est.pctSupply.toFixed(est.pctSupply < 10 ? 2 : 1)}% of supply</span></div>
                  <div><small>Price move</small><b className="mono">{est.multiple.toFixed(est.multiple < 10 ? 2 : 0)}×</b><span className="muted mono">from {INITIAL_MCAP_ETH} ETH mcap</span></div>
                  <div><small>Avg. price paid</small><b className="mono">{price(est.avgPriceEth * ethUsd)}</b><span className="muted mono">per {symbol}</span></div>
                </div>
                {bigBuy && <div className="warn">You would own {est.pctSupply.toFixed(0)}% of the supply. A buy this size moves the price {est.multiple.toFixed(0)}× — anyone who sells after you sells into you, and the token page shows this number to every visitor.</div>}
                <div className="kvs">
                  <div className="kv"><span>Dev buy</span><b>{f.devBuy} ETH</b></div>
                  <div className="kv"><span>Trading fee on it ({fee.total}%)</span><b>{buyFee.toFixed(4)} ETH</b></div>
                  {fee.community > 0 && <div className="kv"><span>→ {fee.community}% of it goes to your holders</span><b>{(f.devBuy * fee.community / 100).toFixed(4)} ETH</b></div>}
                  {fee.founder > 0 && <div className="kv"><span>→ {fee.founder}% of it comes back to you</span><b>{(f.devBuy * fee.founder / 100).toFixed(4)} ETH</b></div>}
                  <div className="kv"><span>Launch fee</span><b>{launchFeeEth} ETH</b></div>
                  <div className="kv"><span>Network fee (est.)</span><b>~{gasEth} ETH</b></div>
                  <div className="kv total"><span>Total from your wallet</span><b>{totalEth.toFixed(4)} ETH · {usd(totalEth * ethUsd)}</b></div>
                </div>
              </div>
            ) : <div className="note">No dev buy. Launching costs the {launchFeeEth} ETH launch fee plus about {gasEth} ETH in network fees ({usd((launchFeeEth + gasEth) * ethUsd)}).</div>}
          </div>

          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <div><h3>Where people find you <span className="req">all optional</span></h3><p className="muted" style={{ fontSize: ".93rem" }}>Add them now or later from your token page. The business link shows as a button on your token page.</p></div>
            <div className="field"><label>AI agent business link</label><input className="inp" placeholder="https://yourbusiness.ai" value={f.business} onChange={(e) => set("business", e.target.value)} /><span className="hint">Where your agents work — a product, a storefront, a dashboard, a demo.</span></div>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <div className="field"><label>X / Twitter</label><input className="inp" placeholder="@handle" value={f.x} onChange={(e) => set("x", e.target.value)} /></div>
              <div className="field"><label>Discord or Telegram</label><input className="inp" placeholder="Invite link" value={f.chat} onChange={(e) => set("chat", e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="sticky" style={{ display: "grid", gap: 16 }}>
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Art symbol={symbol} image={f.preview} size="md" /><div><div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem" }}>{f.name || "Your token"}</div><div className="mono muted">${symbol} · {f.chain.short}</div></div></div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Fee on every trade · {fee.total}%</div>
              <div className="feebar">
                <div className="f-pad" style={{ flex: fee.launchpad }}>{fee.launchpad}%</div>
                {fee.founder > 0 && <div className="f-you" style={{ flex: fee.founder }}>{fee.founder}%</div>}
                {fee.community > 0 && <div className="f-stk" style={{ flex: fee.community }}>{fee.community}%</div>}
              </div>
              <div className="legend"><span><i style={{ background: "#3A3A45" }} />Launchpad</span><span><i style={{ background: "#E6E7EC" }} />You</span><span><i style={{ background: "#8F93A1" }} />Holders</span></div>
            </div>
            <div>
              <div className="kv"><span>Supply</span><b>1B</b></div>
              <div className="kv"><span>Starting market cap</span><b>{INITIAL_MCAP_ETH} ETH · {usd(INITIAL_MCAP_ETH * ethUsd)}</b></div>
              {f.devBuy > 0 && <div className="kv"><span>After dev buy</span><b>≈{ethFmt(est.mcapEth)} ETH · {usd(est.mcapEth * ethUsd)}</b></div>}
              {f.devBuy > 0 && <div className="kv"><span>You would own</span><b>≈{est.pctSupply.toFixed(est.pctSupply < 10 ? 2 : 1)}%</b></div>}
              {v4 && <div className="kv"><span>Creator fee</span><b>{f.creatorFeePct}% · {split!.label}</b></div>}
              <div className="kv"><span>Founder lock</span><b>{f.lock ? `${f.lockPct}% · ${f.lockDays}d` : "None"}</b></div>
              <div className="kv"><span>Dev buy</span><b>{f.devBuy ? `${f.devBuy} ETH` : "None"}</b></div>
              <div className="kv total"><span>Cost to launch</span><b>{totalEth.toFixed(4)} ETH</b></div>
            </div>
            {address ? (
              <button className="btn primary lg full" onClick={launch} disabled={!!busy || noFactory}>{busy ? busyLabel[busy] : ready ? `Launch ${symbol} on ${f.chain.short}` : "Launch"}</button>
            ) : <WalletButton size="lg" />}
            {err && <p style={{ fontSize: ".88rem", color: "var(--down)" }}>{err}</p>}
            {!ready && touched ? <p style={{ fontSize: ".85rem", color: "var(--down)", textAlign: "center" }}>Still needed: {missing.join(" and ")}.</p>
              : <p className="muted" style={{ fontSize: ".8rem", textAlign: "center" }}>{noFactory ? `The ${f.chain.short} factory is not deployed yet.` : `Liquidity is created on Uniswap and locked forever. Your wallet approves one transaction.`}</p>}
            <p className="muted" style={{ fontSize: ".74rem", textAlign: "center" }}>By launching you agree to the <a href="/launchpad/terms" style={{ textDecoration: "underline" }}>Terms</a> and confirm you have read the <a href="/launchpad/risk" style={{ textDecoration: "underline" }}>Risk Notice</a>.</p>
          </div>
        </div>
      </div>
    </>
  );
}
