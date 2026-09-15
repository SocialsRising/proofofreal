// Usage: DEPLOYER_PRIVATE_KEY=0x… NEW_OWNER=0x… npx hardhat run script/v4/transfer-ownership.js --network robinhood
// Hands LaunchFactoryV4 ownership from the deployer to NEW_OWNER (treasury or multisig). The hook and locker have
// no owner. After this the deployer key controls nothing.
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const newOwner = process.env.NEW_OWNER;
  if (!newOwner || !hre.ethers.isAddress(newOwner)) throw new Error("Set NEW_OWNER to a valid address");
  const file = JSON.parse(fs.readFileSync("deployments/robinhood-v4.json"));
  const [signer] = await hre.ethers.getSigners();
  const f = await hre.ethers.getContractAt("LaunchFactoryV4", file.LaunchFactoryV4);
  const cur = await f.owner();
  if (cur.toLowerCase() === newOwner.toLowerCase()) { console.log(`already owned by ${newOwner}`); return; }
  if (cur.toLowerCase() !== signer.address.toLowerCase()) throw new Error(`signer is not the owner (owner is ${cur})`);
  const tx = await f.transferOwnership(newOwner);
  await tx.wait();
  console.log(`LaunchFactoryV4 ${file.LaunchFactoryV4}: owner → ${await f.owner()}  (${tx.hash})`);
  file.owner = newOwner; file.ownershipTransferredAt = new Date().toISOString();
  fs.writeFileSync("deployments/robinhood-v4.json", JSON.stringify(file, null, 2));
  console.log("Done. The deployer account now controls nothing — safe to remove it from your wallet.");
}
main().catch((e) => { console.error(e); process.exit(1); });
