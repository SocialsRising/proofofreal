// Writes app/incubator/_lib/anvilArtifacts.ts from build.json: ABIs, the factory's init code (with constructor args),
// its CREATE2 address, and the hash of the code it will have on chain (measured by deploying it in a local EVM).
import fs from "node:fs";
import { createVM, runTx } from "@ethereumjs/vm";
import { createLegacyTx } from "@ethereumjs/tx";
import { Common, Mainnet, Hardfork } from "@ethereumjs/common";
import { Account, createAddressFromPrivateKey, hexToBytes, bytesToHex } from "@ethereumjs/util";
import { concat, encodeAbiParameters, getContractAddress, keccak256, toHex } from "viem";

const B = JSON.parse(fs.readFileSync(new URL("./build.json", import.meta.url)));
const out = process.argv[2];
const PROXY = "0x4e59b44847b379578588920ca78fbf26c0b4956c";
const SALT = keccak256(toHex("jpeg-anvil-v2"));
const FEE_RECIPIENT = "0x65d9d73d1ebcf503a7341a161f2dce660cb5952a"; // EARLY's 60% community wallet
const INITIAL_FEE = 16_000_000_000_000_000n; // 0.016 HYPE ≈ $1 at deploy time
const ctor = B.JpegAnvilFactory.abi.find((x) => x.type === "constructor");
const initcode = concat([B.JpegAnvilFactory.bytecode, encodeAbiParameters(ctor.inputs, [FEE_RECIPIENT, INITIAL_FEE])]);
const factory = getContractAddress({ from: PROXY, salt: SALT, bytecode: initcode, opcode: "CREATE2" }).toLowerCase();

// Measure the runtime code (immutables included) by deploying the same init code locally.
const common = new Common({ chain: Mainnet, hardfork: Hardfork.Cancun });
const vm = await createVM({ common });
const pk = hexToBytes("0x" + "11".repeat(32)), from = createAddressFromPrivateKey(pk);
await vm.stateManager.putAccount(from, new Account(0n, 10n ** 20n));
const tx = createLegacyTx({ nonce: 0n, gasPrice: 10n, gasLimit: 15_000_000n, data: hexToBytes(initcode) }, { common }).sign(pk);
const r = await runTx(vm, { tx, skipBlockGasLimitValidation: true });
if (r.execResult.exceptionError) throw new Error("local deploy failed");
const runtime = bytesToHex(await vm.stateManager.getCode(r.createdAddress));

const src = `// GENERATED from contracts/JpegAnvil.sol (solc 0.8.28, optimizer 200 runs, evm cancun). Do not edit by hand.
// The factory is deployed once through the standard CREATE2 deployer, so its address is fixed by this exact code.
export const CREATE2_DEPLOYER = "${PROXY}" as const;
export const ANVIL_SALT = "${SALT}" as const;
export const ANVIL_FACTORY = "${factory}" as const;
/** Init code + constructor args (fee recipient ${FEE_RECIPIENT}, initial fee ${INITIAL_FEE} wei). */
export const ANVIL_FACTORY_INITCODE = "${initcode}" as const;
/** keccak256 of the factory's on-chain code: the app only trusts a factory whose code matches exactly. */
export const ANVIL_FACTORY_RUNTIME_HASH = "${keccak256(runtime)}" as const;
/** keccak256 of the standard CREATE2 deployer's code, checked before the one-time factory setup. */
export const CREATE2_DEPLOYER_CODE_HASH = "${keccak256("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3")}" as const;
/** v1 factory (no fee), live since Nov 23 2026. Its anvils still work and open by link, but aren't listed. */
export const LEGACY_FACTORY = "0xe2eadcc9367351f3be6e80cc95bb2b1ab53580df" as const;
export const ANVIL_FACTORY_ABI = ${JSON.stringify(B.JpegAnvilFactory.abi)} as const;
export const ANVIL_ABI = ${JSON.stringify(B.JpegAnvil.abi)} as const;
`;
fs.writeFileSync(out, src);
fs.writeFileSync(new URL("./runtime.mjs", import.meta.url), `export const runtime = "${runtime}";
`);
console.log("wrote", out, "factory", factory, "runtime", runtime.length / 2 - 1, "bytes");
