"use client";
import { use } from "react";
import Link from "next/link";
import { Stat } from "../../_components/Cards";
import { useToast } from "../../_components/Toast";
import { EXAMPLE_NIGHTS, EXAMPLE_TOKENS, paletteFor } from "../../_lib/mock";
import { useAccount } from "wagmi";

export default function Night({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const n = EXAMPLE_NIGHTS.find((x) => x.id === id);
  const toast = useToast();
  const { address } = useAccount();
  if (!n) return <div className="empty" style={{ marginTop: 40 }}>Game night not found.</div>;
  const t = EXAMPLE_TOKENS.find((x) => x.address === n.token)!;
  const [a] = paletteFor(t.symbol);
  return (
    <>
      <div className="thead" style={{ gridTemplateColumns: "1fr" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><Link className="tag" href={`/launchpad/token/${t.address}`}>{t.name} · ${t.symbol}</Link><span className={`tag ${n.status === "done" ? "soft" : "lemon"}`}>{n.status === "done" ? "Finished" : "Upcoming"}</span>{n.sponsor && <span className="tag grape">Sponsored by {n.sponsor}</span>}</div>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,3.2rem)" }}>{n.title}</h1>
          <div className="stats">
            <div className="stat"><div className="v" style={{ fontSize: "1.1rem" }}>{n.when}</div><div className="k">Start</div></div>
            <div className="stat"><div className="v mono" style={{ fontSize: "1.1rem" }}>{n.prize}</div><div className="k">Prize pool</div></div>
            <Stat v={n.players} k={n.status === "done" ? "Players" : "Spots"} />
            <div className="stat"><div className="v" style={{ fontSize: "1.1rem" }}>{t.gameName ?? "—"}</div><div className="k">Game</div></div>
          </div>
          <div className="ctarow" style={{ maxWidth: 560 }}>
            {n.status === "done" ? <button className="btn" onClick={() => toast("Clips coming soon")}>Watch clips</button> : <button className="btn primary lg" onClick={() => toast(address ? "You're in! We'll ping your wallet's chat." : "Connect a wallet first")}>Join game night</button>}
            <Link className="btn lg" href="/launchpad/incubate#sponsor">Sponsor a game night</Link>
          </div>
        </div>
      </div>
      <div className="grid g2" style={{ marginTop: 20 }}>
        <div className="card pad">
          <h3 style={{ marginBottom: 10 }}>{n.status === "done" ? "Leaderboard & payouts" : "How it works"}</h3>
          {n.status === "done" ? <div className="lb">{n.leaderboard.map((r, i) => <div key={r.n} className="row"><span className="pos">{i + 1}</span><span>{r.n} <span className="muted" style={{ fontSize: ".85rem" }}>· {r.s}</span></span><b className="mono">{r.r}</b></div>)}</div>
            : <div style={{ display: "grid", gap: 10 }}>{[`Hold any amount of ${t.symbol} to enter.`, "Join the lobby 10 minutes before start.", "Top 5 split the prize pool. Paid out within 24h.", "Clips and results land on this page."].map((s) => <div key={s} className="kv"><span>{s}</span></div>)}</div>}
        </div>
        <div className="card pad" style={{ display: "grid", gap: 10 }}>
          <h3>{t.gameName ?? "Game"}</h3>
          <div className="art" style={{ aspectRatio: "16/9", background: `linear-gradient(135deg,${a},#07070A)` }}><span style={{ fontSize: "1.4rem", opacity: .85 }}>▶ {t.example?.gameKind ?? ""}</span></div>
          <p className="muted">{t.example?.tagline}</p>
        </div>
      </div>
    </>
  );
}
