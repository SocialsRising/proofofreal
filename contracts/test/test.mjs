// JPEG Anvil tests on an in-process EVM (ethereumjs, Cancun). Run: node test.mjs
import fs from "node:fs";
import { createVM, runTx } from "@ethereumjs/vm";
import { createLegacyTx } from "@ethereumjs/tx";
import { Common, Mainnet, Hardfork } from "@ethereumjs/common";
import { Account, createAddressFromPrivateKey, createAddressFromString, hexToBytes, bytesToHex } from "@ethereumjs/util";
import { encodeFunctionData, decodeFunctionResult, decodeErrorResult, encodeDeployData, parseUnits, decodeEventLog } from "viem";

const B = JSON.parse(fs.readFileSync(new URL("./build.json", import.meta.url)));
const common = new Common({ chain: Mainnet, hardfork: Hardfork.Cancun });
const vm = await createVM({ common });

const keys = {};
async function user(name, i) {
  const pk = hexToBytes(`0x${(i + 1).toString(16).padStart(64, "0")}`);
  const addr = createAddressFromPrivateKey(pk);
  await vm.stateManager.putAccount(addr, new Account(0n, 10n ** 24n));
  keys[name] = { pk, addr, hex: addr.toString() };
  return keys[name];
}
const allAbis = Object.values(B).flatMap((c) => c.abi);
const errAbi = allAbis.filter((x) => x.type === "error");

async function exec(from, to, data, gasLimit = 15_000_000n, value = 0n) {
  const acct = await vm.stateManager.getAccount(from.addr);
  const tx = createLegacyTx({ nonce: acct.nonce, gasPrice: 10n, gasLimit, value, to: to ? createAddressFromString(to) : undefined, data: hexToBytes(data) }, { common }).sign(from.pk);
  const r = await runTx(vm, { tx, skipBlockGasLimitValidation: true });
  const ret = bytesToHex(r.execResult.returnValue);
  let revert = null;
  if (r.execResult.exceptionError) {
    revert = r.execResult.exceptionError.error;
    try { revert = decodeErrorResult({ abi: errAbi, data: ret }).errorName; } catch {
      try { revert = decodeErrorResult({ abi: [{ type: "error", name: "Error", inputs: [{ type: "string" }] }], data: ret }).args[0]; } catch {}
    }
  }
  return { ok: !r.execResult.exceptionError, revert, ret, created: r.createdAddress?.toString(), gas: r.totalGasSpent, logs: r.receipt.logs };
}
async function deploy(from, name, args = []) {
  const r = await exec(from, null, encodeDeployData({ abi: B[name].abi, bytecode: B[name].bytecode, args }));
  if (!r.ok) throw new Error(`deploy ${name} failed: ${r.revert}`);
  return r.created;
}
const send = (from, to, name, fn, args = []) => exec(from, to, encodeFunctionData({ abi: B[name].abi, functionName: fn, args }));
const sendV = (from, to, name, fn, args, value) => exec(from, to, encodeFunctionData({ abi: B[name].abi, functionName: fn, args }), 15_000_000n, value);
const balanceOfEth = async (a) => (await vm.stateManager.getAccount(createAddressFromString(a)))?.balance ?? 0n;
async function read(to, name, fn, args = []) {
  const r = await vm.evm.runCall({ to: createAddressFromString(to), data: hexToBytes(encodeFunctionData({ abi: B[name].abi, functionName: fn, args })), gasLimit: 30_000_000n });
  if (r.execResult.exceptionError) throw new Error(`read ${fn} reverted`);
  const v = decodeFunctionResult({ abi: B[name].abi, functionName: fn, data: bytesToHex(r.execResult.returnValue) });
  const low = (x) => (typeof x === "string" && /^0x[0-9a-fA-F]{40}$/.test(x) ? x.toLowerCase() : x);
  return Array.isArray(v) ? v.map(low) : low(v);
}

let pass = 0, fail = 0;
function check(label, cond, extra = "") { if (cond) { pass++; console.log("  ✓", label); } else { fail++; console.log("  ✗", label, extra); } }
const ids = (...a) => a.map(BigInt);
const E18 = 10n ** 18n, RATE = 100_000n * E18;

