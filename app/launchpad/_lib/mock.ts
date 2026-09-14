/** Build-in-public log. Real history only — no placeholder metrics anywhere on the site. */
export const UPDATES = [
  { w: "Week 1", built: "Prototype of every page. Fee presets, founder lock + dev buy, share cards. Restyled to chrome.", learned: "Nobody reads tokenomics. Everybody reads \"founder locked 7.8% for 180 days.\"", next: "Wire the launch page to a real factory." },
  { w: "Week 2", built: "Real wallet connect. Own launch factory: 1B token + Uniswap V3 pool + permanent LP lock + fee split + founder vault + dev buy in one transaction. Weekly holder snapshots.", learned: "No existing protocol did 1B supply with a permanent lock and a fee split the way we wanted, so we built a small factory on Uniswap V3.", next: "Mainnet." },
  { w: "Week 3", built: "Robinhood Chain mainnet. Factory live, ownership under the treasury, every Uniswap address verified on-chain. Closed a cross-epoch bug in the rewards distributor and fixed the launch tick range before anyone launched. Repositioned around founders running AI agent businesses; removed game nights and every placeholder number.", learned: "The RPC URL in our own notes wasn't an RPC. Verify against the chain, not the doc.", next: "Pick-your-own 1–10% creator fee on top of our 1%, via a Uniswap V4 hook. First launch. First Sunday payout." },
];

export const PALETTES: Record<string, [string, string, string]> = {
  LMEOW: ["#F5F5F7", "#8F93A1", "#2A2A33"],
};
export function paletteFor(symbol: string): [string, string, string] {
  if (PALETTES[symbol]) return PALETTES[symbol];
  const pool: [string, string, string][] = [["#E6E7EC", "#8F93A1", "#2A2A33"], ["#C3C8FF", "#5C63A6", "#171A33"], ["#CFFFF0", "#5E8C80", "#14201C"], ["#F0D9FF", "#7A5C99", "#1F1528"], ["#FFE9C9", "#9A8460", "#221C10"]];
  let h = 0; for (const c of symbol) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
