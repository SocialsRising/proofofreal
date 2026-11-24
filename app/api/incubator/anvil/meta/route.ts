// An NFT's name and image for the anvil page: reads tokenURI on Elysium, fetches the metadata (IPFS through our
// gateways, https or inline), and answers an image URL the browser can load (IPFS images go through /ipfs below).
import { NextResponse } from "next/server";
import { createPublicClient, fallback, http, parseAbi } from "viem";
import { rateLimited } from "../../olympus/_limit";
import { cidPath, fetchIpfs } from "../_ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = createPublicClient({ transport: fallback([http("https://rpc.elysium.kinetiq.xyz"), http("https://rpc.montramarkets.xyz")]) });
const ABI = parseAbi(["function tokenURI(uint256) view returns (string)"]);

/** Turns an image reference from metadata into something the browser may load, or null. */
function imageUrl(img: unknown): string | null {
  if (typeof img !== "string") return null;
  const p = cidPath(img);
  if (p) return `/api/incubator/anvil/ipfs/${p}`;
  return /^https:\/\/[^\s"'<>]{4,400}$/.test(img) ? img : null;
}

export async function GET(req: Request) {
  if (rateLimited(req, "anvil-meta", 240)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  const q = new URL(req.url).searchParams;
  const nft = (q.get("nft") ?? "").toLowerCase(), id = q.get("id") ?? "";
  if (!/^0x[0-9a-f]{40}$/.test(nft) || !/^\d{1,78}$/.test(id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const uri = await client.readContract({ address: nft as `0x${string}`, abi: ABI, functionName: "tokenURI", args: [BigInt(id)] });
    let meta: { name?: unknown; image?: unknown } = {};
    const p = cidPath(uri);
    if (p) meta = await (await fetchIpfs(p)).json();
    else if (uri.startsWith("data:application/json;base64,")) meta = JSON.parse(Buffer.from(uri.slice(29), "base64").toString("utf8"));
    else if (uri.startsWith("data:application/json,")) meta = JSON.parse(decodeURIComponent(uri.slice(22)));
    else if (/^https:\/\//.test(uri)) meta = await (await fetch(uri, { signal: AbortSignal.timeout(10000), cache: "no-store" })).json();
    const out = { name: typeof meta.name === "string" ? meta.name.slice(0, 80) : null, image: imageUrl(meta.image) };
    // Metadata can change (reveals), so cache for an hour rather than forever.
    return NextResponse.json(out, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ name: null, image: null }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  }
}