const creator = await user("creator", 0), alice = await user("alice", 1), bob = await user("bob", 2), feeWallet = await user("fee", 9);

console.log("factory");
const factory = await deploy(creator, "JpegAnvilFactory", [feeWallet.hex, 0n]);
const token = await deploy(creator, "MockToken"), nft = await deploy(creator, "MockNFT"), notNft = await deploy(creator, "NotNft");
let r = await send(creator, factory, "JpegAnvilFactory", "create", [token, nft, RATE]);
check("create an anvil", r.ok, r.revert);
const created = r.logs.map((l) => { try { return decodeEventLog({ abi: B.JpegAnvilFactory.abi, data: bytesToHex(l[2]), topics: l[1].map(bytesToHex) }); } catch { return null; } }).find(Boolean);
const anvil = created.args.anvil.toLowerCase();
check("AnvilCreated event + list", (await read(factory, "JpegAnvilFactory", "count")) === 1n && (await read(factory, "JpegAnvilFactory", "list", [0n, 10n]))[0] === anvil);
check("anvil terms", (await read(anvil, "JpegAnvil", "token")) === token && (await read(anvil, "JpegAnvil", "nft")) === nft && (await read(anvil, "JpegAnvil", "rate")) === RATE && (await read(anvil, "JpegAnvil", "creator")) === creator.hex);
check("rejects a non-NFT collection", (await send(creator, factory, "JpegAnvilFactory", "create", [token, notNft, RATE])).revert === "NotAnNft");
check("rejects an NFT as the token", (await send(creator, factory, "JpegAnvilFactory", "create", [nft, nft, RATE])).revert === "SameAddress");
const nft2 = await deploy(creator, "MockNFT");
check("rejects an NFT on the token side", (await send(creator, factory, "JpegAnvilFactory", "create", [nft2, nft, RATE])).revert === "NotAToken");
check("rejects rate 0", (await send(creator, factory, "JpegAnvilFactory", "create", [token, nft, 0n])).revert === "ZeroRate");
check("rejects wallets (no code)", (await send(creator, factory, "JpegAnvilFactory", "create", [alice.hex, nft, RATE])).revert === "NotAContract");

console.log("seeding");
for (let i = 1; i <= 10; i++) await send(creator, nft, "MockNFT", "mint", [creator.hex, BigInt(i)]);
await send(creator, nft, "MockNFT", "setApprovalForAll", [anvil, true]);
r = await send(creator, anvil, "JpegAnvil", "stock", [ids(1, 2, 3, 4, 5)]);
check("creator stocks 5 NFTs", r.ok && (await read(anvil, "JpegAnvil", "heldCount")) === 5n, r.revert);
await send(creator, token, "MockToken", "mint", [creator.hex, 10_000_000n * E18]);
await send(creator, token, "MockToken", "transfer", [anvil, 1_000_000n * E18]);
check("creator seeds 1M tokens", (await read(anvil, "JpegAnvil", "reserve")) === 1_000_000n * E18);

console.log("forge");
await send(creator, token, "MockToken", "mint", [alice.hex, 300_000n * E18]);
check("forge without approval fails", !(await send(alice, anvil, "JpegAnvil", "forge", [ids(1)])).ok);
await send(alice, token, "MockToken", "approve", [anvil, 2n ** 255n]);
r = await send(alice, anvil, "JpegAnvil", "forge", [ids(1, 2)]);
check("alice forges #1 and #2 for 200k", r.ok && (await read(nft, "MockNFT", "ownerOf", [1n])) === alice.hex && (await read(nft, "MockNFT", "ownerOf", [2n])) === alice.hex, r.revert);
check("reserve +200k, held 3", (await read(anvil, "JpegAnvil", "reserve")) === 1_200_000n * E18 && (await read(anvil, "JpegAnvil", "heldCount")) === 3n);
check("alice paid exactly 200k", (await read(token, "MockToken", "balanceOf", [alice.hex])) === 100_000n * E18);
check("can't forge an NFT the anvil doesn't hold", (await send(alice, anvil, "JpegAnvil", "forge", [ids(1)])).revert === "NotHeld");
const before = await read(anvil, "JpegAnvil", "heldCount");
check("not enough tokens to forge fails", !(await send(alice, anvil, "JpegAnvil", "forge", [ids(3, 4)])).ok);
await send(creator, token, "MockToken", "mint", [alice.hex, 200_000n * E18]);
const dup = await send(alice, anvil, "JpegAnvil", "forge", [ids(3, 3)]); console.log("    dup revert:", dup.revert);
check("duplicate ids revert the whole batch", dup.revert === "NotHeld" && (await read(anvil, "JpegAnvil", "heldCount")) === before && (await read(nft, "MockNFT", "ownerOf", [3n])) === anvil);
check("empty batch", (await send(alice, anvil, "JpegAnvil", "forge", [[]])).revert === "EmptyBatch");
check("batch over 50", (await send(alice, anvil, "JpegAnvil", "forge", [Array.from({ length: 51 }, (_, i) => BigInt(i + 100))])).revert === "BatchTooLarge");

