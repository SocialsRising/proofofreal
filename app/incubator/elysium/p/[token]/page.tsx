"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useToast } from "../../../../launchpad/_components/Toast";
import { LINKS, PARENT, explorerAddr, explorerTx } from "../../../_lib/config";
import { isIncubated, montra, pct, recipientLabel, short, units, usd, type Holders, type TokenDetail } from "../../../_lib/montra";

type Kit = { tagline: string; launchPost: string; thread: string[]; communityWelcome: string; faq: { q: string; a: string }[]; memeIdeas: string[]; weekOne: { day: string; action: string }[] };
type Msg = { role: "user" | "assistant"; content: string };

function Copy({ text }: { text: string }) {
  const toast = useToast();
  return <button className="btn sm ghost" onClick={() => { navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => {}); }}>Copy</button>;
}
function Block({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return <div className="kitblock"><div className="h"><b>{title}</b><Copy text={text} /></div>{children ?? <pre>{text}</pre>}</div>;
}

function GrowthAgent({ token, symbol }: { token: string; symbol: string }) {
  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  async function run() {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/incubator/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "kit", token }) });
      const b = await r.json(); if (!r.ok) throw new Error(b.error); setKit(b.kit);
    } catch (e) { setErr((e as Error).message || "The agent couldn't finish. Try again."); } finally { setLoading(false); }
  }
  const tweetUrl = (t: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(t)}`;
  return (
    <div className="card pad">
      <div className="sechead" style={{ marginBottom: 10 }}><div><div className="eyebrow">AI growth agent</div><h3 style={{ fontSize: "1.3rem" }}>Your launch kit</h3></div>
        <button className="btn ink" onClick={run} disabled={loading}>{loading ? "Writing… (~30s)" : kit ? "Write a fresh one" : "Write my launch kit"}</button></div>
      <p className="muted" style={{ fontSize: ".9rem" }}>Reads ${symbol}&apos;s live data from Montra and writes your launch post, thread, pinned welcome, FAQ, meme ideas and a 7-day plan. It only uses what&apos;s on-chain and in your description — edit before you post.</p>
      {err && <div className="warn" style={{ marginTop: 12 }}>{err}</div>}
      {kit && (
        <div className="kitgrid" style={{ marginTop: 14 }}>
          <Block title="Tagline" text={kit.tagline} />
          <Block title="Launch post" text={kit.launchPost}><pre>{kit.launchPost}</pre><a className="btn sm" style={{ marginTop: 10 }} href={tweetUrl(kit.launchPost)} target="_blank" rel="noreferrer">Post on X ↗</a></Block>
          <Block title="Thread" text={kit.thread.join("\n\n")}><ol>{kit.thread.map((t, i) => <li key={i}>{t}</li>)}</ol></Block>
          <Block title="Pinned community welcome" text={kit.communityWelcome} />
          <Block title="FAQ" text={kit.faq.map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n\n")}><ul>{kit.faq.map((x, i) => <li key={i}><b>{x.q}</b><br /><span className="muted">{x.a}</span></li>)}</ul></Block>
          <Block title="Meme ideas" text={kit.memeIdeas.join("\n")}><ul>{kit.memeIdeas.map((t, i) => <li key={i}>{t}</li>)}</ul></Block>
          <Block title="Your first week" text={kit.weekOne.map((d) => `${d.day}: ${d.action}`).join("\n")}><ul>{kit.weekOne.map((d, i) => <li key={i}><b>{d.day}</b> — {d.action}</li>)}</ul></Block>
        </div>
      )}
    </div>
  );
}

function AskDesk({ token, symbol }: { token: string; symbol: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs]);
  async function ask(text = q) {
    const question = text.trim(); if (!question || busy) return;
    const history = msgs; setMsgs([...history, { role: "user", content: question }]); setQ(""); setBusy(true);
    try {
      const r = await fetch("/api/incubator/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "ask", token, question, history }) });
      const b = await r.json();
      setMsgs((m) => [...m, { role: "assistant", content: r.ok ? b.answer : b.error ?? "Couldn't answer that one." }]);
    } catch { setMsgs((m) => [...m, { role: "assistant", content: "Couldn't reach the agent. Try again." }]); } finally { setBusy(false); }
  }
  const starters = [`What is $${symbol}?`, "How do the fees work?", "Do holders earn anything?", "Is this safe?"];
  return (
    <div className="card pad">
      <div className="eyebrow">Ask the desk</div>
      <h3 style={{ fontSize: "1.2rem", marginTop: 4 }}>Community support, instantly</h3>
      <p className="muted" style={{ fontSize: ".86rem", marginTop: 6 }}>Answers from ${symbol}&apos;s live on-chain data. Not financial advice.</p>
      <div className="chat" style={{ marginTop: 12 }}>
        {msgs.length === 0 && <div className="chips">{starters.map((s) => <button key={s} className="chip" style={{ padding: "7px 12px", fontSize: ".85rem" }} onClick={() => ask(s)}>{s}</button>)}</div>}
        {msgs.map((m, i) => <div key={i} className={`msg ${m.role === "user" ? "u" : "a"}`}>{m.content}</div>)}
        {busy && <div className="msg a muted">Thinking…</div>}
        <div ref={end} />
      </div>
      <form className="askrow" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} maxLength={600} placeholder={`Ask anything about $${symbol}`} />
        <button className="btn ink" disabled={busy || !q.trim()}>Ask</button>
      </form>
    </div>
  );
}

function Project() {
  const { token } = useParams<{ token: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const [d, setD] = useState<TokenDetail | null>(null);
  const [h, setH] = useState<Holders | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true, tries = 0;
    const load = () => montra.token(token).then((x) => { if (alive) { setD(x); setErr(""); } }).catch(() => {
      // a brand-new launch can take a few seconds to reach Montra's indexer
      if (alive && tries++ < 12) setTimeout(load, 5000); else if (alive) setErr("This token isn't on Montra yet — if you just launched, give it a minute and refresh.");
    });
    load(); montra.holders(token, 10).then((x) => alive && setH(x)).catch(() => {});
    const id = setInterval(() => montra.token(token).then((x) => alive && setD(x)).catch(() => {}), 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

  if (!d) return <section className="blk" style={{ paddingTop: 40 }}><div className="empty">{err || (isNew ? "Your token is live — waiting for Montra's indexer to pick it up…" : "Loading from Montra…")}</div></section>;

  const q = d.quote?.symbol ?? "HYPE", dec = d.quote?.decimals ?? 18, inc = isIncubated(d);
  const montraUrl = `https://montramarkets.xyz/token/${d.address.toLowerCase()}`;
  const label = (r: string) => recipientLabel(r, d.address, d.creator);
  const links = [["Website", d.metadata?.website], ["X", d.metadata?.twitter], ["Telegram", d.metadata?.telegram], ["Discord", d.metadata?.discord]].filter(([, u]) => u) as [string, string][];

  return (
    <>
      {isNew && <div className="note" style={{ marginTop: 24 }}>🚀 <b>${d.symbol} is live.</b> Write your launch kit below, then share your Montra link. Your project appears in the directory after its first trade.</div>}
      <section className="blk" style={{ paddingTop: 30 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          {d.imageUrl ? <img src={d.imageUrl} alt="" style={{ width: 84, height: 84, borderRadius: 20, objectFit: "cover", border: "1px solid var(--line)" }} /> : null}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className={`tag ${inc ? "mint" : "soft"}`}>{inc ? "Incubated by EARLY" : "Not incubated"}</span>
              <span className="tag soft">Montra · Elysium</span>
              <span className="tag soft">{d.graduation?.stage ?? "new"}</span>
            </div>
            <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", marginTop: 8 }}>{d.name} <span className="muted" style={{ fontSize: ".55em" }}>${d.symbol}</span></h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn primary" href={montraUrl} target="_blank" rel="noreferrer">Trade on Montra ↗</a>
            {links.map(([l, u]) => <a key={l} className="btn sm" href={u} target="_blank" rel="noreferrer">{l} ↗</a>)}
          </div>
        </div>
        {d.description && <p className="muted" style={{ marginTop: 16, maxWidth: "80ch", whiteSpace: "pre-wrap" }}>{d.description}</p>}

        <div className="stats" style={{ marginTop: 22 }}>
          <div className="stat"><div className="v">{usd(d.marketCapUsd)}</div><div className="k muted">Market cap</div></div>
          <div className="stat"><div className="v">{usd(d.volume24hUsd)}</div><div className="k muted">24h volume <span className={(d.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(d.change24hPct)}</span></div></div>
          <div className="stat"><div className="v">{d.holders.toLocaleString()}</div><div className="k muted">Holders{h ? ` · top 10 hold ${h.top10Pct.toFixed(1)}%` : ""}</div></div>
          <div className="stat"><div className="v">{units(d.rewards?.received ?? d.rewardsReceived, dec).toFixed(3)} {q}</div><div className="k muted">Paid to holders</div></div>
        </div>
      </section>

      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="grid2">
          <GrowthAgent token={d.address} symbol={d.symbol} />
          <div style={{ display: "grid", gap: 14 }}>
            <AskDesk token={d.address} symbol={d.symbol} />
            <div className="card pad">
              <div className="eyebrow">Fee split · on-chain</div>
              {d.splitter ? d.splitter.recipients.map((r, i) => (
                <div key={r} className="kv"><span><a href={explorerAddr(r)} target="_blank" rel="noreferrer">{label(r)}</a></span><b>{d.splitter!.shares[i] / 100}%</b></div>
              )) : <div className="kv"><span>{d.recipientKind}</span><b className="mono">{d.recipient ? short(d.recipient) : "—"}</b></div>}
              <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>Of the creator side of a {d.totalFeePips / 10000}% trade fee. {units(d.stats?.creatorFees, dec).toFixed(3)} {q} earned so far.</p>
            </div>
            <div className="card pad verify">
              <div className="eyebrow">Verify it yourself</div>
              <div className="kv"><span>Token</span><a className="mono" href={explorerAddr(d.address)} target="_blank" rel="noreferrer">{short(d.address)} ↗</a></div>
              {d.splitter && <div className="kv"><span>Fee splitter</span><a className="mono" href={explorerAddr(d.splitter.address)} target="_blank" rel="noreferrer">{short(d.splitter.address)} ↗</a></div>}
              <div className="kv"><span>Creator</span><a className="mono" href={explorerAddr(d.creator)} target="_blank" rel="noreferrer">{short(d.creator)} ↗</a></div>
              {d.launchTx && <div className="kv"><span>Launch tx</span><a className="mono" href={explorerTx(d.launchTx)} target="_blank" rel="noreferrer">{short(d.launchTx)} ↗</a></div>}
              <div className="kv"><span>Montra page</span><a href={montraUrl} target="_blank" rel="noreferrer">Open ↗</a></div>
            </div>
            <div className="card pad">
              <div className="eyebrow">{PARENT}</div>
              <p style={{ marginTop: 6, fontSize: ".93rem" }}>Want a spotlight, art, memes or a joint campaign? Incubated projects can apply — we pick a few each week based on traction and community.</p>
              <a className="btn sm" style={{ marginTop: 12 }} href={LINKS.discord || LINKS.apply} target="_blank" rel="noreferrer">Apply for support ↗</a>
            </div>
          </div>
        </div>
      </section>
      <p className="muted" style={{ fontSize: ".8rem", marginBottom: 30 }}><Link href="/incubator/elysium" style={{ textDecoration: "underline" }}>← Back to the directory</Link></p>
    </>
  );
}

export default function ProjectPage() {
  return <Suspense fallback={null}><Project /></Suspense>;
}
