import type { LaunchToken, Submission } from "./types";

/** Client-side helpers for the token registry (Supabase-backed API, in-memory fallback in dev). */
export async function listTokens(): Promise<LaunchToken[]> {
  try { const r = await fetch("/api/launchpad/tokens", { cache: "no-store" }); if (!r.ok) return []; return (await r.json()).tokens ?? []; } catch { return []; }
}
export async function getToken(address: string): Promise<LaunchToken | null> {
  try { const r = await fetch(`/api/launchpad/tokens?address=${address.toLowerCase()}`, { cache: "no-store" }); if (!r.ok) return null; return (await r.json()).token ?? null; } catch { return null; }
}
export async function registerToken(t: LaunchToken) {
  const r = await fetch("/api/launchpad/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(t) });
  if (!r.ok) throw new Error("Could not save token to the registry");
  return (await r.json()).token as LaunchToken;
}
export async function submit(s: Submission) {
  const r = await fetch("/api/launchpad/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
  if (!r.ok) throw new Error("Could not send");
}
export async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData(); fd.append("file", file);
  const r = await fetch("/api/launchpad/upload", { method: "POST", body: fd });
  if (!r.ok) return null;
  return (await r.json()).url ?? null;
}
