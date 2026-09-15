// Usage: DEPLOYER_PRIVATE_KEY=0x… TREASURY=0x… [COMMUNITY_POOL=0x…] [MCAP_ETH=3] npx hardhat run script/v4/deploy.js --network robinhood
// Deploys LaunchFactoryV4 (+ its FounderVault and V4FeeLocker), mines and deploys the LaunchHook via the
// deterministic CREATE2 deployer, wires them, and writes deployments/<network>-v4.json.
const hre = require("hardhat");
const fs = require("fs");
const { ADDR, deployV4 } = require("./deploy-lib");

async function main() {
  const { chainId } = await hre.ethers.provider.getNetwork();
  if (Number(chainId) !== 4663) throw new Error(`V4 addresses in deploy-lib are for Robinhood Chain (4663); got ${chainId}`);
  const [deployer] = await hre.ethers.getSigners();
  const treasury = process.env.TREASURY, community = process.env.COMMUNITY_POOL || process.env.TREASURY;
  if (!treasury) throw new Error("Set TREASURY (and optionally COMMUNITY_POOL)");
  const mcap = Number(process.env.MCAP_ETH || 3);
  console.log(`Deploying V4 launchpad to robinhood (${chainId}) from ${deployer.address} · start mcap ${mcap} ETH`);

  const { factory, hook, locker, vault, curve, salt } = await deployV4({ signer: deployer, treasury, communityPool: community, owner: deployer.address, curveMcapEth: mcap, log: console.log });

  const out = {
    chainId: Number(chainId), name: "robinhood", version: "v4", deployedAt: new Date().toISOString(), deployer: deployer.address, owner: deployer.address,
    LaunchFactoryV4: factory.target, LaunchHook: hook.target, hookSalt: salt, V4FeeLocker: locker.target, FounderVault: vault.target,
    uniswap: ADDR, treasury, communityPool: community,
    curve: { ...curve, minSqrtPriceX96: curve.minSqrtPriceX96.toString(), initialSqrtPriceX96: curve.initialSqrtPriceX96.toString() },
  };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync("deployments/robinhood-v4.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log(`\nNext: add to .env.local + Vercel →\nNEXT_PUBLIC_FACTORY_V4_4663=${factory.target}\nNEXT_PUBLIC_HOOK_4663=${hook.target}\nThen transfer ownership: NEW_OWNER=<treasury> npx hardhat run script/v4/transfer-ownership.js --network robinhood`);
}
main().catch((e) => { console.error(e); process.exit(1); });
