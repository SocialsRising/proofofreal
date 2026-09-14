"use client";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Reveal } from "./_components/Motion";
import { Stat, TokenCard } from "./_components/Cards";
import { useTokens } from "./_lib/useTokens";
import { CHAINS } from "./_lib/chains";
import { LaunchFactoryAbi } from "./_lib/abi";
import { LINKS } from "./_lib/config";
import { POOL_FEE_PCT } from "./_lib/presets";

const ORBIT_A = ["Research agent", "Sales agent", "Ops agent"];
const ORBIT_B = ["Trading fees", "Sunday payout", "Founder lock", "Locked liquidity"];
const ext = (h: string) => /^https?:/.test(h);

export default function Home() {
  const { data: tokens = [] } = useTokens();
  const rh = CHAINS.robinhood;
  const { data: launches } = useReadContract({ address: rh.factory, abi: LaunchFactoryAbi, functionName: "totalLaunches", chainId: rh.id, query: { enabled: !!rh.factory } });
  const latest = [...tokens].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow live"><i />Live on Robinhood Chain</div>
          <h1>Launch a token.<br />Run an AI agent business.<br /><span className="chrome-text">Pay your holders.</span></h1>
          <p className="sub">The launchpad for superstar founders running AI agent swarm businesses. One transaction launches your token with liquidity locked forever. Holders get paid every Sunday — nothing to stake, nothing to lock.</p>
          <div className="ctas">
            <Link className="btn primary lg" href="/launchpad/launch">Launch Token</Link>
            <Link className="btn lg" href="/launchpad/explore">Explore launches</Link>
            {ext(LINKS.docs) ? <a className="btn lg ghost" href={LINKS.docs} target="_blank" rel="noreferrer">Read the docs ↗</a> : <Link className="btn lg ghost" href={LINKS.docs}>Read the docs</Link>}
          </div>
        </div>
        <div className="orbit" aria-hidden>
          <div className="core"><span>$YOU</span><small>1B SUPPLY</small></div>
          <div className="ring r1">{ORBIT_A.map((n, i) => <div key={n} className="node" style={{ "--i": i, "--n": ORBIT_A.length } as React.CSSProperties}><b><span>{n}</span></b></div>)}</div>
          <div className="ring r2">{ORBIT_B.map((n, i) => <div key={n} className="node" style={{ "--i": i, "--n": ORBIT_B.length } as React.CSSProperties}><b><span>{n}</span></b></div>)}</div>
        </div>
      </div>

      <Reveal>
        <div className="stats">
          <Stat v={launches !== undefined ? Number(launches) : "—"} k="Tokens launched" hint="Read live from the factory contract" />
          <Stat v={`${POOL_FEE_PCT}%`} k="Fee on every trade" />
          <Stat v="Forever" k="Liquidity locked" />
          <Stat v="Sunday" k="Holder payouts" />
        </div>
      </Reveal>

      <section className="blk">
        <Reveal><div className="sechead"><h2>Three moves. That&apos;s the whole product.</h2></div></Reveal>
        <div className="grid g3">
          {[
            ["1", "Launch", "Image, name, ticker. One transaction mints 1B tokens, opens the pool and locks the liquidity forever. Lock some supply and buy in at the same time if you want the trust signal.", "/launchpad/launch", "Launch Token"],
            ["2", "Run your agent business", "Link the business your agents run. It sits on your token page for every holder to see, and your share of every trade funds it.", "/launchpad/docs#business", "How it works"],
            ["3", "Holders get paid", "Every Sunday we snapshot who holds and send rewards straight to their wallets — stock tokens, experimental AI agents and new NFTs. No staking contract.", "/launchpad/docs#soft-staking", "Soft staking, explained"],
          ].map(([n, h, p, l, c], i) => (
            <Reveal key={h} delay={i * 90}><div className="card pad step-card"><div className="n">{n}</div><h3>{h}</h3><p className="muted">{p}</p><div style={{ marginTop: "auto" }}><Link className="btn sm" href={l}>{c}</Link></div></div></Reveal>
          ))}
        </div>
      </section>

      <section className="blk">
        <Reveal>
          <div className="case">
            <div>
              <div className="eyebrow" style={{ color: "var(--fg-2)" }}>Soft staking</div>
              <div className="big" style={{ margin: "10px 0 16px" }}>Hold in your own wallet. Get paid every Sunday.</div>
              <p style={{ color: "var(--fg-2)", maxWidth: "52ch" }}>There is no staking contract to approve and nothing to lock. Every Sunday at 00:00 UTC we snapshot every wallet holding a launched token. Hold, and the payout lands in your wallet. Exchange, pool and vault wallets are excluded.</p>
              <div className="flow" style={{ marginTop: 20 }}>{["Buy & hold", "Sunday snapshot", "Rewards sent"].map((s, i, a) => <span key={s} style={{ display: "contents" }}><span className="step">{s}</span>{i < a.length - 1 && <span className="arr">→</span>}</span>)}</div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[["Snapshot", "Sundays · 00:00 UTC"], ["Funded by", "Holder share of trading fees"], ["Paid in", "Stock tokens · AI agents · NFTs"], ["Your action", "Hold. That is it."]].map(([k, v]) => <div key={k} className="kvbox"><span>{k}</span><b className="mono">{v}</b></div>)}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="blk">
        <Reveal><div className="sechead"><h2>Trust signals founders can&apos;t fake.</h2><Link href="/launchpad/docs#trust">Details →</Link></div></Reveal>
        <div className="grid g4">
          {[["🔒", "Founder lock", "Lock 2–10% of supply for 90–365 days in a vault nobody can open early. It shows on the token page and every share card."], ["◎", "Liquidity locked forever", "The LP position is held by a contract with no withdraw function. Not a timer — forever."], ["%", "Fee split set at birth", "Your split between you and the holder pool is written on-chain at launch and never changes."], ["Ξ", "Dev buy on the record", "Buy in during the launch transaction. The amount is public, so everyone knows what you put in."]].map(([ic, h, p], i) => (
            <Reveal key={h} delay={i * 70}><div className="trust v"><div className="badge">{ic}</div><div><div style={{ fontWeight: 800 }}>{h}</div><p className="muted" style={{ fontSize: ".9rem", marginTop: 4 }}>{p}</p></div></div></Reveal>
          ))}
        </div>
      </section>

      <section className="blk">
        <Reveal><div className="sechead"><h2>Latest launches</h2><Link href="/launchpad/explore">See all →</Link></div></Reveal>
        {latest.length ? <div className="grid g3">{latest.map((t, i) => <Reveal key={t.address} delay={i * 80}><TokenCard t={t} /></Reveal>)}</div>
          : <Reveal><div className="empty first"><div className="eyebrow">Nothing launched yet</div><div className="big-line">The first token gets the top spot.</div><Link className="btn primary" href="/launchpad/launch">Be first</Link></div></Reveal>}
      </section>

      <section className="blk">
        <Reveal>
          <div className="cta-band">
            <div><div className="eyebrow" style={{ color: "rgba(0,0,0,.55)" }}>Next release</div><div className="big">Pick your own 1–10% creator fee, on top of our 1%.</div></div>
            <Link className="btn lg dark" href="/launchpad/updates">Follow the build</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