console.log("melt");
await send(alice, nft, "MockNFT", "setApprovalForAll", [anvil, true]);
const balBefore = await read(token, "MockToken", "balanceOf", [alice.hex]);
r = await send(alice, anvil, "JpegAnvil", "melt", [ids(1)]);
check("alice melts #1 for 100k", r.ok && (await read(token, "MockToken", "balanceOf", [alice.hex])) - balBefore === RATE && (await read(anvil, "JpegAnvil", "holds", [1n])), r.revert);
const steal = await send(bob, anvil, "JpegAnvil", "melt", [ids(6)]); console.log("    steal revert:", steal.revert);
check("bob can't melt the creator's NFT (approved to the anvil)", !steal.ok && (await read(nft, "MockNFT", "ownerOf", [6n])) === creator.hex);
check("bob can't melt alice's NFT", !(await send(bob, anvil, "JpegAnvil", "melt", [ids(2)])).ok && (await read(nft, "MockNFT", "ownerOf", [2n])) === alice.hex);
check("bob can't stock alice's NFT", !(await send(bob, anvil, "JpegAnvil", "stock", [ids(2)])).ok);
check("can't melt an NFT the anvil already holds", (await send(alice, anvil, "JpegAnvil", "melt", [ids(1)])).revert === "NotOwner");

console.log("reserves");
const small = await deploy(creator, "MockToken");
r = await send(creator, factory, "JpegAnvilFactory", "create", [small, nft, RATE]);
const dry = decodeEventLog({ abi: B.JpegAnvilFactory.abi, data: bytesToHex(r.logs.at(-1)[2]), topics: r.logs.at(-1)[1].map(bytesToHex) }).args.anvil.toLowerCase();
await send(creator, nft, "MockNFT", "setApprovalForAll", [dry, true]);
check("melt with no token reserve fails cleanly", (await send(creator, dry, "JpegAnvil", "melt", [ids(7)])).revert === "NotEnoughTokens" && (await read(nft, "MockNFT", "ownerOf", [7n])) === creator.hex);

console.log("odd tokens");
async function anvilFor(tok, nftAddr = nft) { const x = await send(creator, factory, "JpegAnvilFactory", "create", [tok, nftAddr, RATE]); return decodeEventLog({ abi: B.JpegAnvilFactory.abi, data: bytesToHex(x.logs.at(-1)[2]), topics: x.logs.at(-1)[1].map(bytesToHex) }).args.anvil.toLowerCase(); }
const feeTok = await deploy(creator, "MockToken");
await send(creator, feeTok, "MockToken", "setFee", [100n]);
const feeNft = await deploy(creator, "MockNFT");
const feeAnvil = await anvilFor(feeTok, feeNft);
await send(creator, feeNft, "MockNFT", "mint", [creator.hex, 1n]); await send(creator, feeNft, "MockNFT", "setApprovalForAll", [feeAnvil, true]);
await send(creator, feeAnvil, "JpegAnvil", "stock", [ids(1)]);
await send(creator, feeTok, "MockToken", "mint", [alice.hex, RATE]); await send(alice, feeTok, "MockToken", "approve", [feeAnvil, RATE]);
check("fee-on-transfer token: forge refused", (await send(alice, feeAnvil, "JpegAnvil", "forge", [ids(1)])).revert === "ShortPayment");

