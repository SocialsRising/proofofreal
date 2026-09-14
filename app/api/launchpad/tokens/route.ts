import { NextResponse } from "next/server";
import { db, memTable } from "../_db";

const TABLE = "launchpad_tokens";
const isAddr = (s: unknown): s is string => typeof s === "string" && /^0x[0-9a-fA-F]{40}$/.test(s);

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.toLowerCase();
  const client = db();
  if (client) {
    if (address) {
      const { data } = await client.from(TABLE).select("data").eq("id", address).maybeSingle();
      return NextResponse.json({ token: data?.data ?? null });
    }
    const { data } = await client.from(TABLE).select("data").order("created_at", { ascending: false }).limit(200);
    return NextResponse.json({ tokens: (data ?? []).map((r) => r.data) });
  }
  const t = memTable(TABLE);
  if (address) return NextResponse.json({ token: t.get(address)?.data ?? null });
  return NextResponse.json({ tokens: [...t.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => r.data) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !isAddr(body.address) || typeof body.name !== "string" || typeof body.symbol !== "string" || !isAddr(body.creator)) {
    return NextResponse.json({ error: "address, name, symbol and creator are required" }, { status: 400 });
  }
  const token = { ...body, address: body.address.toLowerCase(), creator: body.creator.toLowerCase(), createdAt: body.createdAt ?? new Date().toISOString() };
  // Only whitelisted fields are stored; anything on-chain is re-read from the chain, so a bad row can't lie about fees.
  const clean = (({ address, chainId, name, symbol, image, description, creator, split, pool, tokenId, lockPct, lockDays, devBuyEth, socials, gameName, txHash, referrer, createdAt }) =>
    ({ address, chainId, name, symbol, image, description, creator, split, pool, tokenId, lockPct, lockDays, devBuyEth, socials, gameName, txHash, referrer, createdAt }))(token);
  const client = db();
  if (client) {
    const { error } = await client.from(TABLE).upsert({ id: clean.address, data: clean, created_at: clean.createdAt });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    memTable(TABLE).set(clean.address, { id: clean.address, data: clean, created_at: clean.createdAt });
  }
  return NextResponse.json({ token: clean });
}
