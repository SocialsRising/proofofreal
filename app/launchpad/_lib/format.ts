export const fmt = (n: number) => n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n));
export const usd = (n: number) => "$" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toFixed(2));
export const short = (a?: string | null) => (a && a.startsWith("0x") && a.length > 12 ? a.slice(0, 6) + "…" + a.slice(-4) : a ?? "");
export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);
