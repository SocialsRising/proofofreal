// Uploads a launch's image + metadata document to Montra's keyless metadata service and returns both URIs.
// Proxied because Montra's upload routes don't allow browser POSTs from other origins.
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const API = "https://api.montramarkets.xyz";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BODY = 2.5 * 1024 * 1024;
const WINDOW_MS = 10 * 60 * 1000, PER_WINDOW = 8;
const hits = new Map<string, number[]>(); // best effort: per server instance

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
function limited(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now(), list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= PER_WINDOW) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

const cleanUrl = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^https:\/\/[^\s]{3,200}$/i.test(s) ? s : "";
};

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Uploads only work from the launch page." }, { status: 403 });
  const len = Number(req.headers.get("content-length") ?? "0");
  if (!len || len > MAX_BODY) return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 413 });
  if (limited(req)) return NextResponse.json({ error: "Too many uploads — wait a few minutes and try again." }, { status: 429 });
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
  const img = await fetch(`${API}/api/metadata/image`, { method: "POST", headers: { "content-type": kind }, body: Buffer.from(bytes) });
  const imgBody = await img.json().catch(() => ({}));
  if (!img.ok || typeof imgBody.uri !== "string") return NextResponse.json({ error: `Image upload failed (${img.status}). Try again in a minute.` }, { status: 502 });

  const doc: Record<string, string> = { name, symbol, description, image: imgBody.uri };
  for (const k of ["website", "twitter", "telegram", "discord"]) { const v = cleanUrl(form.get(k)); if (v) doc[k] = v; }
  const meta = await fetch(`${API}/api/metadata`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(doc) });
  const metaBody = await meta.json().catch(() => ({}));
  if (!meta.ok || typeof metaBody.uri !== "string") return NextResponse.json({ error: `Metadata upload failed (${meta.status}). Try again in a minute.` }, { status: 502 });

  return NextResponse.json({ imageUri: imgBody.uri as string, metadataUri: metaBody.uri as string, socials: doc });
}
