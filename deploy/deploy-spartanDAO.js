const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("------------------------------")
    log("Deploying SpartanDAO...")
    log("------------------------------")

    const constructorArgs = [
        "30000000000000000000", // _fundraisingGoal: 30 ETH in Wei
        "Spartan",
        "SPRTN",
        "0x6fF646Ed46E8f979b9c6954C6C58aCF8D107A3fD", // _daoManager
        "0x6fF646Ed46E8f979b9c6954C6C58aCF8D107A3fD", // _protocolAdmin
    ]

    try {
        const spartanDAO = await deploy("SpartanDAO", {
            from: deployer,
            args: constructorArgs,
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
        })

        log(`SpartanDAO deployed at ${spartanDAO.address}`)

        if (
            !developmentChains.includes(network.name) &&
            process.env.BASESCAN_API_KEY
        ) {
            log("Verifying contract...")
            await verify(spartanDAO.address, constructorArgs)
            log("Contract verified!")
        }
    } catch (error) {
        console.error("Error during deployment:", error)
    }
}

module.exports.tags = ["all", "spartanDAO"]
