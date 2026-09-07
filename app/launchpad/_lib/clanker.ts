import { Clanker } from "clanker-sdk/v4";
import type { ClankerTokenV4 } from "clanker-sdk";
import { CHAIN_ID, STAKING_COLLECTOR, TREASURY } from "./config";
import { rewardBps, feeSummary, type SplitKey } from "./presets";

export type LaunchInput = {
  name: string; symbol: string; description: string; image?: string | null;
  creatorFee: number; split: SplitKey;
  lock: boolean; lockPct: number; lockDays: number;
  devBuyEth: number;
  x: string; chat: string; web?: string; game?: string;
  creator: `0x${string}`;
};

const url = (v: string, base: string) => (!v ? null : /^https?:\/\//i.test(v) ? v : base + v.replace(/^@/, ""));

/** Translate the launch form into a Clanker v4 deployment config. */
export function buildClankerConfig(i: LaunchInput): ClankerTokenV4 {
  const { total } = feeSummary(i.creatorFee, i.split);
  const bps = rewardBps(i.creatorFee, i.split);
  const socials: { platform: string; url: string }[] = [];
  const xu = url(i.x, "https://x.com/"); if (xu) socials.push({ platform: "x", url: xu });
  const cu = url(i.chat, "https://"); if (cu) socials.push({ platform: /discord/i.test(cu) ? "discord" : "telegram", url: cu });
  const wu = url(i.web ?? "", "https://"); if (wu) socials.push({ platform: "website", url: wu });
  const gu = url(i.game ?? "", "https://"); if (gu) socials.push({ platform: "game", url: gu });

  const recipients = [
    { recipient: TREASURY, admin: TREASURY, bps: bps.platform, token: "Both" as const },
    { recipient: i.creator, admin: i.creator, bps: bps.creator, token: "Both" as const },
    { recipient: STAKING_COLLECTOR, admin: TREASURY, bps: bps.stakers, token: "Both" as const },
  ].filter((r) => r.bps > 0);

  return {
    name: i.name.trim(),
    symbol: i.symbol.trim().toUpperCase(),
    image: i.image ?? "",
    tokenAdmin: i.creator,
    chainId: CHAIN_ID,
    metadata: { description: i.description.trim() || undefined, socialMediaUrls: socials },
    context: { interface: "Meme Maxxers Launchpad", platform: "mememaxxers", id: i.creator },
    // One flat swap fee = creator economy fee + 1% launchpad fee, in basis points, on both sides of the pool.
    fees: { type: "static", clankerFee: total * 100, pairedFee: total * 100 },
    rewards: { recipients },
    vault: i.lock && i.lockPct > 0 ? { percentage: i.lockPct, lockupDuration: i.lockDays * 86400, vestingDuration: 0 } : undefined,
    devBuy: i.devBuyEth > 0 ? { ethAmount: i.devBuyEth } : undefined,
    vanity: false,
  };
}

type ClankerArgs = NonNullable<ConstructorParameters<typeof Clanker>[0]>;
/** wagmi's viem clients and clanker-sdk's viem types can disagree on minor versions; the runtime objects are identical. */
export function makeClanker(wallet: unknown, publicClient: unknown) {
  return new Clanker({ wallet: wallet as ClankerArgs["wallet"], publicClient: publicClient as ClankerArgs["publicClient"] });
}

export type DeployProgress = "simulating" | "signing" | "confirming" | "done";

/** Simulate, send, and wait. Throws a readable Error on failure. */
export async function deployWithClanker(
  clanker: Clanker, cfg: ClankerTokenV4, onProgress: (p: DeployProgress) => void,
): Promise<{ address: `0x${string}`; txHash: `0x${string}` }> {
  onProgress("simulating");
  const sim = await clanker.deploySimulate(cfg);
  if ("error" in sim && sim.error) throw new Error(readable(sim.error));
  onProgress("signing");
  const res = await clanker.deploy(cfg);
  if (res.error || !res.txHash) throw new Error(readable(res.error));
  onProgress("confirming");
  const waited = await res.waitForTransaction();
  if ("error" in waited && waited.error) throw new Error(readable(waited.error));
  const address = (waited as { address: `0x${string}` }).address;
  onProgress("done");
  return { address, txHash: res.txHash };
}

function readable(e: unknown): string {
  if (!e) return "Deployment failed";
  const msg = (e as { message?: string }).message ?? String(e);
  if (/user rejected|denied/i.test(msg)) return "You cancelled the transaction.";
  if (/insufficient funds/i.test(msg)) return "Not enough ETH in this wallet for the dev buy plus network fee.";
  return msg.length > 220 ? msg.slice(0, 220) + "…" : msg;
}
