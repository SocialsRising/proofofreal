"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { Art } from "../_components/Art";
import { WalletButton } from "../_components/Wallet";
import { useToast } from "../_components/Toast";
import { DEV_BUYS, LOCK_DAYS, LOCK_PCTS, SPLITS, feeSummary, POOL_FEE_PCT, PROTOCOL_SHARE, type SplitKey } from "../_lib/presets";
import { ETH_USD_FALLBACK, INITIAL_MCAP_ETH, LAUNCH_FEE_ETH, TOTAL_SUPPLY } from "../_lib/config";
import { CHAINS, DEFAULT_CHAIN, LAUNCH_CHAINS, type ChainInfo } from "../_lib/chains";
import { LaunchFactoryAbi } from "../_lib/abi";
import { buildLaunchArgs, parseLaunched, readable } from "../_lib/launchpad";
import { registerToken, uploadImage } from "../_lib/registry";
import { getRef } from "../_components/RefCapture";
import { fmt, usd } from "../_lib/format";

type Form = { chain: ChainInfo; name: string; symbol: string; desc: string; file: File | null; preview: string | null; split: SplitKey; lock: boolean; lockPct: number; lockDays: number; devBuy: number; x: string; chat: string; web: string; game: string };
const initial: Form = { chain: DEFAULT_CHAIN, name: "", symbol: "", desc: "", file: null, preview: null, split: "community", lock: true, lockPct: 5, lockDays: 180, devBuy: 0.1, x: "", chat: "", web: "", game: "" };
type Busy = "uploading" | "signing" | "confirming" | "saving" | null;

