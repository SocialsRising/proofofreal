"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bonus, RichDesc } from "../_components/Bits";
import { BUYBACKS, LAUNCHPADS, LINKS, PARENT, PERKS, RESULTS, SLOTS, explorerAddr, launchpad, type Result } from "../_lib/config";
import { montra, pct, safeUrl, usd, ago, type DirToken, type TokenCard } from "../_lib/montra";

type Tab = "trending" | "latest" | "top";

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function TokenTable({ tokens, empty }: { tokens: DirToken[]; empty: React.ReactNode }) {
  const router = useRouter();
  if (!tokens.length) return <div className="empty">{empty}</div>;
  return (
    <div className="scroll-x tablecard">
      <table className="ptable">
        <thead><tr><th>Project</th><th className="num">Market cap</th><th className="num">24h vol</th><th className="num">24h</th><th className="num">Holders</th><th className="num">Launched</th></tr></thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.address} className="row" onClick={() => router.push(`/incubator/elysium/p/${t.address}`)}>
              <td><Link className="tok" href={`/incubator/elysium/p/${t.address}`} onClick={(e) => e.stopPropagation()}>{t.imageUrl ? <img src={t.imageUrl} alt="" loading="lazy" /> : <span className="ph" />}<span><b>{t.name}</b><small>${t.symbol} · {launchpad(t.launchpad).name}</small></span></Link></td>
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

function ResultCard({ r, live }: { r: Result; live?: TokenCard }) {
  return (
    <article className="result">
      <header>
        {safeUrl(live?.imageUrl) ? <img src={safeUrl(live?.imageUrl)!} alt="" /> : <span className="ph" />}
        <div><b>{r.name}</b>{r.ticker && <small>${r.ticker}</small>}</div>
        <span className="date">{r.date}</span>
      </header>
      <h3>{r.headline}</h3>
      {r.points && <ul>{r.points.map((p) => <li key={p}>{p}</li>)}</ul>}
      {r.quote && <blockquote>“{r.quote.text}”<cite>— {r.quote.href ? <a href={r.quote.href} target="_blank" rel="noopener noreferrer">{r.quote.by}</a> : r.quote.by}</cite></blockquote>}
      {live && (
        <dl className="live">
          <div><dt>Market cap</dt><dd>{usd(live.marketCapUsd)}</dd></div>
          <div><dt>24h</dt><dd className={(live.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(live.change24hPct)}</dd></div>
          <div><dt>Holders</dt><dd>{live.holders > 0 ? live.holders.toLocaleString() : "—"}</dd></div>
        </dl>
      )}
      {r.links && <div className="rlinks">{r.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</div>}
    </article>
  );
}

export default function IncubatorHome() {
  const [mine, setMine] = useState<DirToken[] | null>(null);
  const [live, setLive] = useState<Record<string, TokenCard>>({});
  const [tab, setTab] = useState<Tab>("trending");
  const [err, setErr] = useState("");

  useEffect(() => {
    montra.incubated().then(setMine).catch(() => { setMine([]); setErr("Montra's API is busy — the list will refresh shortly."); });
    const id = setInterval(() => montra.incubated().then(setMine).catch(() => {}), 60_000);
    Promise.all(RESULTS.filter((r) => r.token).map((r) => montra.token(r.token!).then((d) => [r.token!, d] as const).catch(() => null)))
      .then((xs) => setLive(Object.fromEntries(xs.filter(Boolean) as [string, TokenCard][])));
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
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow live"><i />Live on {LAUNCHPADS.map((l) => l.name).join(" and ")} · Elysium</div>
          <h1>Launch with a team<br /><span className="dim">behind you.</span></h1>
          <p className="lead">Launch your token through EARLY and the {PARENT} team and creators get behind it from day one. Your most active holders earn airdrop rewards, and every trade funds daily buybacks for your community.</p>
          <ul className="checks">
            <li><Check />{PARENT} team + creator marketing</li>
            <li><Check />Airdrop rewards for active holders</li>
            <li><Check />Daily buybacks from every trade</li>
            <li><Check />Whole supply in the pool from day one</li>
          </ul>
          <div className="ctas">
            <Link className="btn primary lg" href="/incubator/elysium/launch">Launch a token</Link>
            <a className="btn lg" href="#perks">See what you get</a>
          </div>
          <div className="hero-bonus">{LAUNCHPADS.map((l) => <Bonus key={l.key} lp={l} />)}</div>
        </div>
        <div className="hero-art" aria-hidden><img src="/incubator/early-bird.webp" alt="" width={720} height={720} /></div>
      </section>

      <section className="statline" aria-label="Incubator numbers">
        <div><b>{mine == null ? "…" : totals.n}</b><span>Projects incubated</span></div>
        <div><b>{mine == null ? "…" : usd(totals.mcap)}</b><span>Combined market cap</span></div>
        <div><b>{mine == null ? "…" : totals.holders.toLocaleString()}</b><span>Combined holders</span></div>
      </section>

      <section className="blk" id="perks">
        <div className="sh"><div className="eyebrow">What you get</div><h2>More than a launch button</h2><p>Every project launched through EARLY gets the people and the incentives to grow.</p></div>
        <div className="perks">
          {PERKS.map((p, i) => <div key={p.title} className="perk"><span className="n">{String(i + 1).padStart(2, "0")}</span><h3>{p.title}</h3><p>{p.text}</p></div>)}
        </div>
      </section>

      <section className="blk" id="how">
        <div className="sh"><div className="eyebrow">How it works</div><h2>Three steps</h2></div>
        <ol className="steps">
          <li><span className="n">01</span><h3>Launch</h3><p>Pick Montra or Volta, a name, image and fee, then confirm one transaction. The whole supply goes straight into the pool.</p></li>
          <li><span className="n">02</span><h3>We get to work</h3><p>The team and {PARENT} creators help you build your community and push your launch.</p></li>
          <li><span className="n">03</span><h3>Fees flow back</h3><p>Every trade funds daily buybacks that reward your community and grow your Builder Fund.</p></li>
        </ol>
      </section>

      <section className="blk" id="fees">
        <div className="sh"><div className="eyebrow">Where every fee goes</div><h2>Every trade works for your community</h2><p>Pick your fee at launch: 3%, 5% or 10% on Montra, 3% or 5% on Volta. On Montra, after its 0.4% (plus a 0.5–1% liquidity share once a token passes its LP line), the rest is split on-chain to three public wallets. On Volta, Volta keeps 30% and the other 70% goes to EARLY&apos;s community wallet, which holds the creator NFT and splits it the same way.</p></div>
        <div className="feesplit">
          <div className="bar3" role="img" aria-label={SLOTS.map((s) => `${s.bps / 100}% ${s.name}`).join(", ")}>{SLOTS.map((s, i) => <i key={s.key} className={["a", "b", "c", "b"][i]} style={{ width: `${s.bps / 100}%` }} />)}</div>
          <div className="split3">
            {SLOTS.map((s, i) => (
              <div key={s.key} className="slot"><div className="p"><i className={["a", "b", "c", "b"][i]} />{s.bps / 100}%</div><div className="who">{s.name}</div>
                <p><RichDesc text={s.desc} /></p>
                <a className="wl" href={explorerAddr(s.wallet)} target="_blank" rel="noopener noreferrer">View wallet ↗</a></div>
            ))}
          </div>
          <p className="feefoot"><b>{BUYBACKS}</b> The wallets are run by EARLY and shared by every incubated project, and each launch&apos;s fee route is public on-chain. Amounts depend on trading volume. Separately, EARLY earns a share of Montra&apos;s own 0.4% through Montra Builders, never from your fees.</p>
        </div>
      </section>

      <section className="blk" id="results">
        <div className="sh"><div className="eyebrow">Incubator results</div><h2>Projects growing with EARLY</h2><p>Launches, partners and price action from projects in the incubator, updated every week.</p></div>
        <div className="results">
          {RESULTS.map((r) => <ResultCard key={r.name} r={r} live={r.token ? live[r.token] : undefined} />)}
          <Link className="result next" href="/incubator/elysium/launch"><span className="eyebrow">Your project here</span><h3>Your launch could be next week&apos;s story.</h3><span className="go">Launch through EARLY →</span></Link>
        </div>
      </section>

      <section className="blk" id="projects">
        <div className="sh row"><div><div className="eyebrow">Directory</div><h2>Incubated projects</h2></div>
          <div className="tabs">{(["trending", "latest", "top"] as Tab[]).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "top" ? "Top market cap" : t[0].toUpperCase() + t.slice(1)}</button>)}</div></div>
        {mine == null ? <div className="empty">Loading projects…</div> :
          <TokenTable tokens={sorted} empty={<><b style={{ color: "var(--fg)" }}>Be the first project in the incubator.</b><br />You&apos;ll show up here after your first trade. <Link href="/incubator/elysium/launch" style={{ textDecoration: "underline" }}>Launch now</Link></>} />}
        {err && <p className="muted" style={{ marginTop: 10, fontSize: ".85rem" }}>{err}</p>}
      </section>

      <section className="blk">
        <div className="about">
          <div><div className="eyebrow">About EARLY</div><h2>Want to know the team, and why we launched EARLY?</h2><p>Read the story behind the incubator and the people building it.</p></div>
          <a className="btn lg" href={LINKS.article} target="_blank" rel="noopener noreferrer">Read the article on X ↗</a>
        </div>
      </section>

      <section className="blk">
        <div className="cta">
          <img src="/incubator/early-bird.webp" alt="" aria-hidden />
          <div><h2>Ready when you are.</h2><p>One transaction. Your launch kit and the team are ready the moment it confirms.</p></div>
          <Link className="btn primary lg" href="/incubator/elysium/launch">Launch a token</Link>
        </div>
      </section>
    </>
  );
}
