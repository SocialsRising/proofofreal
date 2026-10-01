import type { OrderRecord } from "./order";
import { itemLabel } from "./order";

const PRINTFUL_API = () => process.env.PRINTFUL_API_BASE || "https://api.printful.com";

export type Recipient = { name: string; address1: string; address2?: string; city: string; state_code?: string; country_code: string; zip: string; email?: string };

export function buildPrintfulOrder(order: OrderRecord, recipient: Recipient) {
  return {
    external_id: order.id,                       // ≤ 32 chars, unique — makes webhook retries idempotent
    shipping: "STANDARD",
    recipient,
    items: order.items.map((i) => ({
      variant_id: i.variantId,
      quantity: i.qty,
      name: itemLabel(i),
      files: [{ type: i.placement, url: i.imageUrl }],
    })),
  };
}

/** Creates the order in Printful. Drafts by default; PRINTFUL_AUTO_CONFIRM=1 sends it straight to production. */
export async function createPrintfulOrder(order: OrderRecord, recipient: Recipient) {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) throw new Error("PRINTFUL_API_TOKEN is not set");
  const confirm = process.env.PRINTFUL_AUTO_CONFIRM === "1";
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (process.env.PRINTFUL_STORE_ID) headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
  const res = await fetch(`${PRINTFUL_API()}/orders?confirm=${confirm ? 1 : 0}`, { method: "POST", headers, body: JSON.stringify(buildPrintfulOrder(order, recipient)) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(json?.error?.message || json?.result || `Printful error ${res.status}`);
    // A retried webhook for an order we already created: treat as done.
    if (/external_id/i.test(msg) && /exist|already|unique/i.test(msg)) return { duplicate: true as const };
    throw new Error(msg);
  }
  return { id: json?.result?.id as number, status: json?.result?.status as string, confirmed: confirm };
}

/** Stripe address → Printful recipient. */
export function recipientFrom(name: string, a: Record<string, string>, email?: string): Recipient {
  return {
    name: (name || "").slice(0, 60),
    address1: a.line1 || "",
    address2: a.line2 || undefined,
    city: a.city || "",
    state_code: a.state || undefined,
    country_code: a.country || "",
    zip: a.postal_code || "",
    email: email || undefined,
  };
}
