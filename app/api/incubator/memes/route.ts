// Meme launches through EARLY: Montra tokens on the meme template whose holders EARLY's treasury is among, with at
// least the minimum allocation. Read from the treasury's own holdings, so the list is also the allocation check.
import { NextResponse } from "next/server";
import { MEME } from "../../../incubator/_lib/config";
import { MONTRA_API, isMemeLaunch, pctOf, type MemeToken, type TokenCard } from "../../../incubator/_lib/montra";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    const out: MemeToken[] = [];
    for (let page = 1, pages = 1; page <= pages && page <= 10; page++) {
      const r = await fetch(`${MONTRA_API}/api/wallets/${MEME.treasury}/holdings?page=${page}&limit=100`, { signal: AbortSignal.timeout(15000), next: { revalidate: 60 } });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { holdings?: (TokenCard & { balance?: string })[]; pages?: number };
      for (const t of d.holdings ?? []) {
        const allocPct = pctOf(t.balance, t.supply);
        if (!/^0x[0-9a-fA-F]{40}$/.test(t.address) || !isMemeLaunch(t, allocPct)) continue;
        out.push({ address: t.address.toLowerCase(), name: String(t.name).slice(0, 40), symbol: String(t.symbol).slice(0, 16), imageUrl: /^https:\/\//.test(t.imageUrl ?? "") ? t.imageUrl : null,
          marketCapUsd: t.marketCapUsd, change24hPct: t.change24hPct, holders: t.holders, launchedAt: t.launchedAt, allocPct });
      }
      pages = Math.max(1, Number(d.pages) || 1);
    }
    out.sort((a, b) => b.launchedAt - a.launchedAt);
    return NextResponse.json({ tokens: out }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ tokens: [], error: "Montra is busy. Try again in a moment." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
