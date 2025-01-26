const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("SpartanDAO and Spartan Contracts", function () {
    let spartanDAO
    let deployer,
        daoManager,
        protocolAdmin,
        contributor1,
        contributor2,
        whitelistUser

    beforeEach(async function () {
        ;[
            deployer,
            daoManager,
            protocolAdmin,
            contributor1,
            contributor2,
            whitelistUser,
        ] = await ethers.getSigners()

        // Deploy SpartanDAO
        const SpartanDAO = await ethers.getContractFactory("SpartanDAO")
        spartanDAO = await SpartanDAO.deploy(
            ethers.utils.parseEther("30"), // fundraisingGoal: 30 ETH
            "Spartan", // name
            "SPRTN", // symbol
            daoManager.address, // daoManager
            protocolAdmin.address // protocolAdmin
        )
        await spartanDAO.deployed()
    })

    it("Should start fundraising", async function () {
        await spartanDAO.connect(daoManager).startFundraising()
        const startTimestamp = await spartanDAO.fundraisingStartTimestamp()
        expect(startTimestamp).to.be.gt(0)
    })

    it("Should add users to whitelist", async function () {
        await spartanDAO
            .connect(daoManager)
            .addToWhitelist([whitelistUser.address])
        const isWhitelisted = await spartanDAO.whitelist(whitelistUser.address)
        expect(isWhitelisted).to.be.true
    })

    it("Should allow whitelisted user to contribute during whitelist period", async function () {
        await spartanDAO.connect(daoManager).startFundraising()
        await spartanDAO
            .connect(daoManager)
            .addToWhitelist([whitelistUser.address])

        await spartanDAO
            .connect(whitelistUser)
            .contribute({ value: ethers.utils.parseEther("0.5") })
        const contribution = await spartanDAO.contributions(
            whitelistUser.address
        )
        expect(contribution).to.equal(ethers.utils.parseEther("0.5"))
    })

    it("Should allow public contribution after whitelist period", async function () {
        await spartanDAO.connect(daoManager).startFundraising()

        // Advance time to end whitelist period
        await ethers.provider.send("evm_increaseTime", [180]) // Whitelist period is 3 minutes
        await ethers.provider.send("evm_mine")

        await spartanDAO
            .connect(contributor1)
            .contribute({ value: ethers.utils.parseEther("0.5") })
        const contribution = await spartanDAO.contributions(
            contributor1.address
        )
        expect(contribution).to.equal(ethers.utils.parseEther("0.5"))
    })

    it("Should finalize fundraising and deploy Spartan token", async function () {
        await spartanDAO.connect(daoManager).startFundraising()

        // Contribute ETH
        await spartanDAO
            .connect(contributor1)
            .contribute({ value: ethers.utils.parseEther("0.5") })
        await spartanDAO
            .connect(contributor2)
            .contribute({ value: ethers.utils.parseEther("0.5") })

        // Finalize fundraising
        await spartanDAO.connect(daoManager).finalizeFundraising()
        const daoToken = await spartanDAO.daoToken()

        expect(daoToken).to.not.equal(ethers.constants.AddressZero)

        // Attach Spartan token contract
        const Spartan = await ethers.getContractFactory("Spartan")
        const token = Spartan.attach(daoToken)

        // Verify token supply and ownership
        const totalSupply = await token.totalSupply()
        expect(totalSupply).to.be.gt(0)

        const tokenOwner = await token.owner()
        expect(tokenOwner).to.equal(protocolAdmin.address)
    })

    it("Should transfer tokens", async function () {
        await spartanDAO.connect(daoManager).startFundraising()

        // Contribute ETH
        await spartanDAO
            .connect(contributor1)
            .contribute({ value: ethers.utils.parseEther("1") })

        // Finalize fundraising
        await spartanDAO.connect(daoManager).finalizeFundraising()

        const daoToken = await spartanDAO.daoToken()
        const Spartan = await ethers.getContractFactory("Spartan")
        const token = Spartan.attach(daoToken)

        // Transfer tokens
        await spartanDAO
            .connect(daoManager)
            .transferTokens(
                contributor1.address,
                ethers.utils.parseUnits("1000", 18)
            )

        const balance = await token.balanceOf(contributor1.address)
        expect(balance).to.equal(ethers.utils.parseUnits("1000", 18))
    })

    it("Should execute emergency escape and withdraw ETH", async function () {
        await spartanDAO.connect(daoManager).startFundraising()

        // Contribute ETH
        await spartanDAO
            .connect(contributor1)
            .contribute({ value: ethers.utils.parseEther("1") })

        const protocolAdminBalanceBefore = await ethers.provider.getBalance(
            protocolAdmin.address
        )

        // Emergency escape
        await spartanDAO
            .connect(protocolAdmin)
            .emergencyEscape(ethers.utils.parseEther("1"))

        const protocolAdminBalanceAfter = await ethers.provider.getBalance(
            protocolAdmin.address
        )
        expect(protocolAdminBalanceAfter).to.be.gt(protocolAdminBalanceBefore)
    })
})
