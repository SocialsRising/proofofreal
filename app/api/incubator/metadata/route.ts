// Uploads a launch's image + metadata document to Montra's keyless metadata service and returns both URIs.
// Proxied because Montra's upload routes don't allow browser POSTs from other origins.
// Abuse limits are best effort (in memory, per server instance): same-origin only (stops other websites, not scripts),
// a per-address limit that treats an IPv6 /64 as one address, an overall cap per instance, and timeouts upstream.
// For a hard limit, add a Vercel Firewall rate-limit rule for /api/incubator/metadata.
import { NextResponse } from "next/server";
import { safeLink, type LinkKind } from "../../../incubator/_lib/montra";

export const runtime = "nodejs";
const API = "https://api.montramarkets.xyz";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BODY = 2.5 * 1024 * 1024;
const WINDOW_MS = 10 * 60 * 1000, PER_ADDRESS = 8, PER_INSTANCE = 120, MAX_KEYS = 5000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const hits = new Map<string, number[]>();
let recent: number[] = [];

/** Checks the file really is the image type it claims (the browser-declared type is just a label). */
function sniff(b: Uint8Array): string | null {
  const at = (o: number, ...xs: number[]) => xs.every((x, i) => b[o + i] === x);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
/** The caller's address for rate limiting. Vercel sets x-forwarded-for itself; an IPv6 /64 counts as one address. */
function addressKey(req: Request) {
  const ip = ((req.headers.get("x-forwarded-for") ?? "").split(",")[0] || req.headers.get("x-real-ip") || "").trim().toLowerCase();
  if (!ip) return "unknown";
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [], t = tail ? tail.split(":") : [];
  const groups = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
function limited(req: Request): "address" | "busy" | null {
  const now = Date.now();
  recent = recent.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_INSTANCE) return "busy";
  const key = addressKey(req), list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= PER_ADDRESS) { hits.set(key, list); return "address"; }
  list.push(now); hits.set(key, list); recent.push(now);
  if (hits.size > MAX_KEYS) {
    // drop addresses with nothing recent, then the oldest ones, without resetting everyone's limits
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    for (const k of hits.keys()) { if (hits.size <= MAX_KEYS * 0.8) break; hits.delete(k); }
  }
  return null;
}
const upstream = (path: string, init: RequestInit) => fetch(`${API}${path}`, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Uploads only work from the launch page." }, { status: 403 });
  const len = Number(req.headers.get("content-length") ?? "0");
  if (!len || len > MAX_BODY) return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 413 });
  const limit = limited(req);
  if (limit) return NextResponse.json({ error: limit === "busy" ? "Uploads are busy right now — try again in a few minutes." : "Too many uploads — wait a few minutes and try again." }, { status: 429 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Expected a form upload." }, { status: 400 }); }
  const image = form.get("image");
  const name = String(form.get("name") ?? "").trim().slice(0, 32);
  const symbol = String(form.get("symbol") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const description = String(form.get("description") ?? "").trim().slice(0, 1000);
  if (!name || !symbol) return NextResponse.json({ error: "Name and ticker are required." }, { status: 400 });
  if (!(image instanceof File) || !IMAGE_TYPES.includes(image.type)) return NextResponse.json({ error: "Add a PNG, JPEG, WebP or GIF image." }, { status: 400 });
  if (image.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 400 });

  const bytes = new Uint8Array(await image.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return NextResponse.json({ error: "That file isn't a real PNG, JPEG, WebP or GIF." }, { status: 400 });

  // Links: https only, no "x.com@other-site" disguises, and X / Telegram / Discord must point at those sites.
  const socials: Record<string, string> = {};
  for (const k of ["website", "twitter", "telegram", "discord"] as LinkKind[]) {
    const raw = String(form.get(k) ?? "").trim();
    if (!raw) continue;
    const ok = safeLink(raw, k);
    if (!ok) return NextResponse.json({ error: `The ${{ website: "website", twitter: "X", telegram: "Telegram", discord: "Discord" }[k]} link doesn't look right.` }, { status: 400 });
    socials[k] = ok;
  }

  try {
    const img = await upstream("/api/metadata/image", { method: "POST", headers: { "content-type": kind }, body: Buffer.from(bytes) });
    const imgBody = await img.json().catch(() => ({}));
    if (!img.ok || typeof imgBody.uri !== "string") return NextResponse.json({ error: `Image upload failed (${img.status}). Try again in a minute.` }, { status: 502 });

    const meta = await upstream("/api/metadata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, symbol, description, image: imgBody.uri, ...socials }) });
    const metaBody = await meta.json().catch(() => ({}));
    if (!meta.ok || typeof metaBody.uri !== "string") return NextResponse.json({ error: `Metadata upload failed (${meta.status}). Try again in a minute.` }, { status: 502 });

    return NextResponse.json({ imageUri: imgBody.uri as string, metadataUri: metaBody.uri as string, socials });
  } catch {
    return NextResponse.json({ error: "Montra's upload service didn't answer in time. Try again in a minute." }, { status: 504 });
  }
}
