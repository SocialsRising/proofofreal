// The incubator directory, verified against Montra's data and cached at Vercel's edge for a minute, so every visitor
// shares one lookup instead of each browser asking about every project.
import { NextResponse } from "next/server";
import { loadDirectory } from "../../../incubator/_lib/montra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tokens = await loadDirectory().catch(() => null);
  if (!tokens) return NextResponse.json({ error: "Montra's data is busy. Try again shortly." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ tokens }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
