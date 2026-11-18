// Live quotes for the Olympus terminal from Kalos's router. Read-only: nothing here builds or signs a trade.
// Every quote is checked against the token's own launchpad pool (Montra or Volta) when it has one: Kalos can route
// launchpad tokens through thin or high-fee pools that pay a fraction of the real price, so the terminal points traders
// at the launchpad's own pool whenever Kalos's route is clearly worse.
import { NextResponse } from "next/server";
import { parseUnits } from "viem";
import { hypeUsd } from "../../../../incubator/_lib/montra";
import { KALOS_QUOTER, WHYPE, type OlyQuote } from "../../../../incubator/_lib/olympus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();
function limited(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown", now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const k of hits.keys()) { hits.delete(k); if (hits.size < 4000) break; }
  return list.length > 90;
}

type KalosRoute = { amountOut: string | null; minimumOut: string | null; error?: string; block?: { number: number };
  compared?: { paths: number; swapsSimulated: number }; route?: { legs: { hops: { kind: string; fee: number }[] }[] } | null };

/** The token's own pool price in HYPE per token (Montra or Volta), with its trade fee. null = no launchpad pool. */
async function launchpadPrice(token: string): Promise<OlyQuote["ref"]> {
  const opts = { signal: AbortSignal.timeout(8000), cache: "no-store" as const };
  try {
    const m = await fetch(`https://api.montramarkets.xyz/api/tokens/${token}`, opts);
    if (m.ok) {
      const d = (await m.json()) as { price?: string; priceUsd?: number | null; totalFeePips?: number; quote?: { native?: boolean } };
      // HYPE-quoted pools give the price directly; others (e.g. KNTQ-quoted MONTRA) go through USD.
      const usd = d.quote?.native ? null : await hypeUsd();
      const price = d.quote?.native ? Number(d.price) : usd && d.priceUsd ? d.priceUsd / usd : 0;
      if (price > 0) return { venue: "Montra", url: `https://montramarkets.xyz/token/${token}`, price, feePct: (d.totalFeePips ?? 0) / 10000 };
    }
  } catch { /* try Volta */ }
  try {
    const v = await fetch(`https://volta-indexer-production.up.railway.app/tokens/${token}`, opts);
    if (v.ok) {
      const d = (await v.json()) as { price?: number; swapFee?: number; quote?: string };
      if (d.quote === "0x0000000000000000000000000000000000000000" && (d.price ?? 0) > 0) return { venue: "Volta", url: `https://www.volta.family/token/${token}`, price: d.price!, feePct: (d.swapFee ?? 0) / 100 };
    }
  } catch { /* no launchpad pool */ }
  return null;
}

export async function GET(req: Request) {
  if (limited(req)) return NextResponse.json({ error: "Slow down a little — too many quotes." }, { status: 429 });
  const p = new URL(req.url).searchParams;
  const token = (p.get("token") ?? "").toLowerCase(), side = p.get("side"), amount = (p.get("amount") ?? "").trim(), decimals = Number(p.get("decimals") ?? "18");
  if (!/^0x[0-9a-f]{40}$/.test(token) || (side !== "buy" && side !== "sell") || !/^\d{1,12}(\.\d{1,18})?$/.test(amount) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36)
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  let amountIn: bigint;
  try { amountIn = parseUnits(amount, side === "buy" ? 18 : decimals); } catch { return NextResponse.json({ error: "Bad amount." }, { status: 400 }); }
  if (amountIn <= BigInt(0)) return NextResponse.json({ error: "Enter an amount." }, { status: 400 });

  const [tokenIn, tokenOut] = side === "buy" ? [WHYPE, token] : [token, WHYPE];
  const q = new URLSearchParams({ chainId: "99901", tokenIn, tokenOut, amountIn: amountIn.toString() });
  try {
    const [d, ref] = await Promise.all([
      fetch(`${KALOS_QUOTER}/v1/route?${q}`, { signal: AbortSignal.timeout(15000), cache: "no-store" }).then((r) => r.json() as Promise<KalosRoute>),
      launchpadPrice(token),
    ]);
    const legs = d.route?.legs ?? [];
    // How much of the launchpad-price value Kalos's route returns (1 = same as the pool price, before fees and impact).
    let efficiency: number | null = null;
    if (ref && d.amountOut) {
      const inUnits = Number(amount), outUnits = Number(BigInt(d.amountOut)) / 10 ** (side === "buy" ? decimals : 18);
      const fair = side === "buy" ? inUnits / ref.price : inUnits * ref.price;
      efficiency = fair > 0 ? outUnits / fair : null;
    }
    const out: OlyQuote = {
      amountIn: amountIn.toString(), amountOut: d.amountOut ?? null, minimumOut: d.minimumOut ?? null,
      error: d.amountOut ? undefined : d.error ?? "No route right now.",
      hops: legs.flatMap((l) => l.hops.map((h) => ({ kind: String(h.kind), fee: Number(h.fee) }))), legs: legs.length,
      paths: d.compared?.paths ?? 0, simulated: d.compared?.swapsSimulated ?? 0, block: d.block?.number ?? null, ref, efficiency,
    };
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Kalos's router didn't answer in time. Try again." }, { status: 504 });
  }
}
