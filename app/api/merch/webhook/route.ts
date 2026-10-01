import { NextResponse } from "next/server";
import type { OrderRecord } from "../../../merch/credits/_lib/order";
import { shippingOf, verifyStripeSignature } from "../../../merch/credits/_lib/stripe";
import { createPrintfulOrder, recipientFrom } from "../../../merch/credits/_lib/printful";

export const runtime = "nodejs";

/**
 * Stripe → Printful. On a paid checkout, load the stored order and create it in Printful.
 * Non-2xx responses make Stripe retry (for up to 3 days); duplicates are ignored via Printful's external_id.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature") || "", secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const event = JSON.parse(payload);
  if (event.type === "checkout.session.async_payment_failed") {
    const s = event.data?.object ?? {};
    console.warn("merch payment failed (delayed method) — nothing sent to Printful", { session: s.id, order: s.metadata?.order_id, referral: s.metadata?.referral || null });
    return NextResponse.json({ failed: true });
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ ignored: event.type });
  }
  const session = event.data?.object ?? {};
  if (session.payment_status !== "paid") return NextResponse.json({ waiting: session.payment_status });

  const orderUrl: string | undefined = session.metadata?.order_url;
  const urlOk = !!orderUrl && (/^https:\/\//.test(orderUrl) || (process.env.NODE_ENV !== "production" && /^http:\/\/localhost[:/]/.test(orderUrl)));
  if (!urlOk) return NextResponse.json({ error: "missing order_url" }, { status: 400 });
  const order = (await fetch(orderUrl, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as OrderRecord | null;
  if (!order?.items?.length) return NextResponse.json({ error: "order not found" }, { status: 500 });

  const ship = shippingOf(session);
  if (!ship?.address) return NextResponse.json({ error: "no shipping address on session" }, { status: 400 });
  const recipient = recipientFrom(ship.name || session.customer_details?.name || "", ship.address, session.customer_details?.email);

  try {
    const result = await createPrintfulOrder(order, recipient);
    console.log("merch order → printful", { order: order.id, session: session.id, referral: order.referral || null, result });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("printful order failed", order.id, e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
