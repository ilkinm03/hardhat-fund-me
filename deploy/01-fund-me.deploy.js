const { network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat.config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const { chainId } = network.config;

    const ethUsdPriceFeedAddress = developmentChains.includes(network.name)
        ? (await deployments.get("MockV3Aggregator")).address
        : networkConfig[chainId]["ethUsdPriceFeed"];

    const args = [ethUsdPriceFeedAddress];
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(fundMe.address, args);
    }
    log("--------------------------------------");
};

module.exports.tags = ["all", "fundme"];