const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect, ...chai } = require("chai");
const { solidity } = require("ethereum-waffle");

chai.use(solidity);

describe("FundMe", async () => {

    let deployer;
    let fundMe;
    let mockV3Aggregator;

    const sendValue = ethers.utils.parseEther("50");

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
    });

    describe("constructor", async () => {
        it("sets the aggregator addresses correctly", async () => {
            const response = await fundMe.priceFeed();
            assert.equal(response, mockV3Aggregator.address);
        });
    });

    describe("fund", async () => {
        it("should fail if you don't send enough ETH", async () => {
            await expect(fundMe.fund()).to.be.revertedWith("Minimum fund amount must be 50 USD.");
        });

        it("should update the amount funded data structure", async () => {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.addressToAmountFunded(deployer);
            assert.equal(response.toString(), sendValue.toString());
        });

        it("should add funder to the funders array", async () => {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.funders(0);
            assert.equal(funder, deployer);
        });
    });

    describe("withdraw", async () => {
        beforeEach(async () => {
            await fundMe.fund({ value: sendValue });
        });

        it("can withdraw ETH from a single funder", async () => {
            const startingFunMeBalance = await fundMe.provider.getBalance(fundMe.address);
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer);
            const transactionResponse = await fundMe.withdraw();
            const { gasUsed, effectiveGasPrice } = await transactionResponse.wait(1);
            const gasCost = gasUsed.mul(effectiveGasPrice);
            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFunMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString()
            );
        });

        it("allows to withdraw with multiple funders", async () => {
            const accounts = await ethers.getSigners();
            for (let i = 1; i < 5; i++) {
                const fundMeConnectedContract = await fundMe.connect(accounts[i]);
                await fundMeConnectedContract.fund({ value: sendValue });
            }
            const startingFunMeBalance = await fundMe.provider.getBalance(fundMe.address);
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer);
            const transactionResponse = await fundMe.withdraw();
            const { gasUsed, effectiveGasPrice } = await transactionResponse.wait(1);
            const gasCost = gasUsed.mul(effectiveGasPrice);
            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFunMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString()
            );
            await expect(fundMe.funders(0)).to.be.reverted;
            for (let i = 1; i < 5; i++) {
                assert.equal(await fundMe.addressToAmountFunded(accounts[i].address), 0);
            }
        });

        it("should only allows the owner to withdraw", async () => {
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const attackerConnectedContract = await fundMe.connect(attacker);
            await expect(attackerConnectedContract.withdraw()).to.be.revertedWith("FundMe__NotOwner");
        })
    });
});