/* One Montra launch, shared by the incubator and meme templates. Checks the terms before anything is uploaded or
   signed: Montra's fee-menu row, then that same row on the factory contract, so a wrong or tampered API answer can
   never put different terms into what the creator signs. */
import { formatEther, parseEther, parseEventLogs, zeroHash, type PublicClient, type TransactionReceipt } from "viem";
import { LAUNCH_ABI, MONTRA_FACTORY, ZERO, builderSuffix, montra, pickRow, randomSalt } from "./montra";

/** Montra charges no launch fee today. If it ever jumps above this, the page stops and asks the creator to check first. */
export const MAX_LAUNCH_FEE = parseEther("1");

export type LaunchMeta = { imageUri: string; metadataUri: string; socials: Record<string, string> };
export type MontraLaunchInput = {
  name: string; symbol: string; description: string; feePct: number; snipe: number; firstBuy: bigint;
  fees: { feeRecipients: `0x${string}`[]; feeShares: number[] };
  upload: () => Promise<LaunchMeta>;
  onStep: (s: "check" | "upload") => void;
};

/** Everything up to the signature: returns the exact `launch` call to send (args, value, builder-code suffix). */
export async function prepareMontraLaunch(c: PublicClient, from: `0x${string}`, o: MontraLaunchInput) {
  o.onStep("check");
  const fee = o.feePct * 10000;
  const cfg = await montra.config();
  if (cfg.contracts?.factory && cfg.contracts.factory.toLowerCase() !== MONTRA_FACTORY) throw new Error("Montra reports a different factory than this page expects, so we stopped. Message @Tradesgiving.");
  const row = pickRow(cfg.configs, fee, o.snipe);
  if (!row) throw new Error("Montra doesn't offer that fee + anti-snipe combination right now. Pick another.");
  const [onchain, launchFee, enabled] = await Promise.all([
    c.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "getConfig", args: [BigInt(row.id)] }),
    c.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchFee" }),
    c.readContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launchEnabled" }),
  ]);
  if (!enabled) throw new Error("Montra has launches paused at the moment. Try again later.");
  const termsMatch = onchain.exists && onchain.enabled && onchain.quote.toLowerCase() === ZERO && onchain.totalFeePips === fee
    && onchain.earlyBuyFeeWindow === o.snipe && (o.snipe === 0 || onchain.earlyBuyFeeStartPips > 0);
  if (!termsMatch) throw new Error("Montra's fee menu doesn't match its contract right now, so we stopped before anything was signed. Try again in a few minutes.");
  if (launchFee > MAX_LAUNCH_FEE) throw new Error(`Montra's launch fee is now ${formatEther(launchFee)} HYPE, above this page's safety limit. Message @Tradesgiving before launching.`);

  o.onStep("upload");
  const meta = await o.upload();
  const params = {
    name: o.name, symbol: o.symbol, metadataURI: meta.metadataUri,
    profile: { logo: meta.imageUri, description: o.description, socials: { telegram: meta.socials.telegram ?? "", twitter: meta.socials.twitter ?? "", discord: meta.socials.discord ?? "", website: meta.socials.website ?? "", extra: "" } },
    configId: BigInt(row.id), supply: BigInt(0), salt: randomSalt(), feeRecipients: o.fees.feeRecipients, feeShares: o.fees.feeShares,
    firstBuyAmount: o.firstBuy, firstBuyMinOut: BigInt(0),
    permit: { deadline: BigInt(0), v: 0, r: zeroHash, s: zeroHash },
  } as const;
  const value = launchFee + o.firstBuy;
  const dataSuffix = builderSuffix();
  await c.simulateContract({ address: MONTRA_FACTORY, abi: LAUNCH_ABI, functionName: "launch", args: [params], account: from, value, dataSuffix });
  return { args: [params] as const, value, dataSuffix };
}

/** The token a confirmed launch created, and what the creator's first buy returned. Only trusts the factory's own event. */
export function launchedToken(receipt: TransactionReceipt) {
  const [ev] = parseEventLogs({ abi: LAUNCH_ABI, eventName: "TokenLaunched", logs: receipt.logs.filter((l) => l.address.toLowerCase() === MONTRA_FACTORY) });
  if (!ev) throw new Error("Launched, but the receipt had no TokenLaunched event. Check your wallet's activity.");
  return { token: ev.args.token, firstBuyOut: ev.args.firstBuyOut, supply: ev.args.supply };
}
