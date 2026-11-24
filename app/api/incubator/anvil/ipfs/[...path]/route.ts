// IPFS images for the anvil page, served from our domain and cached forever (a CID's content never changes).
// Only raster images are passed through: never HTML or SVG, so nothing from IPFS can run as script on this site.
import { NextResponse } from "next/server";
import { rateLimited } from "../../../olympus/_limit";
import { fetchIpfs } from "../../_ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (rateLimited(req, "anvil-ipfs", 240)) return new NextResponse("Slow down a little.", { status: 429 });
  const path = (await params).path.join("/");
  try {
    const r = await fetchIpfs(path, 20000);
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!TYPES.has(type)) return new NextResponse("Not an image.", { status: 415 });
    const body = await r.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return new NextResponse("Image too large.", { status: 413 });
    return new NextResponse(body, {
      headers: {
        "Content-Type": type, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Couldn't load this image from IPFS.", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
