// Token search for the Olympus terminal, through Kalos's router index (Kalos doesn't allow browser calls from other sites).
import { NextResponse } from "next/server";
import { KALOS_QUOTER } from "../../../../incubator/_lib/olympus";
import { rateLimited } from "../_limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KalosToken = { address: string; symbol: string; name: string; decimals: number; priced?: boolean; hookOnly?: boolean; venues?: string[] };

export async function GET(req: Request) {
  if (rateLimited(req, "tokens", 60)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().replace(/^\$/, "");
  if (!/^[A-Za-z0-9 ._-]{1,42}$/.test(q)) return NextResponse.json({ tokens: [] });
  try {
    const r = await fetch(`${KALOS_QUOTER}/v1/tokens?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const list = ((await r.json()) as { tokens?: KalosToken[] }).tokens ?? [];
    const tokens = list
      .filter((t) => /^0x[0-9a-fA-F]{40}$/.test(t.address) && t.priced !== false && Number.isInteger(t.decimals))
      .slice(0, 30)
      .map((t) => ({ address: t.address.toLowerCase(), symbol: String(t.symbol).slice(0, 16), name: String(t.name).slice(0, 48), decimals: t.decimals }));
    return NextResponse.json({ tokens }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ error: "Kalos's index is busy. Try again in a moment." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
