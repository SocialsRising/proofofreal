// Shared by the fork test and the deploy script: mines a CREATE2 salt so the LaunchHook lands on an address whose
// low 14 bits are exactly BEFORE_INITIALIZE | AFTER_INITIALIZE, and deploys it through Arachnid's deterministic
// deployer (present on Robinhood Chain and on a fork of it).
const { ethers } = require("hardhat");
const { curveForMcap } = require("./tickmath");

const ADDR = {
  poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
  positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  stateView: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
  universalRouter: "0x8876789976decbfcbbbe364623c63652db8c0904",
  create2Deployer: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
};
const HOOK_FLAGS = (1n << 13n) | (1n << 12n);
const ALL_HOOK_MASK = (1n << 14n) - 1n;

function create2Address(deployer, salt, initCodeHash) {
  return ethers.getAddress("0x" + ethers.keccak256(ethers.concat(["0xff", deployer, salt, initCodeHash])).slice(26));
}

/** Finds a salt for which the hook address carries exactly the two initialize flags. ~16k tries on average. */
function mineHookSalt(initCode, deployer = ADDR.create2Deployer, start = 0n) {
  const hash = ethers.keccak256(initCode);
  for (let i = start; ; i++) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32);
    const addr = create2Address(deployer, salt, hash);
    if ((BigInt(addr) & ALL_HOOK_MASK) === HOOK_FLAGS) return { salt, address: addr, tries: Number(i - start) + 1 };
  }
}

/** Deploys factory + hook + wires them. `curveMcapEth` defaults to a 3 ETH starting market cap. */
async function deployV4({ signer, treasury, communityPool, owner, curveMcapEth = 3, tickSpacing = 200, log = () => {} }) {
  const c = curveForMcap(curveMcapEth, tickSpacing);
  const curve = { tickSpacing: c.tickSpacing, minTick: c.minTick, minSqrtPriceX96: c.minSqrtPriceX96, initialTick: c.initialTick, initialSqrtPriceX96: c.initialSqrtPriceX96 };
  const F = await ethers.getContractFactory("LaunchFactoryV4", signer);
  const factory = await F.deploy(ADDR.poolManager, ADDR.positionManager, ADDR.permit2, treasury, communityPool, owner, curve);
  await factory.waitForDeployment();
  log(`LaunchFactoryV4 ${factory.target}`);

  const H = await ethers.getContractFactory("LaunchHook", signer);
  const initCode = ethers.concat([H.bytecode, ethers.AbiCoder.defaultAbiCoder().encode(["address", "address"], [ADDR.poolManager, factory.target])]);
  const { salt, address: hookAddr, tries } = mineHookSalt(initCode);
  log(`hook salt mined in ${tries} tries → ${hookAddr}`);
  const tx = await signer.sendTransaction({ to: ADDR.create2Deployer, data: ethers.concat([salt, initCode]) });
  await tx.wait();
  if ((await ethers.provider.getCode(hookAddr)) === "0x") throw new Error("hook deploy failed");
  const hook = await ethers.getContractAt("LaunchHook", hookAddr, signer);
  await (await factory.setHook(hookAddr)).wait();
  const locker = await ethers.getContractAt("V4FeeLocker", await factory.feeLocker(), signer);
  const vault = await ethers.getContractAt("FounderVault", await factory.vault(), signer);
  return { factory, hook, locker, vault, curve: c, salt };
}

module.exports = { ADDR, HOOK_FLAGS, mineHookSalt, create2Address, deployV4 };
