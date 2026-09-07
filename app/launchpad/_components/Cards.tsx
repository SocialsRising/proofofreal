import Link from "next/link";
import type { GameNight, LaunchToken } from "../_lib/types";
import { Art } from "./Art";

export function TokenCard({ t }: { t: LaunchToken }) {
  const ex = t.example;
  return (
    <Link className="card tcard" href={`/launchpad/token/${t.address}`}>
      <Art symbol={t.symbol} image={t.image} />
      <div className="body">
        <div className="row"><span className="name">{t.name}</span><span className="mono muted">${t.symbol}</span></div>
        <p className="muted" style={{ fontSize: ".9rem" }}>{ex?.tagline ?? t.description ?? "Freshly launched."}</p>
        <div className="row" style={{ marginTop: 6 }}>
          {ex ? <span className={`tag ${ex.change >= 0 ? "mint" : "tabby"} mono`}>{ex.change >= 0 ? "+" : ""}{ex.change}%</span> : <span className="tag lemon">Live on Base</span>}
          {t.lockPct ? <span className="tag soft">Locked {t.lockPct}% · {t.lockDays}d</span> : <span className="tag soft">No founder lock</span>}
        </div>
      </div>
    </Link>
  );
}

export function NightCard({ n, t }: { n: GameNight; t?: LaunchToken }) {
  return (
    <Link className="card night" href={`/launchpad/night/${n.id}`}>
      <div className="date"><b>{n.day}</b><small>{n.mon}</small></div>
      <div>
        <div className="eyebrow">{n.status === "done" ? "Finished" : "Upcoming game night"}</div>
        <h3 style={{ margin: "4px 0 6px" }}>{n.title}</h3>
        <div className="muted" style={{ fontSize: ".9rem" }}>{n.when} · {n.players} players{n.sponsor ? ` · Sponsored by ${n.sponsor}` : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {t && <Art symbol={t.symbol} image={t.image} size="sm" />}
        <div><div className="eyebrow">Prize pool</div><b className="mono">{n.prize}</b></div>
      </div>
    </Link>
  );
}

export function Stat({ v, k }: { v: React.ReactNode; k: string }) {
  return <div className="stat"><div className="v mono">{v}</div><div className="k">{k}</div></div>;
}
