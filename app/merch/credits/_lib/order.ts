import { COLLECTION, LIMITS } from "./config";
import { PRODUCTS, priceOf, variantOf } from "./catalog";

/** What the browser sends. Prices are never taken from the client — they're looked up from the catalog. */
export type CartItemInput = { productKey: string; color?: string; size: string; qty: number; imageUrl: string };
export type OrderItem = {
  productKey: string; name: string; color: string; size: string; qty: number;
  unitAmount: number; variantId: number; placement: string; imageUrl: string;
};
export type OrderRecord = { id: string; createdAt: string; collection: string; items: OrderItem[]; referral: string; subtotal: number; rightsConfirmed: true };

export const cleanHandle = (h: unknown) =>
  String(h ?? "").trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);

const isHttpsUrl = (u: unknown): u is string => {
  if (typeof u !== "string" || u.length > 2048) return false;
  try { return new URL(u).protocol === "https:"; } catch { return false; }
};

/** Validates a cart against the catalog and returns priced line items, or a human-readable error. */
export function buildOrder(input: { items?: unknown; referral?: unknown; rightsConfirmed?: unknown }, id: string): { order: OrderRecord } | { error: string } {
  if (input.rightsConfirmed !== true) return { error: "Please confirm you have the right to print your design." };
  const raw = Array.isArray(input.items) ? input.items : [];
  if (!raw.length) return { error: "Your bag is empty." };
  if (raw.length > LIMITS.maxItems) return { error: `Up to ${LIMITS.maxItems} items per order.` };
  const items: OrderItem[] = [];
  for (const r of raw as CartItemInput[]) {
    const p = PRODUCTS.find((x) => x.key === r?.productKey);
    if (!p) return { error: "Unknown product in your bag." };
    const color = p.colors.length ? String(r.color ?? "") : "";
    if (p.colors.length && !p.colors.includes(color)) return { error: `${p.name}: pick a color.` };
    if (!p.sizes.includes(String(r.size))) return { error: `${p.name}: pick a ${p.sizeLabel.toLowerCase()}.` };
    const qty = Math.floor(Number(r.qty));
    if (!(qty >= 1 && qty <= LIMITS.maxQty)) return { error: `${p.name}: quantity must be 1–${LIMITS.maxQty}.` };
    if (!isHttpsUrl(r.imageUrl)) return { error: `${p.name}: add a design first.` };
    const variantId = variantOf(p, color, r.size);
    if (!variantId) return { error: `${p.name}: that option isn't available.` };
    items.push({ productKey: p.key, name: p.name, color, size: r.size, qty, unitAmount: priceOf(p, r.size), variantId, placement: p.placement, imageUrl: r.imageUrl });
  }
  const subtotal = items.reduce((s, i) => s + i.unitAmount * i.qty, 0);
  return { order: { id, createdAt: new Date().toISOString(), collection: COLLECTION, items, referral: cleanHandle(input.referral), subtotal, rightsConfirmed: true } };
}

export const itemLabel = (i: Pick<OrderItem, "name" | "color" | "size">) => [i.name, [i.color, i.size].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
