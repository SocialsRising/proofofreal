# JPEG Anvil contracts

`JpegAnvil.sol` holds `JpegAnvil` (one token + NFT pair at a fixed rate: forge, melt, stock, sync, prune) and
`JpegAnvilFactory` (creates and lists anvils, holds the swap fee). No owner over assets, no withdrawals.

Fee (v2): forge and melt pay `factory.fee()` HYPE per NFT (msg.value is a maximum; extra is refunded). Fees collect in the
factory and anyone can call `withdraw()` to send them to `feeRecipient` (EARLY's 60% wallet), so that wallet can never block
swaps. Only `feeRecipient` can `setFee`, capped at 0.1 HYPE, to keep it near $1.

The factory is deployed once through the standard CREATE2 deployer (`0x4e59…956c`) with salt `keccak256("jpeg-anvil-v2")` and
constructor args (fee recipient, initial fee) set in `test/gen.mjs`, so its address depends only on that init code. The site
checks the deployer's code and the factory's on-chain code by hash. v1 (`0xe2ea…80df`, salt `jpeg-anvil-v1`, no fee) is live
too; its anvils still work and open by link but aren't listed.

## Rebuild and test

The tools live outside the app (they aren't app dependencies). In any empty folder:

```
npm init -y && npm i solc@0.8.28 @ethereumjs/vm @ethereumjs/evm @ethereumjs/util @ethereumjs/common @ethereumjs/tx viem
cp <repo>/contracts/test/* .
node compile.mjs <repo>/contracts/JpegAnvil.sol      # solc 0.8.28, optimizer 200, evm cancun -> build.json
node test.mjs                                        # in-process EVM tests (65 checks, incl. attack + fee cases)
node gen.mjs <repo>/app/incubator/_lib/anvilArtifacts.ts   # ABIs, init code, factory address + code hashes
node simElysium.mjs <repo>/app/incubator/_lib/anvilArtifacts.ts   # eth_call simulation on Elysium (nothing is sent)
```

Changing the contract changes the factory address. Regenerate `anvilArtifacts.ts` and re-test before shipping.