const nrTok = await deploy(creator, "NoReturnToken"), nrNft = await deploy(creator, "MockNFT");
const nrAnvil = await anvilFor(nrTok, nrNft);
await send(creator, nrNft, "MockNFT", "mint", [creator.hex, 1n]); await send(creator, nrNft, "MockNFT", "setApprovalForAll", [nrAnvil, true]); await send(creator, nrAnvil, "JpegAnvil", "stock", [ids(1)]);
await send(creator, nrTok, "NoReturnToken", "mint", [alice.hex, RATE]); await send(alice, nrTok, "NoReturnToken", "approve", [nrAnvil, RATE]);
r = await send(alice, nrAnvil, "JpegAnvil", "forge", [ids(1)]);
await send(alice, nrNft, "MockNFT", "setApprovalForAll", [nrAnvil, true]);
const r2 = await send(alice, nrAnvil, "JpegAnvil", "melt", [ids(1)]);
check("USDT-style token: forge + melt work", r.ok && r2.ok && (await read(nrTok, "NoReturnToken", "balanceOf", [alice.hex])) === RATE, `${r.revert} ${r2.revert}`);

const fTok = await deploy(creator, "FalseToken"), fNft = await deploy(creator, "MockNFT");
const fAnvil = await anvilFor(fTok, fNft);
await send(creator, fNft, "MockNFT", "mint", [creator.hex, 1n]); await send(creator, fNft, "MockNFT", "setApprovalForAll", [fAnvil, true]); await send(creator, fAnvil, "JpegAnvil", "stock", [ids(1)]);
check("token returning false: forge refused", (await send(alice, fAnvil, "JpegAnvil", "forge", [ids(1)])).revert === "TokenTransferFailed");

console.log("reentrancy + receiving");
const evilNft = await deploy(creator, "MockNFT");
const evilAnvil = await anvilFor(token, evilNft);
await send(creator, token, "MockToken", "transfer", [evilAnvil, 1_000_000n * E18]);
await send(creator, evilNft, "MockNFT", "mint", [alice.hex, 1n]); await send(alice, evilNft, "MockNFT", "setApprovalForAll", [evilAnvil, true]);
await send(creator, evilNft, "MockNFT", "setReenter", [evilAnvil]);
check("re-entering melt from the NFT transfer is blocked", (await send(alice, evilAnvil, "JpegAnvil", "melt", [ids(1)])).revert === "Reentrant" && (await read(evilAnvil, "JpegAnvil", "reserve")) === 1_000_000n * E18);

await send(creator, nft, "MockNFT", "safeTransferFrom", [creator.hex, anvil, 8n]);
check("safeTransferFrom into the anvil is tracked", await read(anvil, "JpegAnvil", "holds", [8n]));
await send(creator, nft2, "MockNFT", "mint", [creator.hex, 1n]);
check("other collections are refused", !(await send(creator, nft2, "MockNFT", "safeTransferFrom", [creator.hex, anvil, 1n])).ok);
await send(creator, nft, "MockNFT", "transferFrom", [creator.hex, anvil, 9n]);
check("plain transfer is untracked until sync", !(await read(anvil, "JpegAnvil", "holds", [9n])));
await send(bob, anvil, "JpegAnvil", "sync", [ids(9, 10)]);
check("sync tracks owned ids only", (await read(anvil, "JpegAnvil", "holds", [9n])) && !(await read(anvil, "JpegAnvil", "holds", [10n])));
check("direct onERC721Received call from a wallet refused", (await send(bob, anvil, "JpegAnvil", "onERC721Received", [bob.hex, bob.hex, 10n, "0x"])).revert === "WrongCollection");
const page = await read(anvil, "JpegAnvil", "heldIds", [0n, 100n]);
check("heldIds lists every held NFT", page.length === Number(await read(anvil, "JpegAnvil", "heldCount")) && (await read(anvil, "JpegAnvil", "heldIds", [1n, 2n])).length === 2 && (await read(anvil, "JpegAnvil", "heldIds", [99n, 2n])).length === 0);

