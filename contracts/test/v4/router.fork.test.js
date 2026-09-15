// Proves the exact UniversalRouter calldata layout the in-app swap widget builds (V4_SWAP → SWAP_EXACT_IN_SINGLE +
// SETTLE_ALL + TAKE_ALL) and the Permit2 approval flow for selling, against the real router on a Robinhood fork.
//   FORK_ROBINHOOD=1 npx hardhat test test/v4/router.fork.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ADDR, deployV4 } = require("../../script/v4/deploy-lib");

const describeFork = process.env.FORK_ROBINHOOD ? describe : describe.skip;
const E = (n) => ethers.parseEther(n);
const coder = ethers.AbiCoder.defaultAbiCoder();
const POOL_KEY = "tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
const ZERO = ethers.ZeroAddress;

/** Mirrors app/launchpad/_components/Swap.tsx encodeSwap(). */
function encodeSwap(key, zeroForOne, amountIn, minOut) {
  const actions = ethers.concat(["0x06", "0x0c", "0x0f"]);
  const params = [
    coder.encode([`tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)`], [{ poolKey: key, zeroForOne, amountIn, amountOutMinimum: minOut, hookData: "0x" }]),
    coder.encode(["address", "uint256"], [zeroForOne ? ZERO : key.currency1, amountIn]),
    coder.encode(["address", "uint256"], [zeroForOne ? key.currency1 : ZERO, minOut]),
  ];
  return { commands: "0x10", inputs: [coder.encode(["bytes", "bytes[]"], [actions, params])] };
}

describeFork("UniversalRouter swaps on a launched V4 pool (Robinhood fork)", function () {
  this.timeout(600_000);
  let owner, treasury, community, creator, alice, factory, locker, key, token, quoter, router, permit2;

  before(async () => {
    [owner, treasury, community, creator, alice] = await ethers.getSigners();
    ({ factory, locker } = await deployV4({ signer: owner, treasury: treasury.address, communityPool: community.address, owner: owner.address }));
    const fee = await factory.launchFee();
    const rc = await (await factory.connect(creator).launch({ name: "Router Test", symbol: "RTR", creatorFeePips: 30_000, creatorShareBps: 5000, lockBps: 0, lockDays: 0, minDevBuyOut: 0, metadataURI: "" }, { value: fee })).wait();
    const ev = rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "Launched").args;
    const k = await locker.poolKeyOf(ev.tokenId);
    key = { currency0: k.currency0, currency1: k.currency1, fee: k.fee, tickSpacing: k.tickSpacing, hooks: k.hooks };
    token = await ethers.getContractAt("LaunchToken", ev.token);
    quoter = new ethers.Contract(ADDR.quoter, [`function quoteExactInputSingle(tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)`], alice);
    router = new ethers.Contract(ADDR.universalRouter, ["function execute(bytes commands, bytes[] inputs, uint256 deadline) payable"], alice);
    permit2 = new ethers.Contract(ADDR.permit2, ["function approve(address token,address spender,uint160 amount,uint48 expiration)", "function allowance(address,address,address) view returns (uint160,uint48,uint48)"], alice);
  });

  it("quotes and buys with ETH through the router; output matches the quote within slippage", async () => {
    const amountIn = E("0.5");
    const [quoted] = await quoter.quoteExactInputSingle.staticCall({ poolKey: key, zeroForOne: true, exactAmount: amountIn, hookData: "0x" });
    expect(quoted).to.be.gt(0n);
    const minOut = quoted - quoted / 50n; // 2%
    const { commands, inputs } = encodeSwap(key, true, amountIn, minOut);
    const deadline = Math.floor(Date.now() / 1000) + 600;
    await router.execute(commands, inputs, deadline, { value: amountIn });
    const bal = await token.balanceOf(alice.address);
    expect(bal).to.be.gte(minOut);
    expect(bal).to.be.closeTo(quoted, quoted / 1000n);
  });

  it("sells back through the router after the two Permit2 approvals", async () => {
    const bal = await token.balanceOf(alice.address);
    const sellAmt = bal / 2n;
    // token → Permit2, then Permit2 → router (exactly what the widget does)
    await token.connect(alice).approve(ADDR.permit2, ethers.MaxUint256);
    await permit2.approve(token.target, ADDR.universalRouter, (1n << 160n) - 1n, (1n << 48n) - 1n);
    const [quoted] = await quoter.quoteExactInputSingle.staticCall({ poolKey: key, zeroForOne: false, exactAmount: sellAmt, hookData: "0x" });
    const minOut = quoted - quoted / 50n;
    const ethBefore = await ethers.provider.getBalance(alice.address);
    const { commands, inputs } = encodeSwap(key, false, sellAmt, minOut);
    const rc = await (await router.execute(commands, inputs, Math.floor(Date.now() / 1000) + 600)).wait();
    const gas = rc.gasUsed * rc.gasPrice;
    const ethAfter = await ethers.provider.getBalance(alice.address);
    expect(ethAfter + gas - ethBefore).to.be.gte(minOut);
    expect(await token.balanceOf(alice.address)).to.equal(bal - sellAmt);
  });

  it("a stale minimum reverts instead of filling badly", async () => {
    const amountIn = E("0.1");
    const [quoted] = await quoter.quoteExactInputSingle.staticCall({ poolKey: key, zeroForOne: true, exactAmount: amountIn, hookData: "0x" });
    const { commands, inputs } = encodeSwap(key, true, amountIn, quoted * 2n); // impossible minimum
    await expect(router.execute(commands, inputs, Math.floor(Date.now() / 1000) + 600, { value: amountIn })).to.be.reverted;
  });
});
