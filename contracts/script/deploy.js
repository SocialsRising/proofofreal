// Usage: DEPLOYER_PRIVATE_KEY=0x… TREASURY=0x… STAKERS_POOL=0x… npx hardhat run script/deploy.js --network baseSepolia|base|robinhood
const hre = require("hardhat");
const fs = require("fs");

// Canonical Uniswap V3 + WETH per chain. Verify against the explorer before a mainnet deploy.
const CHAINS = {
  84532: { name: "base-sepolia", positionManager: "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2", swapRouter: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4", weth: "0x4200000000000000000000000000000000000006" },
  8453:  { name: "base",         positionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1", swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", weth: "0x4200000000000000000000000000000000000006" },
  4663:  { name: "robinhood",    positionManager: "0x73991a25c818bf1f1128deaab1492d45638de0d3", swapRouter: "0xcaf681a66d020601342297493863e78c959e5cb2", weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" },
};

async function main() {
  const { chainId } = await hre.ethers.provider.getNetwork();
  const c = CHAINS[Number(chainId)];
  if (!c) throw new Error(`No Uniswap config for chain ${chainId}`);
  const [deployer] = await hre.ethers.getSigners();
  const treasury = process.env.TREASURY, stakers = process.env.STAKERS_POOL || process.env.TREASURY;
  if (!treasury) throw new Error("Set TREASURY (and optionally STAKERS_POOL)");
  console.log(`Deploying to ${c.name} (${chainId}) from ${deployer.address}`);

  const F = await hre.ethers.getContractFactory("LaunchFactory");
  const factory = await F.deploy(c.positionManager, c.swapRouter, c.weth, treasury, stakers, deployer.address);
  await factory.waitForDeployment();
  const D = await hre.ethers.getContractFactory("RewardsDistributor");
  const dist = await D.deploy(deployer.address);
  await dist.waitForDeployment();

  const out = {
    chainId: Number(chainId), name: c.name, deployedAt: new Date().toISOString(), deployer: deployer.address,
    LaunchFactory: factory.target, FeeLocker: await factory.feeLocker(), FounderVault: await factory.vault(), RewardsDistributor: dist.target,
    uniswap: c, treasury, stakersPool: stakers,
  };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(`deployments/${c.name}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log(`\nNext: add to .env.local →\nNEXT_PUBLIC_FACTORY_${Number(chainId)}=${factory.target}\nNEXT_PUBLIC_DISTRIBUTOR_${Number(chainId)}=${dist.target}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
