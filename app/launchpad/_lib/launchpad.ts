import { decodeEventLog, parseEther, type TransactionReceipt } from "viem";
import { LaunchFactoryAbi } from "./abi";
import type { SplitKey } from "./presets";
import { SPLITS } from "./presets";

export type LaunchInput = {
  name: string; symbol: string; split: SplitKey; lock: boolean; lockPct: number; lockDays: number; devBuyEth: number; metadataURI: string;
};

/** Arguments for LaunchFactory.launch(). msg.value = launchFee + dev buy. */
export function buildLaunchArgs(i: LaunchInput, launchFeeWei: bigint) {
  const sp = SPLITS.find((s) => s.key === i.split)!;
  const params = {
    name: i.name.trim(),
    symbol: i.symbol.trim().toUpperCase(),
    creatorShareBps: sp.creatorShareBps,
    lockBps: i.lock ? Math.round(i.lockPct * 100) : 0,
    lockDays: i.lock ? i.lockDays : 0,
    minDevBuyOut: BigInt(0),
    metadataURI: i.metadataURI,
  };
  const value = launchFeeWei + (i.devBuyEth > 0 ? parseEther(String(i.devBuyEth)) : BigInt(0));
  return { params, value };
}

export function parseLaunched(receipt: TransactionReceipt) {
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: LaunchFactoryAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "Launched") {
        const a = ev.args as { token: `0x${string}`; pool: `0x${string}`; tokenId: bigint; creator: `0x${string}` };
        return { token: a.token, pool: a.pool, tokenId: a.tokenId, creator: a.creator };
      }
    } catch { /* not ours */ }
  }
  return null;
}

export function readable(e: unknown): string {
  const msg = (e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as { message?: string })?.message ?? String(e);
  if (/user rejected|denied/i.test(msg)) return "You cancelled the transaction.";
  if (/insufficient funds/i.test(msg)) return "Not enough ETH in this wallet for the dev buy plus fees.";
  if (/FeeNotPaid/.test(msg)) return "Launch fee not covered.";
  if (/BadParams/.test(msg)) return "One of the launch settings is out of range.";
  return msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
}
