"use client";
import Link from "next/link";
import { Art } from "./_components/Art";
import { NightCard, Stat, TokenCard } from "./_components/Cards";
import { EXAMPLE_NIGHTS, EXAMPLE_TOKENS } from "./_lib/mock";
import { useTokens } from "./_lib/useTokens";
import { usd } from "./_lib/format";

export default function Home() {
  const { data: tokens = EXAMPLE_TOKENS } = useTokens();
  const real = tokens.filter((t) => !t.example);
  const featured = [...real, ...EXAMPLE_TOKENS.filter((t) => ["lmeow", "pixl", "dngn"].includes(t.address))].slice(0, 3);
  const lm = EXAMPLE_TOKENS[0];
  const vol = tokens.reduce((a, t) => a + (t.example?.vol24 ?? 0), 0);
  const paid = tokens.reduce((a, t) => a + (t.example?.rewardsEth ?? 0), 0);
  const upcoming = EXAMPLE_NIGHTS.filter((n) => n.status === "upcoming");
  const byId = (id: string) => tokens.find((t) => t.address === id);

  return (
    <>
      <div className="hero">
        <div>
          <h1>Launch a token.<br />Build a game.<br /><span className="chrome-text">Grow your community.</span></h1>
          <p className="sub">Launch a token for your game, IP, or community in minutes. Holders are paid every Sunday with a variety of stock tokens, experimental AI agents, and new exciting NFTs.</p>
          <div className="ctas"><Link className="btn primary lg" href="/launchpad/launch">Launch Token</Link><Link className="btn lg" href="/launchpad/explore">Explore Games</Link></div>
        </div>
        <div className="pile">
          <Link className="card tcard p1" href="/launchpad/token/pixl"><Art symbol="PIXL" /><div className="body"><span className="name">Pixel Pals</span></div></Link>
          <Link className="card tcard p2" href="/launchpad/token/dngn"><Art symbol="DNGN" /><div className="body"><span className="name">Dungeo</span></div></Link>
          <Link className="card tcard p3" href="/launchpad/token/lmeow"><Art symbol="LMEOW" /><div className="body"><div className="row"><span className="name">LMEOW</span><span className="tag mint mono">+12.4%</span></div></div></Link>
        </div>
      </div>

      <div className="stats">
        <Stat v={tokens.length} k="Tokens launched" />
        <Stat v={usd(vol)} k="24h volume" />
        <Stat v={`${paid.toFixed(2)} ETH`} k="Paid to holders" />
        <Stat v={upcoming.length} k="Game nights this week" />
      </div>

      <section className="blk">
        <div className="sechead"><h2>{real.length ? "Latest launches" : "Featured tokens"}</h2><Link href="/launchpad/explore">See all →</Link></div>
        <div className="grid g3">{featured.map((t) => <TokenCard key={t.address} t={t} />)}</div>
      </section>

      <section className="blk">
        <div className="sechead"><h2>Game nights</h2><Link href="/launchpad/explore">All nights →</Link></div>
        <div className="grid">{upcoming.map((n) => <NightCard key={n.id} n={n} t={byId(n.token)} />)}</div>
      </section>

      <section className="blk">
        <div className="case">
          <div>
            <div className="eyebrow" style={{ color: "var(--fg-2)" }}>Case study · the first token through the launchpad</div>
            <div className="big" style={{ margin: "10px 0 16px" }}>How LMEOW turned a meme into a Friday night.</div>
            <div className="flow">{["Meme Maxxers", "LMEOW", "Multiplayer games", "Weekly game nights", "Rewards", "Sponsors", "Community growth"].map((s, i, a) => <span key={s} style={{ display: "contents" }}><span className="step">{s}</span>{i < a.length - 1 && <span className="arr">→</span>}</span>)}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}><Link className="btn primary" href="/launchpad/token/lmeow">See LMEOW</Link><Link className="btn" href="/launchpad/night/n0">Last game night results</Link></div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[["Founder locked", `${lm.lockPct}% · ${lm.lockDays} days`], ["Supply staked", `${lm.example!.stakedPct}%`], ["Paid to holders", `${lm.example!.rewardsEth} ETH`], ["Game nights run", "1 (next: Fri)"]].map(([k, v]) => <div key={k} className="kvbox"><span>{k}</span><b className="mono">{v}</b></div>)}
          </div>
        </div>
      </section>

      <section className="blk">
        <div className="sechead"><h2>Three moves. That&apos;s the whole product.</h2></div>
        <div className="grid g3">
          {[["1", "Launch", "Image, name, ticker, description. Pick a 1–4% creator fee and how much of it goes to your stakers. Done.", "/launchpad/launch", "Launch Token"],
            ["2", "Build a game", "Use an AI game builder, paste the URL, and it appears on your token page with a Play button.", "/launchpad/build", "How it works"],
            ["3", "Host a game night", "Set a time and a prize. Players show up, winners get paid, clips get shared.", "/launchpad/incubate", "Get help"]].map(([n, h, p, l, c]) => (
            <div key={h} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}><div className="step-c" style={{ padding: 0, border: 0, background: "none" }}><div className="n">{n}</div></div><h3>{h}</h3><p className="muted">{p}</p><div style={{ marginTop: "auto" }}><Link className="btn sm" href={l}>{c}</Link></div></div>
          ))}
        </div>
      </section>
    </>
  );
}
