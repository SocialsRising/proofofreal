// IPFS images for the anvil page, served from our domain and cached forever (a CID's content never changes).
// Only raster images are passed through: never HTML or SVG, so nothing from IPFS can run as script on this site.
import { NextResponse } from "next/server";
import { rateLimited } from "../../../olympus/_limit";
import { fetchIpfs } from "../../_ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const fail = (msg: string, status: number) => new NextResponse(msg, { status, headers: { "Cache-Control": "public, s-maxage=300" } });

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (rateLimited(req, "anvil-ipfs", 240)) return new NextResponse("Slow down a little.", { status: 429 });
  const path = (await params).path.join("/");
  let got;
  try { got = await fetchIpfs(path, MAX_BYTES, 20000); } catch (e) {
    return (e as Error).message === "bad path" ? fail("Not an IPFS path.", 400) : (e as Error).message === "too large" ? fail("Image too large.", 413)
      : new NextResponse("Couldn't load this image from IPFS.", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  if (!TYPES.has(got.type)) return fail("Not an image.", 415);
  return new NextResponse(got.body as BodyInit, {
    headers: {
      "Content-Type": got.type, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
