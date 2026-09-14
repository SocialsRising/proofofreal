const { expect } = require("chai");
const { ethers } = require("hardhat");

const SUPPLY = ethers.parseEther("1000000000");

async function setup() {
  const [owner, treasury, stakers, creator, alice] = await ethers.getSigners();
  const weth = await (await ethers.getContractFactory("MockWETH")).deploy();
  const pm = await (await ethers.getContractFactory("MockPositionManager")).deploy();
  const router = await (await ethers.getContractFactory("MockRouter")).deploy();
  const F = await ethers.getContractFactory("LaunchFactory");
  const factory = await F.deploy(pm.target, router.target, weth.target, treasury.address, stakers.address, owner.address);
  const locker = await ethers.getContractAt("FeeLocker", await factory.feeLocker());
  const vault = await ethers.getContractAt("FounderVault", await factory.vault());
  return { owner, treasury, stakers, creator, alice, weth, pm, router, factory, locker, vault };
}
const params = (o = {}) => ({ name: "Cat Royale", symbol: "MEOW", creatorShareBps: 2000, lockBps: 500, lockDays: 180, minDevBuyOut: 0, metadataURI: "ipfs://x", ...o });

describe("LaunchFactory", () => {
  it("launches: 1B supply, founder lock, single-sided LP locked in FeeLocker, fee to treasury, dev buy to creator", async () => {
    const { treasury, creator, weth, pm, router, factory, locker, vault } = await setup();
    const fee = await factory.launchFee();
    const dev = ethers.parseEther("0.1");
    const tBal0 = await ethers.provider.getBalance(treasury.address);
    const tx = await factory.connect(creator).launch(params(), { value: fee + dev });
    const rc = await tx.wait();
    const ev = rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Launched");
    const token = await ethers.getContractAt("LaunchToken", ev.args.token);

    expect(await token.totalSupply()).to.equal(SUPPLY);
    expect(await token.name()).to.equal("Cat Royale");
    // 5% locked for creator, 95% in the position (held by mock PM), factory keeps nothing
    const lockAmt = SUPPLY * 500n / 10000n;
    expect(await token.balanceOf(vault.target)).to.equal(lockAmt);
    expect(await token.balanceOf(pm.target)).to.equal(SUPPLY - lockAmt);
    expect(await token.balanceOf(factory.target)).to.equal(0n);
    const lock = await vault.locks(token.target, creator.address);
    expect(lock.amount).to.equal(lockAmt);
    expect(Number(lock.unlockTime)).to.be.greaterThan(Math.floor(Date.now() / 1000) + 179 * 86400);
    // LP NFT owned by locker, split registered 30/14/56 (creator 20% of the 70% remainder)
    expect(await pm.ownerOf(ev.args.tokenId)).to.equal(locker.target);
    const rs = await locker.recipients(ev.args.tokenId);
    expect(rs.map((r) => Number(r.bps))).to.deep.equal([3000, 1400, 5600]);
    expect(rs[1].account).to.equal(creator.address);
    // launch fee and dev buy
    expect((await ethers.provider.getBalance(treasury.address)) - tBal0).to.equal(fee);
    expect(await router.lastAmountIn()).to.equal(dev);
    expect(await router.lastRecipient()).to.equal(creator.address);
    expect(await weth.balanceOf(router.target)).to.equal(dev);
    expect(await factory.totalLaunches()).to.equal(1n);
  });

  it("Diamond Handers: creator 0 bps still registered and re-pointable; stakers get the full 70%", async () => {
    const { creator, alice, factory, locker } = await setup();
    const fee = await factory.launchFee();
    const tx = await factory.connect(creator).launch(params({ creatorShareBps: 0, lockBps: 0, lockDays: 0 }), { value: fee });
    const rc = await tx.wait();
    const ev = rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Launched");
    const rs = await locker.recipients(ev.args.tokenId);
    expect(rs.map((r) => Number(r.bps))).to.deep.equal([3000, 0, 7000]);
    await locker.connect(creator).updateCreatorRecipient(ev.args.tokenId, alice.address);
    expect((await locker.recipients(ev.args.tokenId))[1].account).to.equal(alice.address);
    await expect(locker.connect(creator).updateCreatorRecipient(ev.args.tokenId, creator.address)).to.be.revertedWithCustomError(locker, "NotRecipient");
  });

  it("rejects bad params and unpaid fee", async () => {
    const { creator, factory } = await setup();
    const fee = await factory.launchFee();
    await expect(factory.connect(creator).launch(params(), { value: fee - 1n })).to.be.revertedWithCustomError(factory, "FeeNotPaid");
    await expect(factory.connect(creator).launch(params({ creatorShareBps: 5001 }), { value: fee })).to.be.revertedWithCustomError(factory, "BadParams");
    await expect(factory.connect(creator).launch(params({ lockBps: 2001 }), { value: fee })).to.be.revertedWithCustomError(factory, "BadParams");
    await expect(factory.connect(creator).launch(params({ lockBps: 100, lockDays: 0 }), { value: fee })).to.be.revertedWithCustomError(factory, "BadParams");
  });

  it("collect() splits fees by bps to treasury / creator / stakers and anyone can call it", async () => {
    const { treasury, stakers, creator, alice, weth, pm, factory, locker } = await setup();
    const fee = await factory.launchFee();
    const rc = await (await factory.connect(creator).launch(params(), { value: fee })).wait();
    const ev = rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Launched");
    const token = await ethers.getContractAt("LaunchToken", ev.args.token);
    const id = ev.args.tokenId;
    // pretend 1 WETH + 1000 tokens of fees accrued
    await weth.connect(alice).deposit({ value: ethers.parseEther("1") });
    await weth.connect(alice).transfer(pm.target, ethers.parseEther("1"));
    const tokIs0 = token.target.toLowerCase() < weth.target.toLowerCase();
    const feeTok = ethers.parseEther("1000"), feeW = ethers.parseEther("1");
    // token fees are already sitting in the PM (it holds the LP supply), so only WETH needed funding
    await pm.accrue(id, tokIs0 ? feeTok : feeW, tokIs0 ? feeW : feeTok);
    await locker.connect(alice).collect(id);
    expect(await weth.balanceOf(treasury.address)).to.equal(feeW * 3000n / 10000n);
    expect(await weth.balanceOf(creator.address)).to.equal(feeW * 1400n / 10000n);
    expect(await weth.balanceOf(stakers.address)).to.equal(feeW - feeW * 3000n / 10000n - feeW * 1400n / 10000n);
    expect(await token.balanceOf(stakers.address)).to.equal(feeTok * 5600n / 10000n);
    const p = await locker.positions(id);
    expect(p.collected0 + p.collected1).to.equal(feeTok + feeW);
  });

  it("tick ranges are single-sided on both orderings", async () => {
    const { creator, weth, pm, factory } = await setup();
    const fee = await factory.launchFee();
    for (const t of [0, 12345, -76543]) {
      await pm.setNextTick(t);
      const rc = await (await factory.connect(creator).launch(params({ symbol: "T" + Math.abs(t) }), { value: fee })).wait();
      const ev = rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Launched");
      const pos = await pm.positions(ev.args.tokenId);
      const tokIs0 = ev.args.token.toLowerCase() < weth.target.toLowerCase();
      const [lower, upper] = [Number(pos[5]), Number(pos[6])];
      expect(lower % 200).to.equal(0); expect(upper % 200).to.equal(0);
      if (tokIs0) { expect(lower).to.be.greaterThan(t); expect(upper).to.equal(887200); }
      else { expect(upper).to.be.lessThanOrEqual(t); expect(lower).to.equal(-887200); }
    }
  });

  it("founder can claim only after unlock", async () => {
    const { creator, factory, vault } = await setup();
    const fee = await factory.launchFee();
    const rc = await (await factory.connect(creator).launch(params({ lockDays: 90 }), { value: fee })).wait();
    const ev = rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Launched");
    const token = await ethers.getContractAt("LaunchToken", ev.args.token);
    await expect(vault.connect(creator).claim(token.target)).to.be.revertedWithCustomError(vault, "StillLocked");
    await ethers.provider.send("evm_increaseTime", [91 * 86400]); await ethers.provider.send("evm_mine", []);
    await vault.connect(creator).claim(token.target);
    expect(await token.balanceOf(creator.address)).to.equal(SUPPLY * 500n / 10000n);
  });
});

