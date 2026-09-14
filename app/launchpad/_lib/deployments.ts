/** Contracts the factory created at deploy time, per chain. Factory + distributor themselves come from env via chains.ts. */
export const DEPLOYMENTS: Record<number, { feeLocker: `0x${string}`; founderVault: `0x${string}` }> = {
  4663: { feeLocker: "0xcB2C60Dc6fb5441d045396a2eC92cbC1C497f3C8", founderVault: "0xcdc20a1C698a2515DDe35aD483417Cc125EB8Be4" },
};
