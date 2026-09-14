import { INITIAL_MCAP_ETH, TOTAL_SUPPLY } from "./config";
import { POOL_FEE_PCT } from "./presets";

export type DevBuyEstimate = {
  tokensOut: number;     // tokens the buyer receives
  pctSupply: number;     // as % of the 1B supply
  mcapEth: number;       // market cap right after the buy, in ETH
  priceEth: number;      // ETH per token after the buy
  avgPriceEth: number;   // ETH per token paid on average
  multiple: number;      // price after / price at launch
};

/**
 * Simulates the dev buy against the pool the factory creates.
 *
 * All unlocked supply sits in ONE single-sided Uniswap V3 position that starts at the initial price
 * and runs to the max tick, so its liquidity L is constant across the whole range and
 * L = amount · √P0. Buying with y ETH (after the pool fee) moves √P by exactly y / L, and the tokens
 * received are L · (1/√P0 − 1/√P1). Market cap = P1 · total supply.
 *
 * The only thing this ignores is the ≤ 1 tick-spacing gap the factory leaves above spot (≤ 2%),
 * which is why figures are shown as "≈".
 */
export function simulateDevBuy(ethIn: number, lockPct: number): DevBuyEstimate {
  const p0 = INITIAL_MCAP_ETH / TOTAL_SUPPLY;
  const inPool = TOTAL_SUPPLY * (1 - Math.min(Math.max(lockPct, 0), 100) / 100);
  const sqrtP0 = Math.sqrt(p0);
  const L = inPool * sqrtP0;
  const y = Math.max(0, ethIn) * (1 - POOL_FEE_PCT / 100);
  if (y <= 0 || L <= 0) return { tokensOut: 0, pctSupply: 0, mcapEth: INITIAL_MCAP_ETH, priceEth: p0, avgPriceEth: p0, multiple: 1 };
  const sqrtP1 = sqrtP0 + y / L;
  const tokensOut = L * (1 / sqrtP0 - 1 / sqrtP1);
  const p1 = sqrtP1 * sqrtP1;
  return { tokensOut, pctSupply: (tokensOut / TOTAL_SUPPLY) * 100, mcapEth: p1 * TOTAL_SUPPLY, priceEth: p1, avgPriceEth: ethIn / tokensOut, multiple: p1 / p0 };
}
