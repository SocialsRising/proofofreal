"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const KEY = "mm-ref";
/** Remembers ?ref=<wallet or @handle> for 30 days so launches and trades can be attributed to whoever brought this visitor. */
export function RefCapture() {
  const sp = useSearchParams();
  useEffect(() => {
    const ref = sp.get("ref");
    if (!ref) return;
    try { localStorage.setItem(KEY, JSON.stringify({ ref: ref.slice(0, 64), at: Date.now() })); } catch {}
  }, [sp]);
  return null;
}
export function getRef(): string | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (!v) return null; if (Date.now() - v.at > 30 * 86400e3) return null; return v.ref; } catch { return null; }
}
