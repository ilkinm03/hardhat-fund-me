const { assert } = require("chai");
const { ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat.config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async () => {

        let fundMe, deployer;
        const sendValue = ethers.utils.parseEther("0.1");

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            fundMe = await ethers.getContract("FundMe");
        });

        it("should allow people to fund and withdraw", async () => {
            const fundTxResponse = await fundMe.fund({ value: sendValue });
            await fundTxResponse.wait(1);
            const withdrawTxResponse = await fundMe.withdraw();
            await withdrawTxResponse.wait(1);
            const endingBalance = await fundMe.provider.getBalance(fundMe.address);
            assert.equal(endingBalance.toString(), "0");
        });
    });