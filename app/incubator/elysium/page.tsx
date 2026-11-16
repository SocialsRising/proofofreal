"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BRAND, LAUNCHPADS, PARENT, SLOTS, explorerAddr } from "../_lib/config";
import { montra, pct, usd, ago, type TokenCard } from "../_lib/montra";

type Tab = "trending" | "latest" | "top";

function TokenTable({ tokens, empty }: { tokens: TokenCard[]; empty: React.ReactNode }) {
  const router = useRouter();
  if (!tokens.length) return <div className="empty">{empty}</div>;
  return (
    <div className="scroll-x card">
      <table className="ptable">
        <thead><tr><th>Project</th><th className="num">Market cap</th><th className="num">24h vol</th><th className="num">24h</th><th className="num">Holders</th><th className="num">Launched</th></tr></thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.address} className="row" onClick={() => router.push(`/incubator/elysium/p/${t.address}`)}>
              <td><div className="tok">{t.imageUrl ? <img src={t.imageUrl} alt="" loading="lazy" /> : <span className="ph" />}<div><b>{t.name}</b><small>${t.symbol}</small></div></div></td>
              <td className="num">{usd(t.marketCapUsd)}</td>
              <td className="num">{usd(t.volume24hUsd)}</td>
              <td className={`num ${(t.change24hPct ?? 0) >= 0 ? "up" : "down"}`}>{pct(t.change24hPct)}</td>
              <td className="num">{t.holders.toLocaleString()}</td>
              <td className="num">{ago(t.launchedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IncubatorHome() {
  const [mine, setMine] = useState<TokenCard[] | null>(null);
  const [trending, setTrending] = useState<TokenCard[]>([]);
  const [tab, setTab] = useState<Tab>("trending");
  const [err, setErr] = useState("");

  useEffect(() => {
    montra.incubated().then(setMine).catch(() => { setMine([]); setErr("Montra's API is busy — the directory will refresh shortly."); });
    montra.trending(8).then(setTrending).catch(() => {});
    const id = setInterval(() => montra.incubated().then(setMine).catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    const l = [...(mine ?? [])];
    if (tab === "latest") l.sort((a, b) => b.launchedAt - a.launchedAt);
    else if (tab === "top") l.sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
    else l.sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0));
    return l;
  }, [mine, tab]);

  const totals = useMemo(() => {
    const l = mine ?? [];
    return {
      n: l.length,
      mcap: l.reduce((s, t) => s + (t.marketCapUsd ?? 0), 0),
      vol: l.reduce((s, t) => s + (t.volume24hUsd ?? 0), 0),
      holders: l.reduce((s, t) => s + (t.holders ?? 0), 0),
    };
  }, [mine]);

  return (
    <>
      <section className="hero-inc">
        <div className="eyebrow live"><i />Live on Elysium · Montra today, Volta next</div>
        <h1 style={{ marginTop: 14, maxWidth: "15ch" }}>Launch like you <span className="chrome-text">already have a team.</span></h1>
        <p className="sub muted" style={{ maxWidth: "58ch", marginTop: 16, fontSize: "1.08rem" }}>
          {BRAND} sits on top of the launchpads you already use. Launch through us and your token gets a ready-made launch kit, a spot in this directory, a fee split that funds your community, and hands-on help from the team — with {PARENT} marketing support for the projects that earn it.
        </p>
        <div className="ctarow" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <Link className="btn primary lg" href="/incubator/elysium/launch">Launch through EARLY →</Link>
          <a className="btn lg" href="#how">How it works</a>
        </div>
        <div className="pill-row">
          <span className="tag soft">One transaction</span><span className="tag soft">Liquidity locked forever</span><span className="tag soft">Fee split enforced on-chain</span><span className="tag soft">No custom contracts — Montra&apos;s own</span>
        </div>
      </section>

      <section className="blk" style={{ paddingTop: 18 }}>
        <div className="stats">
          <div className="stat"><div className="v">{mine == null ? "…" : totals.n}</div><div className="k muted">Projects incubated</div></div>
          <div className="stat"><div className="v">{mine == null ? "…" : usd(totals.mcap)}</div><div className="k muted">Combined market cap</div></div>
          <div className="stat"><div className="v">{mine == null ? "…" : usd(totals.vol)}</div><div className="k muted">24h volume</div></div>
          <div className="stat"><div className="v">{mine == null ? "…" : totals.holders.toLocaleString()}</div><div className="k muted">Combined holders</div></div>
        </div>
      </section>

      <section className="blk">
        <div className="sechead"><div><div className="eyebrow">Directory</div><h2>Incubated projects</h2></div>
          <a className="muted" style={{ fontSize: ".8rem" }} href="#fees">Every token whose fees fund the EARLY buybacks ↓</a></div>
        <div className="tabs">{(["trending", "latest", "top"] as Tab[]).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "top" ? "Top market cap" : t[0].toUpperCase() + t.slice(1)}</button>)}</div>
        {mine == null ? <div className="empty">Loading the directory from Montra…</div> :
          <TokenTable tokens={sorted} empty={<><b style={{ color: "var(--fg)" }}>Be the first project in the incubator.</b><br />Launch through EARLY and you&apos;ll appear here the moment your first trade lands. <Link href="/incubator/elysium/launch" style={{ textDecoration: "underline" }}>Launch now →</Link></>} />}
        {err && <p className="muted" style={{ marginTop: 10, fontSize: ".85rem" }}>{err}</p>}
      </section>

      <section className="blk" id="how">
        <div className="sechead"><div><div className="eyebrow">How it works</div><h2>Three steps. No new contracts.</h2></div></div>
        <div className="steps3">
          <div className="step-card"><div className="n">1</div><h3>Launch on Montra, through EARLY</h3><p className="muted">Same Montra factory, same locked liquidity, same one transaction from your own wallet. Your trading fees are routed to buybacks for your community, our supporters and a Builder Fund (KNTQ + MONTRA).</p></div>
          <div className="step-card"><div className="n">2</div><h3>Get your launch kit and the team</h3><p className="muted">Your project page comes with a launch post, thread, pinned welcome, FAQ and a 7-day plan filled in from your live data — and we review every incubated launch by hand to help you grow.</p></div>
          <div className="step-card"><div className="n">3</div><h3>Grow with the network</h3><p className="muted">You&apos;re listed in the directory and can apply for {PARENT} spotlights, art, memes and campaigns. Support is approved case by case, never automatic.</p></div>
        </div>
      </section>

      <section className="blk" id="fees">
        <div className="sechead"><div><div className="eyebrow">Where every fee goes</div><h2>100% of the creator side goes back into buybacks</h2></div></div>
        <div className="card pad">
          <p className="muted" style={{ maxWidth: "72ch" }}>Every trade on Montra pays one fee (1–10%, picked at launch). Montra keeps 0.4% and liquidity providers get a small cut; the rest is the <b style={{ color: "var(--fg)" }}>creator side</b>. On an incubated token, Montra&apos;s own splitter sends it to three public wallets, fixed at launch:</p>
          <div className="bar3">{SLOTS.map((s, i) => <i key={s.key} className={["c", "t", "h", "t"][i]} style={{ width: `${s.bps / 100}%` }} />)}</div>
          <div className="split3" style={{ marginTop: 14 }}>
            {SLOTS.map((s) => (
              <div key={s.key} className="slot"><div className="p">{s.bps / 100}%</div><div className="who">{s.name}</div>
                <small>{s.desc} <a href={explorerAddr(s.wallet)} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Public wallet ↗</a></small></div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: ".84rem", marginTop: 14 }}>Buybacks are made by the EARLY team by hand for now (automation comes later), at our discretion and when fees allow — no amounts or schedule are promised. Every wallet is public, so you can check them any time. Montra may also pay EARLY a share of its own 0.4% through the Montra Builders programme; that comes out of Montra&apos;s cut.</p>
        </div>
      </section>

      <section className="blk">
        <div className="sechead"><div><div className="eyebrow">Launchpads</div><h2>Built on top, not instead</h2></div></div>
        <div className="lpcards">
          {LAUNCHPADS.map((lp) => (
            <div key={lp.key} className={`lp ${lp.live ? "live" : ""}`}>
              <span className={`tag badge ${lp.live ? "mint" : "soft"}`}>{lp.live ? "Live" : `Coming ${lp.when}`}</span>
              <h3>{lp.name}</h3>
              <p className="muted">{lp.pitch}</p>
              <p style={{ marginTop: 10, fontWeight: 700, fontSize: ".92rem" }}>{lp.split}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {lp.live ? <Link className="btn sm ink" href="/incubator/elysium/launch">Launch on {lp.name}</Link> : <button className="btn sm" disabled>Launching {lp.when}</button>}
                <a className="btn sm ghost" href={lp.docs} target="_blank" rel="noreferrer">Docs ↗</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {trending.length > 0 && (
        <section className="blk">
          <div className="sechead"><div><div className="eyebrow">Market context</div><h2>Trending on Montra right now</h2></div><span className="muted" style={{ fontSize: ".85rem" }}>Not incubated — shown for context. Open any to see a project page.</span></div>
          <TokenTable tokens={trending} empty={null} />
        </section>
      )}

      <section className="blk">
        <div className="cta-band">
          <div><div className="big" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.6rem" }}>Ready when you are.</div><div>One transaction on Montra. Your launch kit is ready the moment it confirms.</div></div>
          <Link className="btn dark lg" href="/incubator/elysium/launch">Launch through EARLY →</Link>
        </div>
      </section>
    </>
  );
}
