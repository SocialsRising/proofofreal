/**
 * Credits merch store settings. Secrets live in Vercel env vars, never here:
 *   STRIPE_SECRET_KEY        sk_test_… / sk_live_…   (Stripe → Developers → API keys)
 *   STRIPE_WEBHOOK_SECRET    whsec_…                  (Stripe → Webhooks → endpoint for /api/merch/webhook)
 *   PRINTFUL_API_TOKEN       Printful → Settings → API → private token (scope: orders, files)
 *   PRINTFUL_STORE_ID        optional, only if the token covers several Printful stores
 *   PRINTFUL_AUTO_CONFIRM    "1" sends paid orders straight to production; anything else creates drafts to review
 *   BLOB_READ_WRITE_TOKEN    added automatically when a Vercel Blob store is connected to the project
 */
export const COLLECTION = "Credits Autumn 2026 Collection";
export const BRAND = "Meme Maxxers";
export const CURRENCY = "usd";

/** One flat rate per order, worldwide. Printful bills its real shipping to your Printful account. */
export const SHIPPING = { amount: 1000, label: "Standard shipping · worldwide", minDays: 5, maxDays: 14 };

/** Countries Stripe Checkout will accept a shipping address for (Printful ships to all of them). */
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "LU", "ES", "PT", "IT", "AT", "CH", "DK", "SE", "NO", "FI",
  "PL", "CZ", "SK", "HU", "RO", "BG", "GR", "HR", "SI", "EE", "LV", "LT", "JP", "KR", "SG", "HK", "TW", "AE", "IL", "MX", "BR",
] as const;

export const LIMITS = { maxItems: 20, maxQty: 10, maxUploadBytes: 25 * 1024 * 1024 };
/** Images under this many pixels on the long side will look soft when printed large. */
export const PRINT_MIN_PX = 1800;
