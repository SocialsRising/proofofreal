// Compiles the anvil contracts (from the repo) and the test mocks with solc-js. Writes build.json.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const solc = require("solc");

const repoSrc = process.argv[2];
const input = {
  language: "Solidity",
  sources: { "JpegAnvil.sol": { content: fs.readFileSync(repoSrc, "utf8") }, "Mocks.sol": { content: fs.readFileSync(new URL("./Mocks.sol", import.meta.url), "utf8") } },
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } } },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errs = (out.errors ?? []).filter((e) => e.severity === "error");
for (const e of out.errors ?? []) console.log(e.severity.toUpperCase(), e.formattedMessage.split("\n").slice(0, 3).join(" | "));
if (errs.length) process.exit(1);
const build = {};
for (const [file, cs] of Object.entries(out.contracts)) for (const [name, c] of Object.entries(cs)) build[name] = { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object, deployed: "0x" + c.evm.deployedBytecode.object, runtimeSize: c.evm.deployedBytecode.object.length / 2, file };
fs.writeFileSync(new URL("./build.json", import.meta.url), JSON.stringify(build));
console.log("compiled", Object.keys(build).join(", "), "| factory runtime", build.JpegAnvilFactory.runtimeSize, "bytes | anvil runtime", build.JpegAnvil.runtimeSize, "bytes");
