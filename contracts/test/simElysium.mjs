// Simulates (eth_call only) the factory deployment via the CREATE2 deployer on Elysium, then create() for $EARLY + Early Birds.
import fs from "node:fs";
import { createPublicClient, http, getContractAddress, keccak256, toHex, concat, encodeFunctionData, decodeFunctionResult, parseUnits } from "viem";
const B = JSON.parse(fs.readFileSync(new URL("./build.json", import.meta.url)));
const c = createPublicClient({ transport: http("https://rpc.elysium.kinetiq.xyz") });
const PROXY = "0x4e59b44847b379578588920ca78fbf26c0b4956c";
const SALT = keccak256(toHex("jpeg-anvil-v2"));
const art = fs.readFileSync(process.argv[2], "utf8");
const initcode = art.match(/ANVIL_FACTORY_INITCODE = "(0x[0-9a-f]+)"/)[1];
const predicted = getContractAddress({ from: PROXY, salt: SALT, bytecode: initcode, opcode: "CREATE2" });
const dep = await c.call({ to: PROXY, data: concat([SALT, initcode]), gas: 10_000_000n });
console.log("predicted factory", predicted, "| proxy deploy sim returned", dep.data);
console.log("already deployed?", (await c.getCode({ address: predicted })) ?? "no");
const EARLY = "0x2a67aee95a8e28307d720685cf3e8b0ab10284a5", BIRDS = "0x2884fa7b4454d8088eed010d56a0a018b0ef2b8a";
const from = "0x1111111111111111111111111111111111111111";
const res = await c.call({ account: from, to: predicted, data: encodeFunctionData({ abi: B.JpegAnvilFactory.abi, functionName: "create", args: [EARLY, BIRDS, parseUnits("100000", 18)] }), stateOverride: [{ address: predicted, code: (await import("./runtime.mjs")).runtime, stateDiff: [{ slot: "0x0000000000000000000000000000000000000000000000000000000000000000", value: "0x00000000000000000000000000000000000000000000000000038d7ea4c68000" }] }], gas: 10_000_000n });
console.log("create($EARLY, Early Birds, 100k) sim ->", decodeFunctionResult({ abi: B.JpegAnvilFactory.abi, functionName: "create", data: res.data }));
console.log("initcode hash", keccak256(initcode));
