"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bonus, RichDesc } from "../_components/Bits";
import { BUYBACKS, LAUNCHPADS, SLOTS, explorerAddr } from "../_lib/config";
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
              <td className="num">{t.holders > 0 ? t.holders.toLocaleString() : "—"}</td>
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
  const [tab, setTab] = useState<Tab>("trending");
  const [err, setErr] = useState("");
  const montraLp = LAUNCHPADS[0];

  useEffect(() => {
    montra.incubated().then(setMine).catch(() => { setMine([]); setErr("Montra's API is busy — the list will refresh shortly."); });
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
    return { n: l.length, mcap: l.reduce((s, t) => s + (t.marketCapUsd ?? 0), 0), holders: l.reduce((s, t) => s + (t.holders ?? 0), 0) };
  }, [mine]);

  return (
    <>
      <section className="hero-inc">
        <div className="eyebrow live"><i />Live on {montraLp.name} · {montraLp.chain}</div>
        <h1 style={{ marginTop: 14, maxWidth: "15ch" }}>Launch like you <span className="chrome-text">already have a team.</span></h1>
        <p className="sub muted" style={{ maxWidth: "54ch", marginTop: 16, fontSize: "1.08rem" }}>
          Launch your token through EARLY. Every trading fee goes back into buybacks for your community, run daily by our AI agent swarm, and you get a launch kit and a team behind you.
        </p>
        <div className="ctarow" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <Link className="btn primary lg" href="/incubator/elysium/launch">Launch a token →</Link>
          <a className="btn lg" href="#how">How it works</a>
        </div>
        <div style={{ marginTop: 22, maxWidth: 640 }}><Bonus lp={montraLp} /></div>
      </section>

      <section className="blk" style={{ paddingTop: 18 }}>
        <div className="stats">
          <div className="stat"><div className="v">{mine == null ? "…" : totals.n}</div><div className="k muted">Projects incubated</div></div>
          <div className="stat"><div className="v">{mine == null ? "…" : usd(totals.mcap)}</div><div className="k muted">Combined market cap</div></div>
          <div className="stat"><div className="v">{mine == null ? "…" : totals.holders.toLocaleString()}</div><div className="k muted">Combined holders</div></div>
        </div>
      </section>

      <section className="blk">
        <div className="sechead"><div><div className="eyebrow">Directory</div><h2>Incubated projects</h2></div></div>
        <div className="tabs">{(["trending", "latest", "top"] as Tab[]).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "top" ? "Top market cap" : t[0].toUpperCase() + t.slice(1)}</button>)}</div>
        {mine == null ? <div className="empty">Loading projects…</div> :
          <TokenTable tokens={sorted} empty={<><b style={{ color: "var(--fg)" }}>Be the first project in the incubator.</b><br />You&apos;ll show up here after your first trade. <Link href="/incubator/elysium/launch" style={{ textDecoration: "underline" }}>Launch now →</Link></>} />}
        {err && <p className="muted" style={{ marginTop: 10, fontSize: ".85rem" }}>{err}</p>}
      </section>

      <section className="blk" id="how">
        <div className="sechead"><div><div className="eyebrow">How it works</div><h2>Three steps</h2></div></div>
        <div className="steps3">
          <div className="step-card"><div className="n">1</div><h3>Launch</h3><p className="muted">Pick a name, image and fee, then confirm one transaction from your wallet. Liquidity is locked forever.</p></div>
          <div className="step-card"><div className="n">2</div><h3>Buybacks start</h3><p className="muted">Trading fees flow to three public wallets. Our AI agent swarm uses them to buy back your token every day.</p></div>
          <div className="step-card"><div className="n">3</div><h3>Grow with us</h3><p className="muted">Your project page has a ready-to-post launch kit, and the team helps you grow from day one.</p></div>
        </div>
      </section>

      <section className="blk" id="fees">
        <div className="sechead"><div><div className="eyebrow">Where every fee goes</div><h2>Fees become buybacks</h2></div></div>
        <div className="card pad">
          <p className="muted" style={{ maxWidth: "68ch" }}>Each trade pays a fee you choose at launch (3%, 5% or 10%). After Montra&apos;s small cut, all of it is split between three public wallets, fixed on-chain forever:</p>
          <div className="bar3">{SLOTS.map((s, i) => <i key={s.key} className={["c", "t", "h", "t"][i]} style={{ width: `${s.bps / 100}%` }} />)}</div>
          <div className="split3" style={{ marginTop: 14 }}>
            {SLOTS.map((s) => (
              <div key={s.key} className="slot"><div className="p">{s.bps / 100}%</div><div className="who">{s.name}</div>
                <small><RichDesc text={s.desc} /> <a href={explorerAddr(s.wallet)} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Wallet ↗</a></small></div>
            ))}
          </div>
          <p style={{ fontSize: ".9rem", marginTop: 14 }}><b>{BUYBACKS}</b> <span className="muted">Amounts depend on trading volume, and every wallet is public so you can check it any time.</span></p>
        </div>
      </section>

      <section className="blk">
        <div className="cta-band">
          <div><div className="big" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.6rem" }}>Ready when you are.</div><div>One transaction. Your launch kit is ready the moment it confirms.</div></div>
          <Link className="btn dark lg" href="/incubator/elysium/launch">Launch a token →</Link>
        </div>
      </section>
    </>
  );
}
