"use client";
import { useState } from "react";
import { NightCard, TokenCard } from "../_components/Cards";
import { EXAMPLE_NIGHTS, EXAMPLE_TOKENS } from "../_lib/mock";
import { useTokens } from "../_lib/useTokens";

export default function Explore() {
  const { data: tokens = EXAMPLE_TOKENS } = useTokens();
  const [q, setQ] = useState("");
  const list = tokens.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.symbol.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="sechead"><h2>Game nights</h2><span className="muted">Live now · this week · past winners</span></div>
        <div className="grid">{EXAMPLE_NIGHTS.map((n) => <NightCard key={n.id} n={n} t={tokens.find((t) => t.address === n.token)} />)}</div>
      </section>
      <section className="blk">
        <div className="sechead"><h2>All tokens</h2><input className="inp" style={{ maxWidth: 260, padding: "10px 14px" }} placeholder="Search tokens" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="grid g3">{list.length ? list.map((t) => <TokenCard key={t.address} t={t} />) : <div className="empty">No tokens match that.</div>}</div>
        {tokens.some((t) => t.example) && <p className="muted" style={{ fontSize: ".8rem", marginTop: 14 }}>Tokens marked “Example” are illustrations of what a launch looks like, not live markets.</p>}
      </section>
    </>
  );
}
