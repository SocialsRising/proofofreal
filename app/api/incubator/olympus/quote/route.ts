// Live quotes for the Olympus terminal from Kalos's router. Read-only: nothing here builds or signs a trade.
// Each quote also gets a market-price check (against the token's own pool when it has one), so the Oracle can warn
// when a route returns noticeably less than the market price, the way any swap screen warns about price impact.
import { NextResponse } from "next/server";
import { parseUnits } from "viem";
import { hypeUsd } from "../../../../incubator/_lib/montra";
import { KALOS_QUOTER, WHYPE, type OlyQuote } from "../../../../incubator/_lib/olympus";
import { rateLimited } from "../_limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KalosRoute = { amountOut?: unknown; minimumOut?: unknown; error?: unknown; block?: { number?: unknown };
  compared?: { paths?: unknown; swapsSimulated?: unknown }; route?: { legs?: { hops?: { kind?: unknown; fee?: unknown }[] }[] } | null };
const uint = (v: unknown) => (typeof v === "string" && /^\d{1,60}$/.test(v) ? v : null);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

/** The token's market price in HYPE per token, from its own pool (Montra or Volta). null = no reference. */
async function marketPrice(token: string): Promise<number | null> {
  const opts = { signal: AbortSignal.timeout(8000), cache: "no-store" as const };
  try {
    const m = await fetch(`https://api.montramarkets.xyz/api/tokens/${token}`, opts);
    if (m.ok) {
      const d = (await m.json()) as { price?: string; priceUsd?: number | null; quote?: { native?: boolean } };
      if (d.quote?.native) return Number(d.price) > 0 ? Number(d.price) : null;
      const usd = await hypeUsd(); // pools quoted in another asset (e.g. KNTQ) go through USD
      return usd && d.priceUsd ? d.priceUsd / usd : null;
    }
  } catch { /* try Volta */ }
  try {
    const v = await fetch(`https://volta-indexer-production.up.railway.app/tokens/${token}`, opts);
    if (v.ok) {
      const d = (await v.json()) as { price?: number; quote?: string };
      if (d.quote === "0x0000000000000000000000000000000000000000" && (d.price ?? 0) > 0) return d.price!;
    }
  } catch { /* no reference */ }
  return null;
}

export async function GET(req: Request) {
  if (rateLimited(req, "quote", 90)) return NextResponse.json({ error: "Slow down a little — too many quotes." }, { status: 429 });
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
    const [d, price] = await Promise.all([
      fetch(`${KALOS_QUOTER}/v1/route?${q}`, { signal: AbortSignal.timeout(15000), cache: "no-store" }).then((r) => r.json() as Promise<KalosRoute>),
      marketPrice(token).catch(() => null),
    ]);
    const amountOut = uint(d.amountOut), legs = Array.isArray(d.route?.legs) ? d.route!.legs! : [];
    let efficiency: number | null = null;
    if (price && amountOut) {
      const inUnits = Number(amount), outUnits = Number(BigInt(amountOut)) / 10 ** (side === "buy" ? decimals : 18);
      const fair = side === "buy" ? inUnits / price : inUnits * price;
      efficiency = fair > 0 ? outUnits / fair : null;
    }
    const out: OlyQuote = {
      amountIn: amountIn.toString(), amountOut, minimumOut: uint(d.minimumOut),
      error: amountOut ? undefined : "Kalos is still mapping a route for this amount.",
      hops: legs.flatMap((l) => (Array.isArray(l.hops) ? l.hops : []).map((h) => ({ kind: String(h.kind ?? "").slice(0, 8), fee: int(h.fee) }))).slice(0, 16), legs: legs.length,
      paths: int(d.compared?.paths), simulated: int(d.compared?.swapsSimulated), block: int(d.block?.number) || null, efficiency,
    };
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Kalos's router didn't answer in time. Try again." }, { status: 504 });
  }
}
