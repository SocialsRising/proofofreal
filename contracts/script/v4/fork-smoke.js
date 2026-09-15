const hre = require("hardhat");
(async () => {
  const p = hre.ethers.provider;
  const t0 = Date.now();
  const bn = await p.getBlockNumber();
  const code = await p.getCode("0x8366a39cc670b4001a1121b8f6a443a643e40951");
  const pm = new hre.ethers.Contract("0x58daec3116aae6d93017baaea7749052e8a04fa7", ["function nextTokenId() view returns (uint256)"], p);
  console.log("fork block:", bn, "| PoolManager bytes:", (code.length - 2) / 2, "| nextTokenId:", (await pm.nextTokenId()).toString(), "|", Date.now() - t0, "ms");
})().catch((e) => { console.error("FORK FAIL:", e.shortMessage || e.message); process.exit(1); });