console.log("random trading (invariants)");
const pNft = await deploy(creator, "MockNFT"), pTok = await deploy(creator, "MockToken");
const pool = await anvilFor(pTok, pNft);
const traders = [alice, bob, await user("carol", 3), await user("dave", 4)];
for (let i = 1; i <= 60; i++) await send(creator, pNft, "MockNFT", "mint", [traders[i % 4].hex, BigInt(i)]);
for (const t of traders) { await send(t, pNft, "MockNFT", "setApprovalForAll", [pool, true]); await send(creator, pTok, "MockToken", "mint", [t.hex, 3_000_000n * E18]); await send(t, pTok, "MockToken", "approve", [pool, 2n ** 255n]); }
await send(creator, pTok, "MockToken", "mint", [pool, 500_000n * E18]);
for (const t of traders.slice(0, 2)) { const mine = []; for (let id = 1; id <= 60; id++) if ((await read(pNft, "MockNFT", "ownerOf", [BigInt(id)])) === t.hex) mine.push(BigInt(id)); await send(t, pool, "JpegAnvil", "stock", [mine.slice(0, 8)]); }
let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
let expectReserve = 500_000n * E18, forged = 0, melted = 0, bad = 0;
for (let step = 0; step < 300; step++) {
  const t = traders[rnd(4)];
  if (rnd(2) === 0) {
    const held = await read(pool, "JpegAnvil", "heldIds", [0n, 100n]);
    if (!held.length) continue;
    const pick = [...new Set(Array.from({ length: 1 + rnd(3) }, () => held[rnd(held.length)]))];
    const res = await send(t, pool, "JpegAnvil", "forge", [pick]);
    if (res.ok) { expectReserve += RATE * BigInt(pick.length); forged += pick.length; }
  } else {
    const mine = []; for (let id = 1; id <= 60; id++) if ((await read(pNft, "MockNFT", "ownerOf", [BigInt(id)])) === t.hex) mine.push(BigInt(id));
    if (!mine.length) continue;
    const pick = [...new Set(Array.from({ length: 1 + rnd(3) }, () => mine[rnd(mine.length)]))];
    const res = await send(t, pool, "JpegAnvil", "melt", [pick]);
    if (res.ok) { expectReserve -= RATE * BigInt(pick.length); melted += pick.length; } else if (res.revert !== "NotEnoughTokens") bad++;
  }
  const reserve = await read(pool, "JpegAnvil", "reserve");
  if (reserve !== expectReserve) { bad++; break; }
}
let owned = 0; for (let id = 1; id <= 60; id++) if ((await read(pNft, "MockNFT", "ownerOf", [BigInt(id)])) === pool) owned++;
check(`300 random swaps: reserve always = seed + rate × (forged ${forged} − melted ${melted})`, bad === 0);
check("tracked NFTs = NFTs the anvil really owns", Number(await read(pool, "JpegAnvil", "heldCount")) === owned);

console.log("review fixes");
const loose = await deploy(creator, "LooseNFT"), looseAnvil = await anvilFor(token, loose);
await send(creator, token, "MockToken", "transfer", [looseAnvil, 1_000_000n * E18]);
await send(creator, loose, "LooseNFT", "mint", [alice.hex, 1n]); await send(alice, loose, "LooseNFT", "setApprovalForAll", [looseAnvil, true]);
const stealLoose = await send(bob, looseAnvil, "JpegAnvil", "melt", [ids(1)]);
check("sloppy collection: bob can't melt alice's approved NFT", stealLoose.revert === "NotOwner" && (await read(loose, "LooseNFT", "ownerOf", [1n])) === alice.hex, stealLoose.revert);
check("sloppy collection: alice can melt her own", (await send(alice, looseAnvil, "JpegAnvil", "melt", [ids(1)])).ok);

