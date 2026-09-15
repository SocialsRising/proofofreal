// Runs against a fork of Robinhood Chain mainnet, i.e. the real Uniswap V4 PoolManager / PositionManager / Permit2:
//   FORK_ROBINHOOD=1 npx hardhat test test/v4/launch.fork.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ADDR, deployV4 } = require("../../script/v4/deploy-lib");

const describeFork = process.env.FORK_ROBINHOOD ? describe : describe.skip;
const E = (n) => ethers.parseEther(n);
const PIPS_1PCT = 10_000;

describeFork("LaunchFactoryV4 on a Robinhood fork", function () {
  this.timeout(600_000);
  let owner, treasury, community, creator, alice;
  let factory, hook, locker, vault, curve, stateView, swapper;

  const params = (o = {}) => ({ name: "Swarm Labs", symbol: "SWARM", creatorFeePips: 50_000, creatorShareBps: 5000, lockBps: 500, lockDays: 180, minDevBuyOut: 0, metadataURI: "ipfs://x", ...o });
  const launchedEvent = (rc) => rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Launched").args;

  before(async () => {
    [owner, treasury, community, creator, alice] = await ethers.getSigners();
    ({ factory, hook, locker, vault, curve } = await deployV4({ signer: owner, treasury: treasury.address, communityPool: community.address, owner: owner.address, log: (m) => console.log("      " + m) }));
    stateView = await ethers.getContractAt("IStateView", ADDR.stateView);
    swapper = await (await ethers.getContractFactory("TestSwapper")).deploy(ADDR.poolManager);
  });

  it("hook address carries exactly the initialize flags and refuses non-factory pools", async () => {
    expect(BigInt(hook.target) & ((1n << 14n) - 1n)).to.equal((1n << 13n) | (1n << 12n));
    expect(await hook.factory()).to.equal(factory.target);
    await expect(hook.connect(alice).armFee(20_000)).to.be.revertedWithCustomError(hook, "NotFactory");
    const pm = await ethers.getContractAt("IPoolManager", ADDR.poolManager);
    const key = { currency0: ethers.ZeroAddress, currency1: "0x000000000000000000000000000000000000dEaD", fee: 0x800000, tickSpacing: 200, hooks: hook.target };
    await expect(pm.connect(alice).initialize(key, curve.initialSqrtPriceX96)).to.be.reverted; // NotLaunchpadPool, wrapped by the PoolManager
  });

  it("launches: 1B supply, 5% founder lock, dynamic fee 1%+5%, single-sided LP locked, dev buy to creator, fee to treasury", async () => {
    const fee = await factory.launchFee();
    const tBefore = await ethers.provider.getBalance(treasury.address);
    const rc = await (await factory.connect(creator).launch(params(), { value: fee + E("0.05") })).wait();
    const ev = launchedEvent(rc);
    const token = await ethers.getContractAt("LaunchToken", ev.token);
    expect(await token.totalSupply()).to.equal(E("1000000000"));
    expect(await token.balanceOf(factory.target)).to.be.lt(E("1")); // only rounding dust stays behind
    expect((await vault.locks(ev.token, creator.address))[0]).to.equal(E("50000000"));

    const [, tick, , lpFee] = await stateView.getSlot0(ev.poolId);
    expect(tick).to.be.lt(curve.initialTick); // the dev buy walked the price down into the range
    expect(lpFee).to.equal(PIPS_1PCT + 50_000);
    expect(await hook.feeOf(ev.poolId)).to.equal(60_000);
    expect(await stateView.getLiquidity(ev.poolId)).to.be.gt(0n);

    const pm = await ethers.getContractAt("IPositionManager", ADDR.positionManager);
    expect(await pm.ownerOf(ev.tokenId)).to.equal(locker.target);
    expect(await pm.getPositionLiquidity(ev.tokenId)).to.be.gt(0n);
    expect(await token.balanceOf(creator.address)).to.be.gt(E("1000000")); // dev buy landed
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(tBefore + fee);

    const rs = await locker.recipients(ev.tokenId);
    expect(rs.map((r) => Number(r.bps))).to.deep.equal([1666, 4167, 4167]); // 1/6 launchpad, then 50/50 of the founder's 5%
    expect(rs[0].account).to.equal(treasury.address); expect(rs[1].account).to.equal(creator.address); expect(rs[2].account).to.equal(community.address);
  });

  it("trades pay the 6% fee in both directions and collect() splits it treasury / founder / community", async () => {
    const fee = await factory.launchFee();
    const rc = await (await factory.connect(creator).launch(params({ symbol: "TWO" }), { value: fee })).wait();
    const ev = launchedEvent(rc);
    const k = await locker.poolKeyOf(ev.tokenId);
    const key = { currency0: k.currency0, currency1: k.currency1, fee: k.fee, tickSpacing: k.tickSpacing, hooks: k.hooks }; // plain object: ethers Results are read-only
    const token = await ethers.getContractAt("LaunchToken", ev.token);
    // no dev buy: the pool sits exactly at the configured initial tick, i.e. the JS tick math matches the chain
    expect((await stateView.getSlot0(ev.poolId))[1]).to.equal(curve.initialTick);

    // alice buys 1 ETH worth, then sells half of what she got
    await swapper.connect(alice).buy(key, 0, { value: E("1") });
    const got = await token.balanceOf(alice.address);
    expect(got).to.be.gt(0n);
    await token.connect(alice).approve(swapper.target, got / 2n);
    await swapper.connect(alice).sell(key, got / 2n, 0);

    const before = await Promise.all([treasury, creator, community].map((s) => ethers.provider.getBalance(s.address)));
    const cRc = await (await locker.connect(alice).collect(ev.tokenId)).wait();
    const paid = cRc.logs.map((l) => { try { return locker.interface.parseLog(l); } catch { return null; } }).filter((e) => e && e.name === "Paid");
    const collected = cRc.logs.map((l) => { try { return locker.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Collected").args;

    // ETH fee from the buy ≈ 6% of 1 ETH; token fee from the sell ≈ 6% of the amount sold
    expect(collected.amountEth).to.be.closeTo(E("0.06"), E("0.0006"));
    expect(collected.amountToken).to.be.closeTo((got / 2n) * 6n / 100n, (got / 2n) / 1000n);

    const after = await Promise.all([treasury, creator, community].map((s) => ethers.provider.getBalance(s.address)));
    const deltas = after.map((a, i) => a - before[i]);
    expect(deltas[0]).to.be.closeTo(collected.amountEth * 1666n / 10000n, 10n);
    expect(deltas[1]).to.be.closeTo(collected.amountEth * 4167n / 10000n, 10n);
    expect(deltas[2]).to.equal(collected.amountEth - deltas[0] - deltas[1]);
    expect(await token.balanceOf(community.address)).to.be.gt(0n);
    expect(paid.length).to.equal(3);
    // the position is still there, still owned by the locker, liquidity untouched
    const pm = await ethers.getContractAt("IPositionManager", ADDR.positionManager);
    expect(await pm.ownerOf(ev.tokenId)).to.equal(locker.target);
  });

  it("0% founder fee → 1% pool with everything to the launchpad; 10% + keep-all → 9091 bps to founder", async () => {
    const fee = await factory.launchFee();
    let ev = launchedEvent(await (await factory.connect(creator).launch(params({ symbol: "ZERO", creatorFeePips: 0, creatorShareBps: 5000, lockBps: 0, lockDays: 0 }), { value: fee })).wait());
    expect((await stateView.getSlot0(ev.poolId))[3]).to.equal(PIPS_1PCT);
    expect((await locker.recipients(ev.tokenId)).map((r) => Number(r.bps))).to.deep.equal([10000, 0, 0]);

    ev = launchedEvent(await (await factory.connect(creator).launch(params({ symbol: "MAX", creatorFeePips: 100_000, creatorShareBps: 10_000 }), { value: fee })).wait());
    expect((await stateView.getSlot0(ev.poolId))[3]).to.equal(110_000);
    expect((await locker.recipients(ev.tokenId)).map((r) => Number(r.bps))).to.deep.equal([909, 9091, 0]);
  });

  it("rejects fees above 10%, bad locks and an unpaid launch fee", async () => {
    const fee = await factory.launchFee();
    await expect(factory.connect(creator).launch(params({ creatorFeePips: 100_001 }), { value: fee })).to.be.revertedWithCustomError(factory, "BadParams");
    await expect(factory.connect(creator).launch(params({ lockBps: 2001 }), { value: fee })).to.be.revertedWithCustomError(factory, "BadParams");
    await expect(factory.connect(creator).launch(params(), { value: fee - 1n })).to.be.revertedWithCustomError(factory, "FeeNotPaid");
  });

  it("founder can re-point their payout address; nobody else can", async () => {
    const fee = await factory.launchFee();
    const ev = launchedEvent(await (await factory.connect(creator).launch(params({ symbol: "RP" }), { value: fee })).wait());
    await expect(locker.connect(alice).updateCreatorRecipient(ev.tokenId, alice.address)).to.be.revertedWithCustomError(locker, "NotRecipient");
    await locker.connect(creator).updateCreatorRecipient(ev.tokenId, alice.address);
    expect((await locker.recipients(ev.tokenId))[1].account).to.equal(alice.address);
  });
});
