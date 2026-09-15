require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

// Use the locally installed solc-js so compiles work without downloading a compiler.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.36") {
    const solc = require("solc");
    return { compilerPath: require.resolve("solc/soljson.js"), isSolcJs: true, version: "0.8.36", longVersion: solc.version() };
  }
  return runSuper();
});

const PK = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = PK ? [PK] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { version: "0.8.36", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "cancun" } },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      // FORK_ROBINHOOD=1 runs the hardhat network as a fork of Robinhood Chain mainnet (real Uniswap V4 contracts).
      ...(process.env.FORK_ROBINHOOD ? {
        hardfork: "cancun",
        forking: { url: process.env.ROBINHOOD_RPC || "https://rpc.mainnet.chain.robinhood.com" },
        chains: { 4663: { hardforkHistory: { cancun: 0 } } },
      } : {}),
    },
    baseSepolia: { url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org", chainId: 84532, accounts },
    base: { url: process.env.BASE_RPC || "https://mainnet.base.org", chainId: 8453, accounts },
    robinhood: { url: process.env.ROBINHOOD_RPC || "https://rpc.mainnet.chain.robinhood.com", chainId: 4663, accounts },
  },
  paths: { sources: "./src", tests: "./test" },
};
