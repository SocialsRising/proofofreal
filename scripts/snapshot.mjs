#!/usr/bin/env node
/**
 * Weekly soft-staking snapshot → Merkle epoch.
 *
 *   node scripts/snapshot.mjs --chain 8453 [--block <n>] [--publish]
 *
 * For every token launched through LaunchFactory on the chain:
 *   1. read the WETH that reached the stakers pool from this token's FeeLocker collects since the last epoch
 *   2. rebuild holder balances at the snapshot block from Transfer logs (LP / vault / locker / factory excluded)
 *   3. weight = balance × tier bonus × streak boost; reward = pool × weight / Σweight
 * Writes public/launchpad/epochs/<chainId>/<epochId>.json (+ index.json) — the public, auditable payout sheet —
 * and, with --publish and DEPLOYER_PRIVATE_KEY set, approves + publishes the root on RewardsDistributor.
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, parseAbiItem, formatEther, getAddress, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { LaunchFactoryAbi, FeeLockerAbi, RewardsDistributorAbi } from "../app/launchpad/_lib/abi.ts";

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith("--") ? [a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? true : arr[i + 1]] : []).filter(Boolean));
const chainId = Number(args.chain ?? 8453);
const CFG = {
  8453:  { chain: base, rpc: process.env.BASE_RPC ?? "https://mainnet.base.org", weth: "0x4200000000000000000000000000000000000006", factory: process.env.NEXT_PUBLIC_FACTORY_8453, distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR_8453 },
  84532: { chain: baseSepolia, rpc: process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org", weth: "0x4200000000000000000000000000000000000006", factory: process.env.NEXT_PUBLIC_FACTORY_84532, distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR_84532 },
  4663:  { chain: { id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [process.env.ROBINHOOD_RPC ?? "https://rpc.robinhood.com"] } } }, rpc: process.env.ROBINHOOD_RPC ?? "https://rpc.robinhood.com", weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", factory: process.env.NEXT_PUBLIC_FACTORY_4663, distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR_4663 },
}[chainId];
if (!CFG?.factory) throw new Error(`No factory configured for chain ${chainId}`);

const TIERS = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000].map((n) => BigInt(n) * 10n ** 18n);
const tierBonus = (tier) => 1 + tier * 0.1;                       // tier 1 → 1.1× … tier 9 → 1.9×
const streakBoost = (weeks) => Math.min(3, 1 + Math.max(0, weeks - 1) * 0.2);
const CHUNK = 5_000n;

const client = createPublicClient({ chain: CFG.chain, transport: http(CFG.rpc) });
const dir = path.join("public/launchpad/epochs", String(chainId));
fs.mkdirSync(dir, { recursive: true });
const indexPath = path.join(dir, "index.json");
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { chainId, epochs: [] };
const prev = index.epochs.at(-1) ? JSON.parse(fs.readFileSync(path.join(dir, `${index.epochs.at(-1).id}.json`), "utf8")) : null;
const epochId = (prev?.id ?? 0) + 1;
const toBlock = args.block ? BigInt(args.block) : await client.getBlockNumber();
const fromBlock = prev ? BigInt(prev.toBlock) + 1n : 0n;

async function logs(params) {
  const out = [];
  let from = params.fromBlock;
  while (from <= params.toBlock) {
    const to = from + CHUNK - 1n > params.toBlock ? params.toBlock : from + CHUNK - 1n;
    out.push(...await client.getLogs({ ...params, fromBlock: from, toBlock: to }));
    from = to + 1n;
  }
  return out;
}

const factory = CFG.factory;
const [locker, vault, stakersPool] = await Promise.all([
  client.readContract({ address: factory, abi: LaunchFactoryAbi, functionName: "feeLocker" }),
  client.readContract({ address: factory, abi: LaunchFactoryAbi, functionName: "vault" }),
  client.readContract({ address: factory, abi: LaunchFactoryAbi, functionName: "stakersPool" }),
]);
const launched = await logs({ address: factory, event: parseAbiItem("event Launched(address indexed token, address indexed creator, address pool, uint256 tokenId, uint16 creatorShareBps, uint16 lockBps, uint32 lockDays, uint256 devBuyWei, string metadataURI)"), fromBlock: 0n, toBlock });
console.log(`chain ${chainId} · epoch ${epochId} · blocks ${fromBlock}–${toBlock} · ${launched.length} tokens`);

const claims = []; const perToken = [];
for (const l of launched) {
  const { token, pool, tokenId } = l.args;
  // 1. WETH that flowed to the stakers pool from this position this epoch
  const collected = await logs({ address: locker, event: parseAbiItem("event Collected(uint256 indexed tokenId, uint256 amount0, uint256 amount1)"), args: { tokenId }, fromBlock, toBlock });
  const pos = await client.readContract({ address: locker, abi: FeeLockerAbi, functionName: "positions", args: [tokenId] });
  const rs = await client.readContract({ address: locker, abi: FeeLockerAbi, functionName: "recipients", args: [tokenId] });
  const stakersBps = BigInt(rs.find((r) => r.account.toLowerCase() === stakersPool.toLowerCase())?.bps ?? 0);
  const wethIs0 = pos[0].toLowerCase() === CFG.weth.toLowerCase();
  const wethFees = collected.reduce((a, c) => a + (wethIs0 ? c.args.amount0 : c.args.amount1), 0n);
  const poolWei = wethFees * stakersBps / 10_000n;
  if (poolWei === 0n) { perToken.push({ token, symbol: "?", poolWei: "0", holders: 0 }); continue; }

  // 2. balances at snapshot
  const transfers = await logs({ address: token, event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"), fromBlock: 0n, toBlock });
  const bal = new Map();
  for (const t of transfers) { const { from, to, value } = t.args; bal.set(from, (bal.get(from) ?? 0n) - value); bal.set(to, (bal.get(to) ?? 0n) + value); }
  const excluded = new Set([pool, vault, locker, factory, "0x0000000000000000000000000000000000000000", stakersPool].map((a) => a.toLowerCase()));
  const symbol = await client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" });

  // 3. weights
  const rows = [];
  for (const [addr, b] of bal) {
    if (excluded.has(addr.toLowerCase()) || b <= 0n) continue;
    const tier = TIERS.filter((t) => b >= t).length; if (!tier) continue;
    const streak = (prev?.streaks?.[token.toLowerCase()]?.[addr.toLowerCase()] ?? 0) + 1;
    const weight = Number(formatEther(b)) * tierBonus(tier) * streakBoost(streak);
    rows.push({ addr: getAddress(addr), balance: b, tier, streak, weight });
  }
  const totalW = rows.reduce((a, r) => a + r.weight, 0);
  for (const r of rows) {
    const amount = totalW ? BigInt(Math.floor(Number(poolWei) * r.weight / totalW)) : 0n;
    if (amount > 0n) claims.push({ account: r.addr, amount, token, symbol, tier: r.tier, streak: r.streak, balance: r.balance.toString() });
  }
  perToken.push({ token, symbol, poolWei: poolWei.toString(), holders: rows.length, streaks: Object.fromEntries(rows.map((r) => [r.addr.toLowerCase(), r.streak])) });
}

// one leaf per account (sum across tokens) so a wallet claims once per epoch
const byAcct = new Map();
for (const c of claims) byAcct.set(c.account, (byAcct.get(c.account) ?? 0n) + c.amount);
const leaves = [...byAcct].map(([account, amount]) => [String(epochId), account, amount.toString()]);
const total = [...byAcct.values()].reduce((a, b) => a + b, 0n);
const tree = leaves.length ? StandardMerkleTree.of(leaves, ["uint256", "address", "uint256"]) : null;
const epoch = {
  id: epochId, chainId, fromBlock: fromBlock.toString(), toBlock: toBlock.toString(), createdAt: new Date().toISOString(),
  rewardToken: CFG.weth, total: total.toString(), root: tree?.root ?? null,
  tokens: perToken.map(({ streaks, ...t }) => t),
  streaks: Object.fromEntries(perToken.map((t) => [t.token.toLowerCase(), t.streaks ?? {}])),
  claims: leaves.map(([, account, amount], i) => ({ account, amount, proof: tree.getProof(i), detail: claims.filter((c) => c.account === account).map(({ token, symbol, tier, streak, amount }) => ({ token, symbol, tier, streak, amount: amount.toString() })) })),
};
fs.writeFileSync(path.join(dir, `${epochId}.json`), JSON.stringify(epoch, null, 2));
index.epochs.push({ id: epochId, root: epoch.root, total: epoch.total, toBlock: epoch.toBlock, createdAt: epoch.createdAt, published: false });
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`epoch ${epochId}: ${leaves.length} wallets · ${formatEther(total)} WETH · root ${epoch.root}`);

if (args.publish && tree && process.env.DEPLOYER_PRIVATE_KEY && CFG.distributor) {
  const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
  const wallet = createWalletClient({ account, chain: CFG.chain, transport: http(CFG.rpc) });
  const uri = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://proofofreal.vercel.app"}/launchpad/epochs/${chainId}/${epochId}.json`;
  const h1 = await wallet.writeContract({ address: CFG.weth, abi: erc20Abi, functionName: "approve", args: [CFG.distributor, total] });
  await client.waitForTransactionReceipt({ hash: h1 });
  const h2 = await wallet.writeContract({ address: CFG.distributor, abi: RewardsDistributorAbi, functionName: "publish", args: [CFG.weth, tree.root, total, uri] });
  await client.waitForTransactionReceipt({ hash: h2 });
  index.epochs.at(-1).published = true; index.epochs.at(-1).tx = h2;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`published: ${h2}`);
} else if (tree) {
  console.log(`\nTo publish: approve ${formatEther(total)} WETH to ${CFG.distributor} from the stakers pool wallet, then RewardsDistributor.publish(${CFG.weth}, ${tree.root}, ${total}, "<url of ${epochId}.json>") — or rerun with --publish and DEPLOYER_PRIVATE_KEY.`);
}
