// Tokens that Kalos Swap (Kalos's aggregator, the route that earns Kalos Season 1 points) can open from a link.
// Kalos Swap only pre-selects tokens from this list; anything else falls back to its default pair.
import { NextResponse } from "next/server";
import { rateLimited } from "../_limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { address?: unknown; wrappedNative?: unknown };

export async function GET(req: Request) {
  if (rateLimited(req, "swap", 30)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  try {
    const tokens: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const q = new URLSearchParams({ limit: "100" });
      if (cursor) q.set("cursor", cursor);
      const r = await fetch(`https://api.kalos.fun/v2/dex/tokens?${q}`, { signal: AbortSignal.timeout(10000), cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { rows?: Row[]; next?: unknown };
      for (const t of d.rows ?? []) if (typeof t.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(t.address) && t.wrappedNative !== true) tokens.push(t.address.toLowerCase());
      cursor = typeof d.next === "string" && d.next ? d.next : null;
      if (!cursor) break;
    }
    return NextResponse.json({ tokens }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch {
    return NextResponse.json({ tokens: [], error: "Kalos is busy." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
