/** Hand-written minimal ABIs for the Uniswap V4 periphery the swap widget talks to. */
export const PoolKeyComponents = [
  { name: "currency0", type: "address" }, { name: "currency1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" },
] as const;

export const V4QuoterAbi = [
  { type: "function", name: "quoteExactInputSingle", stateMutability: "nonpayable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "poolKey", type: "tuple", components: PoolKeyComponents }, { name: "zeroForOne", type: "bool" }, { name: "exactAmount", type: "uint128" }, { name: "hookData", type: "bytes" },
    ] }],
    outputs: [{ name: "amountOut", type: "uint256" }, { name: "gasEstimate", type: "uint256" }] },
] as const;

export const UniversalRouterAbi = [
  { type: "function", name: "execute", stateMutability: "payable", inputs: [{ name: "commands", type: "bytes" }, { name: "inputs", type: "bytes[]" }, { name: "deadline", type: "uint256" }], outputs: [] },
] as const;

export const Permit2Abi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "spender", type: "address" }, { name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }], outputs: [] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }, { name: "nonce", type: "uint48" }] },
] as const;

/** UniversalRouter command + V4 router action bytes. */
export const UR_V4_SWAP = 0x10;
export const ACT_SWAP_EXACT_IN_SINGLE = 0x06;
export const ACT_SETTLE_ALL = 0x0c;
export const ACT_TAKE_ALL = 0x0f;
export const DYNAMIC_FEE_FLAG = 0x800000;
