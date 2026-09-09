# Launchpad contracts

Pons-style launch factory on Uniswap V3. One transaction mints a fixed 1B token, opens its WETH pool at a fixed starting
market cap, seeds all unlocked supply as single-sided liquidity, locks the LP NFT forever in `FeeLocker`, registers the
fee split, optionally time-locks a founder share in `FounderVault`, and executes a dev buy.

| Contract | Role |
|---|---|
| `LaunchFactory` | entry point (`launch`), owner-configurable treasury / stakers pool / protocol bps / launch fee / initial mcap |
| `LaunchToken` | fixed-supply ERC20 + Permit, no owner, no tax |
| `FeeLocker` | holds LP NFTs permanently; `collect(tokenId)` is permissionless and pushes fees to recipients by bps |
| `FounderVault` | per-(token, founder) time lock |
| `RewardsDistributor` | weekly soft-staking Merkle epochs; reward token per epoch |

Fee model: Uniswap V3 1% pool fee → 30% treasury, 70% "creator economy" split creator/stakers by the preset chosen at launch
(stakers always ≥ 50% of that 70%). Custom fee tiers above 1% need a Uniswap V4 hook; that is the planned upgrade path.

```bash
npm install --legacy-peer-deps
npx hardhat test
DEPLOYER_PRIVATE_KEY=0x… TREASURY=0x… STAKERS_POOL=0x… npx hardhat run script/deploy.js --network baseSepolia
node script/export-abi.js
```

Tests run against mocks of the Uniswap interfaces (`src/mocks`). Do a real launch on Base Sepolia before mainnet.
Not audited. Keep `protocolBps` and `initialMcapWei` changes behind the owner multisig.
