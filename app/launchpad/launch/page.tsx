"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Art } from "../_components/Art";
import { WalletButton } from "../_components/Wallet";
import { useToast } from "../_components/Toast";
import { CREATOR_FEES, DEV_BUYS, LOCK_DAYS, LOCK_PCTS, SPLITS, feeSummary, type SplitKey } from "../_lib/presets";
import { CHAIN, CHAIN_ID, ETH_USD_FALLBACK, IS_TESTNET, TOTAL_SUPPLY, TREASURY_SET } from "../_lib/config";
import { buildClankerConfig, deployWithClanker, makeClanker, type DeployProgress } from "../_lib/clanker";
import { registerToken, uploadImage } from "../_lib/registry";
import { fmt, usd } from "../_lib/format";

type Form = { name: string; symbol: string; desc: string; file: File | null; preview: string | null; fee: number; split: SplitKey; lock: boolean; lockPct: number; lockDays: number; devBuy: number; x: string; chat: string; web: string; game: string };
const initial: Form = { name: "", symbol: "", desc: "", file: null, preview: null, fee: 4, split: "community", lock: true, lockPct: 5, lockDays: 180, devBuy: 0.1, x: "", chat: "", web: "", game: "" };

export default function LaunchPage() {
  const [f, setF] = useState<Form>(initial);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<DeployProgress | "uploading" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const { address, chainId } = useAccount();
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { switchChainAsync } = useSwitchChain();
  const router = useRouter();
  const toast = useToast();

  const fee = feeSummary(f.fee, f.split);
  const gasEth = 0.0006;
  const buyFee = f.devBuy * fee.total / 100;
  const totalEth = f.devBuy + gasEth;
  const estTokens = f.devBuy ? ((f.devBuy - buyFee) * ETH_USD_FALLBACK) / 0.0000125 : 0; // example launch price; real fill comes from the pool
  const missing = useMemo(() => [!f.name && "name", !f.symbol && "ticker", !f.x && "X", !f.chat && "Discord/Telegram"].filter(Boolean) as string[], [f]);
  const ready = missing.length === 0;
  const symbol = f.symbol || "TICKR";

  const onFile = (file: File | null) => { if (!file) return; set("file", file); const r = new FileReader(); r.onload = (e) => set("preview", String(e.target?.result)); r.readAsDataURL(file); };

  async function launch() {
    setErr(null);
    if (!ready) { setTouched(true); toast("A few required fields are still empty"); return; }
    if (!address || !wallet || !publicClient) { toast("Connect a wallet first"); return; }
    try {
      if (chainId !== CHAIN_ID) { await switchChainAsync({ chainId: CHAIN_ID }); }
      let image: string | null = null;
      if (f.file) { setBusy("uploading"); image = await uploadImage(f.file); }
      const cfg = buildClankerConfig({ name: f.name, symbol: f.symbol, description: f.desc, image, creatorFee: f.fee, split: f.split, lock: f.lock, lockPct: f.lockPct, lockDays: f.lockDays, devBuyEth: f.devBuy, x: f.x, chat: f.chat, web: f.web, game: f.game, creator: address });
      const clanker = makeClanker({ ...wallet, chain: CHAIN }, publicClient);
      const { address: token, txHash } = await deployWithClanker(clanker, cfg, setBusy);
      await registerToken({ address: token, chainId: CHAIN_ID, name: f.name, symbol: f.symbol.toUpperCase(), image, description: f.desc, creator: address, creatorFee: f.fee, split: f.split, lockPct: f.lock ? f.lockPct : 0, lockDays: f.lock ? f.lockDays : 0, devBuyEth: f.devBuy, socials: { x: f.x, chat: f.chat, web: f.web || undefined, game: f.game || undefined }, gameName: f.game ? "Your game" : null, txHash, createdAt: new Date().toISOString() });
      toast("Launched 🎉");
      router.push(`/launchpad/token/${token}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(null); }
  }

  const busyLabel = { uploading: "Uploading image…", simulating: "Checking the deployment…", signing: "Confirm in your wallet…", confirming: "Waiting for Base…", done: "Done" } as const;

  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Launch on {IS_TESTNET ? "Base Sepolia" : "Base"}</div>
        <h2 style={{ margin: "8px 0" }}>Launch your token</h2>
        <p className="muted" style={{ maxWidth: "52ch" }}>Four fields, two choices, one transaction. Liquidity is created and locked for you; fees start flowing on the first trade.</p>
      </section>
      <div className="split">
        <div style={{ display: "grid", gap: 18 }}>
          <div className="card pad" style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "120px 1fr", alignItems: "start" }}>
              <label className="upload">{f.preview ? <img src={f.preview} alt="" /> : <div><div style={{ fontSize: "1.4rem", color: "var(--fg-2)" }}>＋</div><div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--fg-2)" }}>Token image</div></div>}<input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></label>
              <div style={{ display: "grid", gap: 12 }}>
                <div className="field"><label>Token name</label><input className="inp" placeholder="Cat Royale" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="field"><label>Ticker</label><input className="inp mono" placeholder="MEOW" maxLength={8} value={f.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></div>
              </div>
            </div>
            <div className="field"><label>Short description</label><textarea className="inp" placeholder="What is it, and what do people do with it?" value={f.desc} onChange={(e) => set("desc", e.target.value)} /></div>
            <div className="note" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span>Total supply</span><b className="mono" style={{ color: "var(--fg)" }}>{TOTAL_SUPPLY.toLocaleString()} · same for every launch</b></div>
          </div>

          <div className="card pad" style={{ display: "grid", gap: 18 }}>
            <div><h3>Creator economy fee</h3><p className="muted" style={{ fontSize: ".93rem" }}>Charged on every trade and split between you and your stakers. The launchpad adds 1% on top.</p></div>
            <div className="chips">{CREATOR_FEES.map((v) => <button key={v} className={`chip big ${f.fee === v ? "on" : ""}`} onClick={() => set("fee", v)}><b>{v}%</b><small>{v === 4 ? "Default" : v === 1 ? "Lowest" : " "}</small></button>)}</div>
            <div><h3>Who gets it?</h3><p className="muted" style={{ fontSize: ".93rem" }}>Stakers always get at least half. Diamond Handers sends every cent to the people who lock.</p></div>
            <div className="chips">{SPLITS.map((s) => <button key={s.key} className={`chip big ${f.split === s.key ? "on" : ""}`} onClick={() => set("split", s.key)}><b>{s.label}</b><small>{s.creator}% dev · {s.stakers}% stakers</small></button>)}</div>
          </div>

          <div className="card pad" style={{ display: "grid", gap: 16 }}>
            <div><h3>Founder lock &amp; dev buy <span className="tag lemon" style={{ verticalAlign: "middle", marginLeft: 6 }}>Trust signal</span></h3><p className="muted" style={{ fontSize: ".93rem" }}>Lock part of the supply at launch, and optionally buy in with ETH in the same transaction. Both show on your token page and every share card.</p></div>
            <div className={`toggle ${f.lock ? "on" : ""}`} onClick={() => set("lock", !f.lock)}><span className="sw" /><span><b>Lock supply at launch</b><br /><span className="muted" style={{ fontSize: ".88rem" }}>Free. Locked tokens come from supply, not your wallet. Tokens with a founder lock get featured first.</span></span></div>
            {f.lock && (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <div className="field"><label>Percent of supply</label><div className="chips">{LOCK_PCTS.map((v) => <button key={v} className={`chip ${f.lockPct === v ? "on" : ""}`} onClick={() => set("lockPct", v)}>{v}%</button>)}</div></div>
                <div className="field"><label>Lock for</label><div className="chips">{LOCK_DAYS.map((v) => <button key={v} className={`chip ${f.lockDays === v ? "on" : ""}`} onClick={() => set("lockDays", v)}>{v}d</button>)}</div></div>
              </div>
            )}
            <div className="field"><label>Dev buy <span className="req">optional</span></label>
              <div className="chips">{DEV_BUYS.map((v) => <button key={v} className={`chip ${f.devBuy === v ? "on" : ""}`} onClick={() => set("devBuy", v)}>{v === 0 ? "None" : `${v} ETH`}</button>)}</div>
              <span className="hint">Buys {symbol} from the pool the moment it exists, at the launch price, before anyone else can.</span></div>
            {f.devBuy ? (
              <div className="note" style={{ display: "grid", gap: 0 }}>
                <div className="kv"><span>Dev buy</span><b>{f.devBuy.toFixed(3)} ETH</b></div>
                <div className="kv"><span>Trading fee on it ({fee.total}%)</span><b>{buyFee.toFixed(4)} ETH</b></div>
                <div className="kv"><span>→ {fee.stakerPct}% of that goes back to stakers (you, if you lock)</span><b>{(f.devBuy * fee.stakerPct / 100).toFixed(4)} ETH</b></div>
                <div className="kv"><span>Network fee (Base, est.)</span><b>~{gasEth} ETH</b></div>
                <div className="kv"><span>You receive (est.)</span><b>~{fmt(estTokens)} {symbol} · {(estTokens / TOTAL_SUPPLY * 100).toFixed(2)}%</b></div>
                <div className="kv total"><span>Total from your wallet</span><b>{totalEth.toFixed(4)} ETH · {usd(totalEth * ETH_USD_FALLBACK)}</b></div>
              </div>
            ) : <div className="note">No dev buy. Launching costs only the network fee, about {gasEth} ETH ({usd(gasEth * ETH_USD_FALLBACK)}) on Base.</div>}
          </div>

          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <div><h3>Where people find you</h3><p className="muted" style={{ fontSize: ".93rem" }}>A token without an X and a chat is a token nobody can join. Website and game link can be added later from your token page.</p></div>
            <div className="field"><label>X / Twitter <span className="req">required</span></label><input className={`inp ${!f.x && touched ? "err" : ""}`} placeholder="@handle" value={f.x} onChange={(e) => set("x", e.target.value)} /></div>
            <div className="field"><label>Discord or Telegram <span className="req">required</span></label><input className={`inp ${!f.chat && touched ? "err" : ""}`} placeholder="Invite link" value={f.chat} onChange={(e) => set("chat", e.target.value)} /></div>
            <details><summary style={{ fontWeight: 700, cursor: "pointer", color: "var(--fg-2)" }}>＋ Website and game link <span className="req">optional · add later</span></summary>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <div className="field"><label>Website</label><input className="inp" placeholder="yourgame.gg" value={f.web} onChange={(e) => set("web", e.target.value)} /></div>
                <div className="field"><label>Game link</label><input className="inp" placeholder="Paste a URL from your AI game builder" value={f.game} onChange={(e) => set("game", e.target.value)} /></div>
              </div></details>
          </div>
        </div>

        <div className="sticky" style={{ display: "grid", gap: 16 }}>
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Art symbol={symbol} image={f.preview} size="md" /><div><div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem" }}>{f.name || "Your token"}</div><div className="mono muted">${symbol} · {IS_TESTNET ? "Base Sepolia" : "Base"}</div></div></div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Fee on every trade · {fee.total}% total</div>
              <div className="feebar">
                {fee.creatorPct > 0 && <div className="f-you" style={{ flex: fee.creatorPct }}>{fee.creatorPct}%</div>}
                <div className="f-stk" style={{ flex: fee.stakerPct }}>{fee.stakerPct}%</div>
                <div className="f-pad" style={{ flex: 1 }}>1%</div>
              </div>
              <div className="legend"><span><i style={{ background: "#E6E7EC" }} />You</span><span><i style={{ background: "#8F93A1" }} />Stakers</span><span><i style={{ background: "#3A3A45" }} />Launchpad</span></div>
            </div>
            <div>
              <div className="kv"><span>Creator economy fee</span><b>{f.fee}%</b></div>
              <div className="kv"><span>→ to you</span><b>{fee.creatorPct}%</b></div>
              <div className="kv"><span>→ to stakers, in ETH</span><b>{fee.stakerPct}%</b></div>
              <div className="kv"><span>Launchpad fee</span><b>1%</b></div>
              <div className="kv"><span>Supply</span><b>100B</b></div>
              <div className="kv"><span>Founder lock</span><b>{f.lock ? `${f.lockPct}% · ${f.lockDays}d` : "None"}</b></div>
              <div className="kv"><span>Dev buy</span><b>{f.devBuy ? `${f.devBuy} ETH` : "None"}</b></div>
              <div className="kv total"><span>Cost to launch</span><b>{totalEth.toFixed(4)} ETH</b></div>
            </div>
            {address ? (
              <button className="btn primary lg full" onClick={launch} disabled={!!busy || !TREASURY_SET}>{busy ? busyLabel[busy] : ready ? `Launch ${symbol}` : "Launch"}</button>
            ) : <WalletButton size="lg" />}
            {err && <p style={{ fontSize: ".88rem", color: "var(--down)" }}>{err}</p>}
            {!ready && touched ? <p style={{ fontSize: ".85rem", color: "var(--down)", textAlign: "center" }}>Still needed: {missing.join(", ")}.</p>
              : <p className="muted" style={{ fontSize: ".8rem", textAlign: "center" }}>Deployed through Clanker v4 on {IS_TESTNET ? "Base Sepolia (test ETH only)" : "Base"}. Liquidity is locked by the protocol. {!TREASURY_SET ? "Treasury address not set — launches are disabled until it is." : ""}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
