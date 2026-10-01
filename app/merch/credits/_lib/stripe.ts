import crypto from "node:crypto";
import { COLLECTION, CURRENCY, SHIPPING, SHIP_COUNTRIES } from "./config";
import { itemLabel, type OrderRecord } from "./order";

/** Stripe REST without the SDK: form-encoded bodies, nested keys as a[b][0][c]. */
const STRIPE_API = () => process.env.STRIPE_API_BASE || "https://api.stripe.com";

export function formEncode(obj: unknown, prefix = "", out: string[] = []): string {
  if (obj === undefined || obj === null) return out.join("&");
  if (Array.isArray(obj)) obj.forEach((v, i) => formEncode(v, `${prefix}[${i}]`, out));
  else if (typeof obj === "object") for (const [k, v] of Object.entries(obj)) formEncode(v, prefix ? `${prefix}[${k}]` : k, out);
  else out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
  return out.join("&");
}

export async function createCheckoutSession(order: OrderRecord, orderUrl: string, origin: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const metadata = { order_id: order.id, order_url: orderUrl, referral: order.referral || "", collection: COLLECTION };
  const params = {
    mode: "payment",
    success_url: `${origin}/merch/credits/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/merch/credits`,
    client_reference_id: order.id,
    allow_promotion_codes: "true",
    billing_address_collection: "auto",
    shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
    shipping_options: [{ shipping_rate_data: {
      type: "fixed_amount", display_name: SHIPPING.label, fixed_amount: { amount: SHIPPING.amount, currency: CURRENCY },
      delivery_estimate: { minimum: { unit: "business_day", value: SHIPPING.minDays }, maximum: { unit: "business_day", value: SHIPPING.maxDays } },
    } }],
    line_items: order.items.map((i) => ({
      quantity: i.qty,
      price_data: { currency: CURRENCY, unit_amount: i.unitAmount, product_data: { name: `${COLLECTION} · ${itemLabel(i)}`, images: [i.imageUrl] } },
    })),
    metadata,
    payment_intent_data: { metadata, description: `${COLLECTION}${order.referral ? ` · ref @${order.referral}` : ""}` },
    custom_text: { submit: { message: "100% of profits go to buying Credits NFTs off the floor." } },
  };
  const res = await fetch(`${STRIPE_API()}/v1/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `merch-${order.id}` },
    body: formEncode(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json as { id: string; url: string };
}

/** Verifies a Stripe-Signature header (scheme v1 = HMAC-SHA256 of "<t>.<payload>"), with a 5-minute tolerance. */
export function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2));
  const t = Number(parts.t);
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

/** Shipping details moved to collected_information in newer Stripe API versions; accept both shapes. */
export function shippingOf(session: Record<string, any>) {
  const sd = session?.collected_information?.shipping_details || session?.shipping_details || null;
  return sd ? { name: sd.name as string, address: sd.address as Record<string, string> } : null;
}
