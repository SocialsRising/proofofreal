// Uploads a launch's image + metadata document to Montra's keyless metadata service and returns both URIs.
// Proxied because Montra's upload routes don't allow browser POSTs from other origins.
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const API = "https://api.montramarkets.xyz";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const cleanUrl = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^https:\/\/[^\s]{3,200}$/i.test(s) ? s : "";
};

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Expected a form upload." }, { status: 400 }); }
  const image = form.get("image");
  const name = String(form.get("name") ?? "").trim().slice(0, 32);
  const symbol = String(form.get("symbol") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const description = String(form.get("description") ?? "").trim().slice(0, 1000);
  if (!name || !symbol) return NextResponse.json({ error: "Name and ticker are required." }, { status: 400 });
  if (!(image instanceof File) || !IMAGE_TYPES.includes(image.type)) return NextResponse.json({ error: "Add a PNG, JPEG, WebP or GIF image." }, { status: 400 });
  if (image.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 400 });

  const img = await fetch(`${API}/api/metadata/image`, { method: "POST", headers: { "content-type": image.type }, body: Buffer.from(await image.arrayBuffer()) });
  const imgBody = await img.json().catch(() => ({}));
  if (!img.ok || !imgBody.uri) return NextResponse.json({ error: imgBody.error ?? `Image upload failed (${img.status}). Try again in a minute.` }, { status: 502 });

  const doc: Record<string, string> = { name, symbol, description, image: imgBody.uri };
  for (const k of ["website", "twitter", "telegram", "discord"]) { const v = cleanUrl(form.get(k)); if (v) doc[k] = v; }
  const meta = await fetch(`${API}/api/metadata`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(doc) });
  const metaBody = await meta.json().catch(() => ({}));
  if (!meta.ok || !metaBody.uri) return NextResponse.json({ error: metaBody.error ?? `Metadata upload failed (${meta.status}).` }, { status: 502 });

  return NextResponse.json({ imageUri: imgBody.uri as string, metadataUri: metaBody.uri as string, socials: doc });
}
