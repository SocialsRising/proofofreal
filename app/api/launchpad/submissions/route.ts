import { NextResponse } from "next/server";
import { db, memTable } from "../_db";

const TABLE = "launchpad_submissions";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !["game", "incubate"].includes(body.type)) return NextResponse.json({ error: "bad submission" }, { status: 400 });
  const id = crypto.randomUUID();
  const row = { id, data: body, created_at: new Date().toISOString() };
  const client = db();
  if (client) {
    const { error } = await client.from(TABLE).insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else memTable(TABLE).set(id, row);
  return NextResponse.json({ ok: true, id });
}
