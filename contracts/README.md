# JPEG Anvil contracts

`JpegAnvil.sol` holds `JpegAnvil` (one token + NFT pair at a fixed rate: forge, melt, stock, sync, prune) and
`JpegAnvilFactory` (creates and lists anvils). No owner, no fees, no withdrawals.

The factory is deployed once through the standard CREATE2 deployer (`0x4e59…956c`) with salt `keccak256("jpeg-anvil-v1")`,
so its address depends only on the compiled code. The site checks the deployer's code and the factory's code by hash.

## Rebuild and test

The tools live outside the app (they aren't app dependencies). In any empty folder:

```
npm init -y && npm i solc@0.8.28 @ethereumjs/vm @ethereumjs/evm @ethereumjs/util @ethereumjs/common @ethereumjs/tx viem
cp <repo>/contracts/test/* .
node compile.mjs <repo>/contracts/JpegAnvil.sol      # solc 0.8.28, optimizer 200, evm cancun -> build.json
node test.mjs                                        # in-process EVM tests (48 checks, incl. attack cases)
node simElysium.mjs                                  # eth_call simulation on Elysium (nothing is sent)
node gen.mjs <repo>/app/incubator/_lib/anvilArtifacts.ts   # ABIs, init code, factory address + code hashes
```

Changing the contract changes the factory address. Regenerate `anvilArtifacts.ts` and re-test before shipping.
