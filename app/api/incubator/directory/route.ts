// The incubator directory, verified against Montra and cached at Vercel's edge for a minute,
// so every visitor shares one lookup instead of each browser asking Montra about every project.
import { NextResponse } from "next/server";
import { loadDirectory } from "../../../incubator/_lib/montra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tokens = await loadDirectory();
    return NextResponse.json({ tokens }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "Montra's API is busy. Try again shortly." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
