// Usage: DEPLOYER_PRIVATE_KEY=0x… NEW_OWNER=0x… npx hardhat run script/transfer-ownership.js --network robinhood|base|baseSepolia
// Hands LaunchFactory + RewardsDistributor ownership from the deployer to NEW_OWNER (treasury or multisig),
// reading the addresses from deployments/<network>.json. After this the deployer key controls nothing.
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const newOwner = process.env.NEW_OWNER;
  if (!newOwner || !hre.ethers.isAddress(newOwner)) throw new Error("Set NEW_OWNER to a valid address");
  const { chainId } = await hre.ethers.provider.getNetwork();
  const file = fs.readdirSync("deployments").map((f) => JSON.parse(fs.readFileSync(`deployments/${f}`))).find((d) => d.chainId === Number(chainId));
  if (!file) throw new Error(`No deployments/*.json for chain ${chainId}`);
  const [signer] = await hre.ethers.getSigners();
  console.log(`Transferring ownership on ${file.name} (${chainId}) from ${signer.address} → ${newOwner}`);

  for (const [name, addr] of [["LaunchFactory", file.LaunchFactory], ["RewardsDistributor", file.RewardsDistributor]]) {
    const c = await hre.ethers.getContractAt(name, addr);
    const cur = await c.owner();
    if (cur.toLowerCase() === newOwner.toLowerCase()) { console.log(`${name}: already owned by ${newOwner}`); continue; }
    if (cur.toLowerCase() !== signer.address.toLowerCase()) throw new Error(`${name}: signer is not the owner (owner is ${cur})`);
    const tx = await c.transferOwnership(newOwner);
    await tx.wait();
    console.log(`${name} ${addr}: owner → ${await c.owner()}  (${tx.hash})`);
  }
  file.owner = newOwner; file.ownershipTransferredAt = new Date().toISOString();
  fs.writeFileSync(`deployments/${file.name}.json`, JSON.stringify(file, null, 2));
  console.log("Done. The deployer account now controls nothing — safe to remove it from your wallet.");
}
main().catch((e) => { console.error(e); process.exit(1); });
