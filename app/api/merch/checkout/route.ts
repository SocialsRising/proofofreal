import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildOrder } from "../../../merch/credits/_lib/order";
import { createCheckoutSession } from "../../../merch/credits/_lib/stripe";

export const runtime = "nodejs";

/**
 * Validates the bag against the catalog, stores the order (items + referral, no personal data) in Vercel Blob,
 * and returns a Stripe Checkout URL. The webhook reads the stored order back once payment succeeds.
 */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Checkout opens soon — the store is being connected." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const id = crypto.randomBytes(8).toString("hex"); // 16 chars, fits Printful's 32-char external_id
  const built = buildOrder(body, id);
  if ("error" in built) return NextResponse.json({ error: built.error }, { status: 400 });

  try {
    const blob = await put(`merch/orders/${id}.json`, JSON.stringify(built.order), {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    const origin = new URL(req.url).origin;
    const session = await createCheckoutSession(built.order, blob.url, origin);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("merch checkout failed", e);
    return NextResponse.json({ error: "Checkout is unavailable right now. Please try again in a minute." }, { status: 502 });
  }
}