const hTok = await deploy(creator, "MockToken");
const unit = 1_000_000n * E18;
const hyb = await deploy(creator, "HybridNFT", [hTok, unit]);
const hAnvil = await anvilFor(hTok, hyb);
await send(creator, hTok, "MockToken", "mint", [creator.hex, 10n * unit]); await send(creator, hTok, "MockToken", "mint", [alice.hex, 10n * unit]);
await send(creator, hyb, "HybridNFT", "mint", [creator.hex, 1n]); await send(creator, hyb, "HybridNFT", "setApprovalForAll", [hAnvil, true]);
await send(creator, hAnvil, "JpegAnvil", "stock", [ids(1)]);
await send(creator, hTok, "MockToken", "transfer", [hAnvil, 3n * unit]);
await send(alice, hTok, "MockToken", "approve", [hAnvil, 2n ** 255n]);
const hRes0 = await read(hAnvil, "JpegAnvil", "reserve");
check("hybrid pair: forge refused (would drain the reserve)", (await send(alice, hAnvil, "JpegAnvil", "forge", [ids(1)])).revert === "ShortPayment" && (await read(hAnvil, "JpegAnvil", "reserve")) === hRes0);
await send(creator, hyb, "HybridNFT", "mint", [alice.hex, 2n]); await send(alice, hyb, "HybridNFT", "setApprovalForAll", [hAnvil, true]);
check("hybrid pair: melt refused", (await send(alice, hAnvil, "JpegAnvil", "melt", [ids(2)])).revert === "TokenBalanceMoved" && (await read(hAnvil, "JpegAnvil", "reserve")) === hRes0);

await send(creator, hyb, "HybridNFT", "burnFrom", [1n]);
check("ghost id listed before prune", await read(hAnvil, "JpegAnvil", "holds", [1n]));
await send(bob, hAnvil, "JpegAnvil", "prune", [ids(1)]);
check("prune drops NFTs the anvil no longer owns", !(await read(hAnvil, "JpegAnvil", "holds", [1n])) && (await read(hAnvil, "JpegAnvil", "heldCount")) === 0n);
await send(bob, anvil, "JpegAnvil", "prune", [ids(3)]);
check("prune keeps NFTs the anvil does own", await read(anvil, "JpegAnvil", "holds", [3n]));

const quiet = await deploy(creator, "QuietToken");
check("token with a silent fallback can still get an anvil", (await send(creator, factory, "JpegAnvilFactory", "create", [quiet, nft, RATE])).ok);
check("rate cap", (await send(creator, factory, "JpegAnvilFactory", "create", [token, nft, 2n ** 255n])).revert === "RateTooHigh");
check("views survive a huge page size", (await read(anvil, "JpegAnvil", "heldIds", [0n, 2n ** 256n - 1n])).length > 0 && (await read(factory, "JpegAnvilFactory", "list", [0n, 2n ** 256n - 1n])).length > 0);

