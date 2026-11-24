// IPFS helpers for the anvil's NFT routes. Only content addressed by a CID is fetched, from a fixed list of
// gateways, so these routes can never be pointed at arbitrary URLs.
export const GATEWAYS = ["https://ipfs.filebase.io/ipfs/", "https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/"];

/** "<cid>" or "<cid>/<path>" with a CIDv0/CIDv1 and up to 4 simple path segments. */
const CID_PATH = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,100})(\/[A-Za-z0-9._-]{1,120}){0,4}$/;

/** ipfs://… or a gateway URL → "<cid>/<path>", else null. */
export function cidPath(uri: string): string | null {
  const u = uri.trim();
  const m = u.match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/) ?? u.match(/^https:\/\/[^/]+\/ipfs\/(.+)$/);
  const p = m?.[1]?.split(/[?#]/)[0];
  return p && CID_PATH.test(p) ? p : null;
}

/** Fetches a CID path from the first gateway that answers 200, racing them with a short head start each. */
export async function fetchIpfs(path: string, timeoutMs = 15000): Promise<Response> {
  if (!CID_PATH.test(path)) throw new Error("bad path");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await Promise.any(GATEWAYS.map(async (g, i) => {
      if (i) await new Promise((r) => setTimeout(r, i * 1500));
      if (ctrl.signal.aborted) throw new Error("aborted");
      const r = await fetch(g + path, { signal: ctrl.signal, redirect: "follow", cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      return r;
    }));
  } finally { clearTimeout(timer); }
}
