// The incubator directory across launchpads (Montra + Volta), verified against each one's data and cached at Vercel's
// edge for a minute, so every visitor shares one lookup instead of each browser asking about every project.
import { NextResponse } from "next/server";
import { hypeUsd, loadDirectory } from "../../../incubator/_lib/montra";
import { loadVoltaDirectory } from "../../../incubator/_lib/volta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // One launchpad being down must not empty the other's list.
  const [montra, usd] = await Promise.all([loadDirectory().catch(() => null), hypeUsd()]);
  const volta = await loadVoltaDirectory(usd).catch(() => null);
  if (!montra && !volta) return NextResponse.json({ error: "The launchpads' data is busy. Try again shortly." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ tokens: [...(montra ?? []), ...(volta ?? [])], partial: !montra || !volta }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
