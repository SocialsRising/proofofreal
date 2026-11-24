// Writes app/incubator/_lib/anvilArtifacts.ts from build.json: ABIs, the factory's init code and its CREATE2 address.
import fs from "node:fs";
import { getContractAddress, keccak256, toHex } from "viem";
const B = JSON.parse(fs.readFileSync(new URL("./build.json", import.meta.url)));
const out = process.argv[2];
const PROXY = "0x4e59b44847b379578588920ca78fbf26c0b4956c";
const SALT = keccak256(toHex("jpeg-anvil-v1"));
const factory = getContractAddress({ from: PROXY, salt: SALT, bytecode: B.JpegAnvilFactory.bytecode, opcode: "CREATE2" }).toLowerCase();
const src = `// GENERATED from contracts/JpegAnvil.sol (solc 0.8.28, optimizer 200 runs, evm cancun). Do not edit by hand.
// The factory is deployed once through the standard CREATE2 deployer, so its address is fixed by this exact code.
export const CREATE2_DEPLOYER = "${PROXY}" as const;
export const ANVIL_SALT = "${SALT}" as const;
export const ANVIL_FACTORY = "${factory}" as const;
export const ANVIL_FACTORY_INITCODE = "${B.JpegAnvilFactory.bytecode}" as const;
export const ANVIL_FACTORY_INITCODE_HASH = "${keccak256(B.JpegAnvilFactory.bytecode)}" as const;
/** keccak256 of the factory's on-chain code: the app only trusts a factory whose code matches exactly. */
export const ANVIL_FACTORY_RUNTIME_HASH = "${keccak256(B.JpegAnvilFactory.deployed)}" as const;
/** keccak256 of the standard CREATE2 deployer's code, checked before the one-time factory setup. */
export const CREATE2_DEPLOYER_CODE_HASH = "${keccak256("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3")}" as const;
export const ANVIL_FACTORY_ABI = ${JSON.stringify(B.JpegAnvilFactory.abi)} as const;
export const ANVIL_ABI = ${JSON.stringify(B.JpegAnvil.abi)} as const;
`;
fs.writeFileSync(out, src);
console.log("wrote", out, "factory", factory);