export default function LaunchPage() {
  const [f, setF] = useState<Form>(initial);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: f.chain.id });
  const router = useRouter();
  const toast = useToast();

  const factory = f.chain.factory;
  const { data: launchFeeWei } = useReadContract({ address: factory, abi: LaunchFactoryAbi, functionName: "launchFee", chainId: f.chain.id, query: { enabled: !!factory } });
  const launchFeeEth = launchFeeWei !== undefined ? Number(formatEther(launchFeeWei)) : LAUNCH_FEE_ETH;

  const fee = feeSummary(f.split);
  const gasEth = 0.0008;
  const buyFee = f.devBuy * fee.total / 100;
  const totalEth = f.devBuy + launchFeeEth + gasEth;
  // starting price = INITIAL_MCAP_ETH / 1B; the first buy walks up the curve so this is an upper bound, shown as "~"
  const estTokens = f.devBuy ? Math.min(TOTAL_SUPPLY * 0.3, ((f.devBuy - buyFee) / INITIAL_MCAP_ETH) * TOTAL_SUPPLY * 0.85) : 0;
  const missing = useMemo(() => [!f.name && "name", !f.symbol && "ticker", !f.x && "X", !f.chat && "Discord/Telegram"].filter(Boolean) as string[], [f]);
  const ready = missing.length === 0;
  const symbol = f.symbol || "TICKR";
  const noFactory = !factory;

  const onFile = (file: File | null) => { if (!file) return; set("file", file); const r = new FileReader(); r.onload = (e) => set("preview", String(e.target?.result)); r.readAsDataURL(file); };

  async function launch() {
    setErr(null);
    if (!ready) { setTouched(true); toast("A few required fields are still empty"); return; }
    if (!address || !publicClient || !factory) { toast("Connect a wallet first"); return; }
    try {
      if (chainId !== f.chain.id) await switchChainAsync({ chainId: f.chain.id });
      let image: string | null = null;
      if (f.file) { setBusy("uploading"); image = await uploadImage(f.file); }
      const metadata = { name: f.name, symbol: f.symbol.toUpperCase(), description: f.desc.slice(0, 280), image, socials: { x: f.x, chat: f.chat, web: f.web || undefined, game: f.game || undefined } };
      // Small JSON blob emitted in the Launched event so the token is self-describing even if our registry is down.
      const { params, value } = buildLaunchArgs({ name: f.name, symbol: f.symbol, split: f.split, lock: f.lock, lockPct: f.lockPct, lockDays: f.lockDays, devBuyEth: f.devBuy, metadataURI: JSON.stringify(metadata) }, launchFeeWei ?? BigInt(0));
      setBusy("signing");
      const hash = await writeContractAsync({ address: factory, abi: LaunchFactoryAbi, functionName: "launch", args: [params], value, chainId: f.chain.id });
      setBusy("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const launched = parseLaunched(receipt);
      if (!launched) throw new Error("Launched, but the event was not found. Check the transaction on the explorer.");
      setBusy("saving");
      await registerToken({ address: launched.token, chainId: f.chain.id, name: f.name, symbol: f.symbol.toUpperCase(), image, description: f.desc, creator: address, split: f.split, pool: launched.pool, tokenId: launched.tokenId.toString(), lockPct: f.lock ? f.lockPct : 0, lockDays: f.lock ? f.lockDays : 0, devBuyEth: f.devBuy, socials: metadata.socials, gameName: f.game ? "Your game" : null, txHash: hash, referrer: getRef(), createdAt: new Date().toISOString() });
      toast("Launched 🎉");
      router.push(`/launchpad/token/${launched.token}`);
    } catch (e) { setErr(readable(e)); } finally { setBusy(null); }
  }

  const busyLabel: Record<NonNullable<Busy>, string> = { uploading: "Uploading image…", signing: "Confirm in your wallet…", confirming: `Waiting for ${f.chain.short}…`, saving: "Saving…" };

  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Launch</div>
        <h2 style={{ margin: "8px 0" }}>Launch your token</h2>
        <p className="muted" style={{ maxWidth: "52ch" }}>Four fields, one choice, one transaction. 1 billion supply, liquidity created and locked forever, fees start flowing on the first trade.</p>
      </section>
      <div className="split">
        <div style={{ display: "grid", gap: 18 }}>
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <div><h3>Chain</h3><p className="muted" style={{ fontSize: ".93rem" }}>Same launchpad, same fees, your pick. Arc comes next.</p></div>
            <div className="chips">{(LAUNCH_CHAINS.length ? LAUNCH_CHAINS : [CHAINS.base, CHAINS.robinhood]).map((c) => <button key={c.key} className={`chip big ${f.chain.key === c.key ? "on" : ""}`} onClick={() => set("chain", c)} disabled={!c.factory}><b>{c.short}</b><small>{c.factory ? (c.testnet ? "test ETH" : "live") : "soon"}</small></button>)}</div>
          </div>

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
            <div><h3>Who gets the trading fees?</h3><p className="muted" style={{ fontSize: ".93rem" }}>Every trade pays a {POOL_FEE_PCT}% fee. {PROTOCOL_SHARE}% runs the launchpad; the rest is yours to split with your holders. Holders always get at least half.</p></div>
            <div className="chips">{SPLITS.map((s) => <button key={s.key} className={`chip big ${f.split === s.key ? "on" : ""}`} onClick={() => set("split", s.key)}><b>{s.label}</b><small>{s.creator}% you · {s.stakers}% holders</small></button>)}</div>
            <p className="muted" style={{ fontSize: ".85rem" }}>Holders are paid every Sunday with a variety of stock tokens, experimental AI agents, and new exciting NFTs, based on how much they hold and for how long. No staking contract, no lockup — just hold.</p>
          </div>

          <div className="card pad" style={{ display: "grid", gap: 16 }}>
            <div><h3>Founder lock &amp; dev buy <span className="tag lemon" style={{ verticalAlign: "middle", marginLeft: 6 }}>Trust signal</span></h3><p className="muted" style={{ fontSize: ".93rem" }}>Lock part of the supply at launch, and optionally buy in with ETH in the same transaction. Both show on your token page and every share card.</p></div>
            <div className={`toggle ${f.lock ? "on" : ""}`} onClick={() => set("lock", !f.lock)}><span className="sw" /><span><b>Lock supply at launch</b><br /><span className="muted" style={{ fontSize: ".88rem" }}>Free. Locked tokens come from supply, not your wallet, and count toward your holder rewards.</span></span></div>
            {f.lock && (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <div className="field"><label>Percent of supply</label><div className="chips">{LOCK_PCTS.map((v) => <button key={v} className={`chip ${f.lockPct === v ? "on" : ""}`} onClick={() => set("lockPct", v)}>{v}%</button>)}</div></div>
                <div className="field"><label>Lock for</label><div className="chips">{LOCK_DAYS.map((v) => <button key={v} className={`chip ${f.lockDays === v ? "on" : ""}`} onClick={() => set("lockDays", v)}>{v}d</button>)}</div></div>
              </div>
            )}
            <div className="field"><label>Dev buy <span className="req">optional</span></label>
              <div className="chips">{DEV_BUYS.map((v) => <button key={v} className={`chip ${f.devBuy === v ? "on" : ""}`} onClick={() => set("devBuy", v)}>{v === 0 ? "None" : `${v} ETH`}</button>)}</div>
              <span className="hint">Buys {symbol} from the pool the moment it exists, before anyone else can. Starts at a {INITIAL_MCAP_ETH} ETH market cap.</span></div>
            {f.devBuy ? (
              <div className="note" style={{ display: "grid", gap: 0 }}>
                <div className="kv"><span>Dev buy</span><b>{f.devBuy.toFixed(3)} ETH</b></div>
                <div className="kv"><span>Trading fee on it ({fee.total}%)</span><b>{buyFee.toFixed(4)} ETH</b></div>
                <div className="kv"><span>→ {fee.stakerPct}% of the trade goes to holders (you, if you lock)</span><b>{(f.devBuy * fee.stakerPct / 100).toFixed(4)} ETH</b></div>
                <div className="kv"><span>Launch fee</span><b>{launchFeeEth} ETH</b></div>
                <div className="kv"><span>Network fee (est.)</span><b>~{gasEth} ETH</b></div>
                <div className="kv"><span>You receive (est.)</span><b>~{fmt(estTokens)} {symbol} · {(estTokens / TOTAL_SUPPLY * 100).toFixed(1)}%</b></div>
                <div className="kv total"><span>Total from your wallet</span><b>{totalEth.toFixed(4)} ETH · {usd(totalEth * ETH_USD_FALLBACK)}</b></div>
              </div>
            ) : <div className="note">No dev buy. Launching costs the {launchFeeEth} ETH launch fee plus about {gasEth} ETH in network fees ({usd((launchFeeEth + gasEth) * ETH_USD_FALLBACK)}).</div>}
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
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Art symbol={symbol} image={f.preview} size="md" /><div><div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem" }}>{f.name || "Your token"}</div><div className="mono muted">${symbol} · {f.chain.short}</div></div></div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Fee on every trade · {fee.total}%</div>
              <div className="feebar">
                {fee.creatorPct > 0 && <div className="f-you" style={{ flex: fee.creatorPct }}>{fee.creatorPct}%</div>}
                <div className="f-stk" style={{ flex: fee.stakerPct }}>{fee.stakerPct}%</div>
                <div className="f-pad" style={{ flex: fee.platformPct }}>{fee.platformPct}%</div>
              </div>
              <div className="legend"><span><i style={{ background: "#E6E7EC" }} />You</span><span><i style={{ background: "#8F93A1" }} />Holders</span><span><i style={{ background: "#3A3A45" }} />Launchpad</span></div>
            </div>
            <div>
              <div className="kv"><span>→ to you</span><b>{fee.creatorPct}%</b></div>
              <div className="kv"><span>→ to holders</span><b>{fee.stakerPct}%</b></div>
              <div className="kv"><span>→ launchpad</span><b>{fee.platformPct}%</b></div>
              <div className="kv"><span>Supply</span><b>1B</b></div>
              <div className="kv"><span>Starting market cap</span><b>{INITIAL_MCAP_ETH} ETH</b></div>
              <div className="kv"><span>Founder lock</span><b>{f.lock ? `${f.lockPct}% · ${f.lockDays}d` : "None"}</b></div>
              <div className="kv"><span>Dev buy</span><b>{f.devBuy ? `${f.devBuy} ETH` : "None"}</b></div>
              <div className="kv total"><span>Cost to launch</span><b>{totalEth.toFixed(4)} ETH</b></div>
            </div>
            {address ? (
              <button className="btn primary lg full" onClick={launch} disabled={!!busy || noFactory}>{busy ? busyLabel[busy] : ready ? `Launch ${symbol} on ${f.chain.short}` : "Launch"}</button>
            ) : <WalletButton size="lg" />}
            {err && <p style={{ fontSize: ".88rem", color: "var(--down)" }}>{err}</p>}
            {!ready && touched ? <p style={{ fontSize: ".85rem", color: "var(--down)", textAlign: "center" }}>Still needed: {missing.join(", ")}.</p>
              : <p className="muted" style={{ fontSize: ".8rem", textAlign: "center" }}>{noFactory ? `The ${f.chain.short} factory isn't deployed yet.` : `Liquidity is created on Uniswap and locked forever. Your wallet approves one transaction.`}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