describe("RewardsDistributor", () => {
  it("publishes an epoch and pays valid claims once", async () => {
    const [owner, a, b] = await ethers.getSigners();
    const weth = await (await ethers.getContractFactory("MockWETH")).deploy();
    const d = await (await ethers.getContractFactory("RewardsDistributor")).deploy(owner.address);
    const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
    const rows = [[1n, a.address, ethers.parseEther("0.6")], [1n, b.address, ethers.parseEther("0.4")]];
    const tree = StandardMerkleTree.of(rows.map(r => [r[0].toString(), r[1], r[2].toString()]), ["uint256", "address", "uint256"]);
    await weth.deposit({ value: ethers.parseEther("1") });
    await weth.approve(d.target, ethers.parseEther("1"));
    await d.publish(weth.target, tree.root, ethers.parseEther("1"), "ipfs://epoch1");
    const proofA = tree.getProof(0);
    await d.claim(1, a.address, ethers.parseEther("0.6"), proofA);
    expect(await weth.balanceOf(a.address)).to.equal(ethers.parseEther("0.6"));
    await expect(d.claim(1, a.address, ethers.parseEther("0.6"), proofA)).to.be.revertedWith("claimed");
    await expect(d.claim(1, b.address, ethers.parseEther("0.6"), tree.getProof(1))).to.be.revertedWith("bad proof");
  });
});

