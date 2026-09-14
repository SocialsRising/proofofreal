"use client";
import { useState } from "react";
import Link from "next/link";
import { TokenCard } from "../_components/Cards";
import { Reveal } from "../_components/Motion";
import { useTokens } from "../_lib/useTokens";

export default function Explore() {
  const { data: tokens = [], isLoading } = useTokens();
  const [q, setQ] = useState("");
  const list = [...tokens].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.symbol.toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="blk" style={{ paddingTop: 34 }}>
      <div className="sechead">
        <div><div className="eyebrow">Explore</div><h2 style={{ marginTop: 6 }}>Agent businesses with a token</h2></div>
        <input className="inp" style={{ maxWidth: 260, padding: "10px 14px" }} placeholder="Search name or ticker" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading ? <div className="empty">Loading…</div>
        : list.length ? <div className="grid g3">{list.map((t, i) => <Reveal key={t.address} delay={(i % 3) * 70}><TokenCard t={t} /></Reveal>)}</div>
        : tokens.length ? <div className="empty">No tokens match that.</div>
        : <div className="empty first"><div className="eyebrow">Nothing launched yet</div><div className="big-line">Every launch shows up here the moment it confirms.</div><Link className="btn primary" href="/launchpad/launch">Launch the first one</Link></div>}
    </section>
  );
}
