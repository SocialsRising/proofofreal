// Fetch helpers for the anvil's NFT routes. IPFS content is addressed by CID and fetched from a fixed list of gateways;
// plain https metadata is fetched without redirects and only from public addresses. Every body is size-capped and
// the timeout covers the whole download, not just the headers.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const GATEWAYS = ["https://ipfs.filebase.io/ipfs/", "https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/"];

/** "<cid>" or "<cid>/<path>": a CIDv0/CIDv1 and up to 4 simple segments, never "." or "..". */
const SEG = String.raw`\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9._-]{1,120}`;
const CID_PATH = new RegExp(String.raw`^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,100})(${SEG}){0,4}$`);

/** ipfs://… or a gateway URL → "<cid>/<path>", else null. */
export function cidPath(uri: string): string | null {
  const u = uri.trim();
  const m = u.match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/) ?? u.match(/^https:\/\/[^/]+\/ipfs\/(.+)$/);
  const p = m?.[1]?.split(/[?#]/)[0];
  return p && CID_PATH.test(p) ? p : null;
}

/** Reads a body up to `max` bytes, cancelling the stream if it goes over. */
async function readCapped(r: Response, max: number): Promise<Uint8Array> {
  if (Number(r.headers.get("content-length") ?? 0) > max) throw new Error("too large");
  const reader = r.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > max) { await reader.cancel().catch(() => {}); throw new Error("too large"); }
    chunks.push(value);
  }
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export type Fetched = { type: string; body: Uint8Array };

/** A CID path from the first gateway that answers 200 (later gateways start 1.5s apart; losers are cancelled). */
export async function fetchIpfs(path: string, maxBytes: number, timeoutMs = 15000): Promise<Fetched> {
  if (!CID_PATH.test(path)) throw new Error("bad path");
  const ctrls = GATEWAYS.map(() => new AbortController());
  const timer = setTimeout(() => ctrls.forEach((c) => c.abort()), timeoutMs);
  try {
    const { r, i } = await Promise.any(GATEWAYS.map(async (g, i) => {
      if (i) await new Promise((res) => setTimeout(res, i * 1500));
      if (ctrls[i].signal.aborted) throw new Error("aborted");
      const r = await fetch(g + path, { signal: ctrls[i].signal, cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      return { r, i };
    }));
    ctrls.forEach((c, k) => k !== i && c.abort());
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    return { type, body: await readCapped(r, maxBytes) };
  } finally { clearTimeout(timer); }
}

/** True for loopback, private, link-local, CGNAT, ULA and other non-public addresses. */
function privateIp(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
}

/** Plain https metadata: public hosts only (by name, resolving to public addresses), no redirects, capped and timed. */
export async function fetchPublicHttps(url: string, maxBytes: number, timeoutMs = 10000): Promise<Fetched> {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.username || u.password || isIP(u.hostname.replace(/^\[|\]$/g, "")) || !u.hostname.includes(".")) throw new Error("host not allowed");
  const addrs = await lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error("host not allowed");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(u, { signal: ctrl.signal, redirect: "error", cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    return { type, body: await readCapped(r, maxBytes) };
  } finally { clearTimeout(timer); }
}