describe("RewardsDistributor — cross-epoch safety", () => {
  const E = (n) => ethers.parseEther(n);
  async function twoEpochs() {
    const [owner, a, b] = await ethers.getSigners();
    const weth = await (await ethers.getContractFactory("MockWETH")).deploy();
    const d = await (await ethers.getContractFactory("RewardsDistributor")).deploy(owner.address);
    const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
    const mk = (rows) => StandardMerkleTree.of(rows.map(r => [r[0].toString(), r[1], r[2].toString()]), ["uint256", "address", "uint256"]);
    const t1 = mk([[1n, a.address, E("0.6")], [1n, b.address, E("0.4")]]);
    const t2 = mk([[2n, a.address, E("1")]]);
    await weth.deposit({ value: E("2") });
    await weth.approve(d.target, E("2"));
    await d.publish(weth.target, t1.root, E("1"), "ipfs://epoch1");
    await d.publish(weth.target, t2.root, E("1"), "ipfs://epoch2");
    return { owner, a, b, weth, d, t1, t2 };
  }

  it("a swept epoch cannot be claimed afterwards out of a later epoch's funds", async () => {
    const { owner, a, b, weth, d, t1, t2 } = await twoEpochs();
    await d.claim(1, a.address, E("0.6"), t1.getProof(0));      // a claims epoch 1, 0.4 left unclaimed
    await ethers.provider.send("evm_increaseTime", [181 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await d.sweep(1, owner.address);                             // epoch 1 closed, its 0.4 swept
    expect(await weth.balanceOf(d.target)).to.equal(E("1"));     // exactly epoch 2 left

    // the straggler must NOT be able to take epoch 2 money
    await expect(d.claim(1, b.address, E("0.4"), t1.getProof(1))).to.be.revertedWith("no epoch");

    // epoch 2 is still fully payable
    await d.claim(2, a.address, E("1"), t2.getProof(0));
    expect(await weth.balanceOf(d.target)).to.equal(0n);
    await expect(d.sweep(1, owner.address)).to.be.revertedWith("no epoch");  // no double sweep
  });

  it("an epoch can never pay out more than it was funded with", async () => {
    const [owner, a, b] = await ethers.getSigners();
    const weth = await (await ethers.getContractFactory("MockWETH")).deploy();
    const d = await (await ethers.getContractFactory("RewardsDistributor")).deploy(owner.address);
    const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
    // root promises 1 ETH of leaves but the epoch is only funded with 0.5 — a bad snapshot run
    const tree = StandardMerkleTree.of([[ "1", a.address, E("0.6").toString() ], [ "1", b.address, E("0.4").toString() ]], ["uint256", "address", "uint256"]);
    await weth.deposit({ value: E("0.5") });
    await weth.approve(d.target, E("0.5"));
    await d.publish(weth.target, tree.root, E("0.5"), "ipfs://bad");
    await expect(d.claim(1, a.address, E("0.6"), tree.getProof(0))).to.be.revertedWith("epoch exhausted");
  });

  it("rejects an epoch published with a zero reward token", async () => {
    const [owner, a] = await ethers.getSigners();
    const d = await (await ethers.getContractFactory("RewardsDistributor")).deploy(owner.address);
    await expect(d.publish(ethers.ZeroAddress, ethers.id("r"), E("1"), "x")).to.be.revertedWith("bad epoch");
  });
});
