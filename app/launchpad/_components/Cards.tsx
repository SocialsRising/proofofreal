import Link from "next/link";
import type { LaunchToken } from "../_lib/types";
import { chainById } from "../_lib/chains";
import { pipsToPct, V4_PROTOCOL_FEE_PCT } from "../_lib/presets";
import { Art } from "./Art";

/** Total trading fee for a token as a display string ("6% fee"). */
export function feeLabel(t: LaunchToken) {
  if (t.version === "v4" && t.creatorFeePips !== undefined) return `${+(V4_PROTOCOL_FEE_PCT + pipsToPct(t.creatorFeePips)).toFixed(2)}% fee`;
  return "1% fee";
}

export function TokenCard({ t }: { t: LaunchToken }) {
  const chain = chainById(t.chainId);
  return (
    <Link className="card tcard" href={`/launchpad/token/${t.address}`}>
      <Art symbol={t.symbol} image={t.image} />
      <div className="body">
        <div className="row"><span className="name">{t.name}</span><span className="mono muted">${t.symbol}</span></div>
        <p className="muted clamp2" style={{ fontSize: ".9rem" }}>{t.description || "Freshly launched."}</p>
        <div className="row" style={{ marginTop: 6, justifyContent: "flex-start", flexWrap: "wrap" }}>
          <span className="tag lemon">Live{chain ? ` on ${chain.short}` : ""}</span>
          <span className="tag soft mono">{feeLabel(t)}</span>
          {t.lockPct ? <span className="tag soft">Locked {t.lockPct}% · {t.lockDays}d</span> : null}
        </div>
      </div>
    </Link>
  );
}

export function Stat({ v, k, hint }: { v: React.ReactNode; k: string; hint?: string }) {
  return <div className="stat" title={hint}><div className="v mono">{v}</div><div className="k">{k}</div></div>;
}
