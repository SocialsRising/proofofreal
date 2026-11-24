// The incubator directory, verified against Montra's data and cached at Vercel's edge for a minute, so every visitor
// shares one lookup instead of each browser asking about every project.
import { NextResponse } from "next/server";
import { loadDirectory, type DirToken } from "../../../incubator/_lib/montra";
import { rateLimited } from "../olympus/_limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One lookup per instance per minute, whatever the query string (the CDN key includes it, this memo doesn't).
let memo: { at: number; tokens: Promise<DirToken[] | null> } | null = null;

export async function GET(req: Request) {
  if (rateLimited(req, "directory", 30)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  if (!memo || Date.now() - memo.at > 60_000) memo = { at: Date.now(), tokens: loadDirectory().catch(() => null) };
  const tokens = await memo.tokens;
  if (!tokens) memo = null;
  if (!tokens) return NextResponse.json({ error: "Montra's data is busy. Try again shortly." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ tokens }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
