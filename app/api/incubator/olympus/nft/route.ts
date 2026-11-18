// Early Birds' market on Kalos (floor, volume, owners), read from Kalos's marketplace state and cached for a few minutes.
// Answers { listed: false } until Kalos lists the collection.
import { NextResponse } from "next/server";
import { EARLY_BIRDS, type OlyNft } from "../../../../incubator/_lib/olympus";
import { rateLimited } from "../_limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KalosState = { collections?: { slug: string; address: string }[]; stats?: Record<string, { floor?: string; floor1d?: string; volume24h?: string; owners?: number; listed?: number; topBid?: string; floorSeries?: string[] }> };
const wei = (v: unknown) => (typeof v === "string" && /^\d{1,40}$/.test(v) ? v : null);

export async function GET(req: Request) {
  if (rateLimited(req, "nft", 30)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  try {
    const r = await fetch("https://api.kalos.fun/v2/market/state", { signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const state = (await r.json()) as KalosState;
    const col = state.collections?.find((c) => c.address?.toLowerCase() === EARLY_BIRDS.address);
    const s = col ? state.stats?.[col.slug] : undefined;
    const out: OlyNft = !col ? { listed: false } : {
      listed: true, slug: String(col.slug).slice(0, 64), floor: wei(s?.floor), floor1d: wei(s?.floor1d), volume24h: wei(s?.volume24h), topBid: wei(s?.topBid),
      owners: Number.isInteger(s?.owners) ? s!.owners! : null, listedCount: Number.isInteger(s?.listed) ? s!.listed! : null,
      floorSeries: (s?.floorSeries ?? []).map(wei).filter((x): x is string => !!x).slice(-14),
    };
    return NextResponse.json(out, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch {
    return NextResponse.json({ listed: false, error: "Kalos's marketplace is busy." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
