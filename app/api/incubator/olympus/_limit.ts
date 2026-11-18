// Best-effort per-address rate limit for the Olympus routes (in memory, per server instance).
const buckets = new Map<string, Map<string, number[]>>();

export function rateLimited(req: Request, bucket: string, perMinute: number) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown", now = Date.now();
  const hits = buckets.get(bucket) ?? new Map<string, number[]>();
  buckets.set(bucket, hits);
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const k of hits.keys()) { hits.delete(k); if (hits.size < 4000) break; }
  return list.length > perMinute;
}