console.log("fees");
const F = 16n * 10n ** 15n; // 0.016 HYPE
check("only the fee wallet can set the fee", (await send(creator, factory, "JpegAnvilFactory", "setFee", [F])).revert === "NotFeeRecipient");
check("fee cap", (await send(feeWallet, factory, "JpegAnvilFactory", "setFee", [10n ** 17n + 1n])).revert === "FeeTooHigh");
check("fee wallet sets the fee", (await send(feeWallet, factory, "JpegAnvilFactory", "setFee", [F])).ok && (await read(anvil, "JpegAnvil", "fee")) === F);
const fNft3 = await deploy(creator, "MockNFT"), feeAnv = await anvilFor(token, fNft3);
for (const id of [1n, 2n, 3n]) await send(creator, fNft3, "MockNFT", "mint", [creator.hex, id]);
await send(creator, fNft3, "MockNFT", "setApprovalForAll", [feeAnv, true]);
check("stock stays free", (await send(creator, feeAnv, "JpegAnvil", "stock", [ids(1, 2, 3)])).ok);
check("stock refuses HYPE", !(await sendV(creator, feeAnv, "JpegAnvil", "stock", [ids(4)], 1n)).ok);
await send(creator, token, "MockToken", "transfer", [feeAnv, 1_000_000n * E18]);
await send(creator, token, "MockToken", "mint", [bob.hex, 1_000_000n * E18]); await send(bob, token, "MockToken", "approve", [feeAnv, 2n ** 255n]);
check("forge without the fee", (await send(bob, feeAnv, "JpegAnvil", "forge", [ids(1, 2)])).revert === "FeeTooLow");
check("forge underpaying the fee", (await sendV(bob, feeAnv, "JpegAnvil", "forge", [ids(1, 2)], 2n * F - 1n)).revert === "FeeTooLow");
const fw0 = await balanceOfEth(feeWallet.hex), bobEth0 = await balanceOfEth(bob.hex);
const fg2 = await sendV(bob, feeAnv, "JpegAnvil", "forge", [ids(1, 2)], 3n * F);
check("forge 2 overpaying: works, extra refunded", fg2.ok && bobEth0 - (await balanceOfEth(bob.hex)) === 2n * F + fg2.gas * 10n);
check("fee held by the factory, anvil keeps no HYPE", (await balanceOfEth(factory)) === 2n * F && (await balanceOfEth(feeAnv)) === 0n);
check("isAnvil", (await read(factory, "JpegAnvilFactory", "isAnvil", [feeAnv])) && !(await read(factory, "JpegAnvilFactory", "isAnvil", [bob.hex])));
await send(bob, fNft3, "MockNFT", "setApprovalForAll", [feeAnv, true]);
check("melt without the fee", (await send(bob, feeAnv, "JpegAnvil", "melt", [ids(1)])).revert === "FeeTooLow");
const bobTok0 = await read(token, "MockToken", "balanceOf", [bob.hex]);
check("melt 1 with the fee", (await sendV(bob, feeAnv, "JpegAnvil", "melt", [ids(1)], F)).ok && (await read(token, "MockToken", "balanceOf", [bob.hex])) - bobTok0 === RATE);
check("factory holds 3 fees", (await balanceOfEth(factory)) === 3n * F && (await balanceOfEth(feeAnv)) === 0n);
check("anyone can send fees on to the fee wallet", (await send(bob, factory, "JpegAnvilFactory", "withdraw")).ok && (await balanceOfEth(feeWallet.hex)) - fw0 === 3n * F && (await balanceOfEth(factory)) === 0n);
const badFactory = await deploy(creator, "JpegAnvilFactory", [token, F]); // a token contract can't receive HYPE
const bx = await send(creator, badFactory, "JpegAnvilFactory", "create", [token, fNft3, RATE]);
const badAnv = decodeEventLog({ abi: B.JpegAnvilFactory.abi, data: bytesToHex(bx.logs.at(-1)[2]), topics: bx.logs.at(-1)[1].map(bytesToHex) }).args.anvil.toLowerCase();
await send(creator, fNft3, "MockNFT", "setApprovalForAll", [badAnv, true]);
await send(bob, fNft3, "MockNFT", "setApprovalForAll", [badAnv, true]);
await send(creator, token, "MockToken", "transfer", [badAnv, RATE]);
check("recipient that rejects HYPE can't block swaps", (await sendV(bob, badAnv, "JpegAnvil", "melt", [ids(2)], F)).ok && (await balanceOfEth(badFactory)) === F);
check("…only its own withdrawals", !(await send(bob, badFactory, "JpegAnvilFactory", "withdraw")).ok);
check("factory refuses a zero fee wallet / fee over cap", !(await exec(creator, null, encodeDeployData({ abi: B.JpegAnvilFactory.abi, bytecode: B.JpegAnvilFactory.bytecode, args: ["0x0000000000000000000000000000000000000000", 0n] }))).ok && !(await exec(creator, null, encodeDeployData({ abi: B.JpegAnvilFactory.abi, bytecode: B.JpegAnvilFactory.bytecode, args: [feeWallet.hex, 10n ** 17n + 1n] }))).ok);
await send(feeWallet, factory, "JpegAnvilFactory", "setFee", [0n]);

console.log("gas");
const gNft = await deploy(creator, "MockNFT"), gAnvil = await anvilFor(token, gNft);
const fifty = Array.from({ length: 50 }, (_, i) => BigInt(i + 1));
for (const id of fifty) await send(creator, gNft, "MockNFT", "mint", [creator.hex, id]);
await send(creator, gNft, "MockNFT", "setApprovalForAll", [gAnvil, true]);
const st = await send(creator, gAnvil, "JpegAnvil", "stock", [fifty]);
await send(creator, token, "MockToken", "approve", [gAnvil, 2n ** 255n]);
const fg = await send(creator, gAnvil, "JpegAnvil", "forge", [fifty]);
check(`50-NFT stock ${st.gas} gas, forge ${fg.gas} gas (under 10M)`, st.ok && fg.ok && st.gas < 10_000_000n && fg.gas < 10_000_000n, `${st.revert} ${fg.revert}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
