const hre = require("hardhat");
console.log(JSON.stringify({ hardfork: hre.config.networks.hardhat.hardfork, forking: hre.config.networks.hardhat.forking, chains: [...(hre.config.networks.hardhat.chains?.entries?.() ?? [])].map(([k, v]) => [k, v]) }, (k, v) => typeof v === "bigint" ? v.toString() : v, 2));
