export const fmt = (n: number) => n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n));
export const usd = (n: number) => "$" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toFixed(2));
/** USD for per-token prices, which are usually far below a cent: keeps 3 significant digits ($0.0000076) instead of rounding to $0.00. */
export const price = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  if (n >= 1) return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const decimals = Math.min(12, Math.max(2, -Math.floor(Math.log10(n)) + 2));
  return "$" + n.toFixed(decimals).replace(/0+$/, "");
};
export const usdFull = (n: number) => "$" + Math.round(n).toLocaleString();
export const short =(a?: string | null) => (a && a.startsWith("0x") && a.length > 12 ? a.slice(0, 6) + "…" + a.slice(-4) : a ?? "");
export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);
