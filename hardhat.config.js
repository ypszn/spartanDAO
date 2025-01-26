require("@nomicfoundation/hardhat-chai-matchers")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()
require("@nomicfoundation/hardhat-toolbox")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const BASE_SEPOLIA_RPC_URL =
    process.env.BASE_SEPOLIA_RPC_URL ||
    "https://base-sepolia.infura.io/v3/ce2903cddcea4f74bd61aa536f02d187"

const PRIVATE_KEY = process.env.PRIVATE_KEY

const BASESCAN_API_KEY =
    process.env.BASESCAN_API_KEY || "JAGUMAMDBS9W1R26TX7KVTATDXT8RPY2I6"
const REPORT_GAS = process.env.REPORT_GAS.toLowerCase() === "true" || false

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // },
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
        "base-mainnet": {
            url: "https://base-mainnet.infura.io/v3/ce2903cddcea4f74bd61aa536f02d187",
            accounts: [process.env.PRIVATE_KEY],
            gasPrice: 1000000000,
        },
        // for testnet
        "base-sepolia": {
            url: process.env.BASE_SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY],
            gasPrice: 1000000000,
        },
        // for local dev environment
        "base-local": {
            url: "http://localhost:8545",
            accounts: [process.env.PRIVATE_KEY],
            gasPrice: 1000000000,
        },
    },

    sourcify: {
        enabled: false,
        apiUrl: "https://sourcify.dev/server",
        browserUrl: "https://repo.sourcify.dev",
    },

    etherscan: {
        apiKey: {
            "base-mainnet": [process.env.BASESCAN_API_KEY],
            base: [process.env.BASESCAN_API_KEY],
        },
        customChains: [
            {
                network: "base-mainnet",
                chainId: 8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org",
                },
            },
        ],
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        infura: process.env.INFURA_API_KEY,
    },
    contractSizer: {
        runOnCompile: false,
        only: ["SpartanDAO"],
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        user1: {
            default: 1,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.20",
            },
            {
                version: "0.4.24",
            },
        ],
        settings: {
            optimizer: {
                enabled: true,
                runs: 200, // Lower runs value can reduce bytecode size but may increase runtime gas cost
            },
        },
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
}
