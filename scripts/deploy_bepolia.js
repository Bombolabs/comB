const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const net = await ethers.provider.getNetwork();

  console.log(`\nDeployer: ${deployerAddress}`);
  console.log(`Network:  ${network.name} (chainId ${net.chainId})\n`);

  const BASE_URI = (process.env.BASE_URI || "ipfs://baseuri/").trim();
  if (!BASE_URI.endsWith("/")) {
    throw new Error("BASE_URI must end with a trailing slash `/`");
  }

  const FORGE_COST =
    process.env.FORGE_COST !== undefined
      ? ethers.parseUnits(process.env.FORGE_COST, 18)
      : ethers.parseUnits("2", 18);

  const MERGE_COST =
    process.env.MERGE_COST !== undefined
      ? ethers.parseUnits(process.env.MERGE_COST, 18)
      : ethers.parseUnits("15", 18);

  const AIRDROP_ADDRESSES = (process.env.AIRDROP_ADDRESSES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let honeyAddress = process.env.HONEY_ADDRESS;
  let honey;

  if (!honeyAddress) {
    const MockHoney = await ethers.getContractFactory("MockHoney");
    honey = await MockHoney.deploy();
    await honey.waitForDeployment();
    honeyAddress = await honey.getAddress();
    console.log(`HONEY (MockHoney) deployed at: ${honeyAddress}`);

    await (await honey.mint(deployerAddress, ethers.parseUnits("10000", 18))).wait();
    console.log(`Minted 10,000 test HONEY to deployer\n`);
  } else {
    honey = await ethers.getContractAt("MockHoney", honeyAddress);
    console.log(`Using existing HONEY at: ${honeyAddress}\n`);
  }

  const ComBNFT = await ethers.getContractFactory("ComBNFT");
  const comb = await ComBNFT.deploy("comB", "COMB", BASE_URI);
  await comb.waitForDeployment();
  const combAddress = await comb.getAddress();
  console.log(`comB deployed at: ${combAddress}`);

  const MockController = await ethers.getContractFactory("MockController");
  const controller = await MockController.deploy(
    combAddress,
    honeyAddress,
    deployerAddress
  );
  await controller.waitForDeployment();
  const controllerAddress = await controller.getAddress();
  console.log(`Controller deployed at: ${controllerAddress}`);

  await comb.setController(controllerAddress);
  console.log("Controller set on comB");

  await (await controller.setForgeBaseCost(FORGE_COST)).wait();
  await (await controller.setMergeCost(MERGE_COST)).wait();
  console.log(
    `Forge base cost set to ${FORGE_COST.toString()} wei, merge cost set to ${MERGE_COST.toString()} wei\n`
  );

  if (AIRDROP_ADDRESSES.length > 0) {
    console.log(`Airdropping comBs via controller to ${AIRDROP_ADDRESSES.length} address(es)...`);
    for (const addr of AIRDROP_ADDRESSES) {
      if (!ethers.isAddress(addr)) {
        console.log(`  Skipping invalid address: ${addr}`);
        continue;
      }
      const tx = await controller.mintFor(addr);
      await tx.wait();
      console.log(`  Minted comB to ${addr}`);
    }
    console.log("Airdrop complete.\n");
  } else {
    console.log("No AIRDROP_ADDRESSES set. Skipping airdrop.\n");
  }

  console.log("Done.");
  console.log(`comB:        ${combAddress}`);
  console.log(`Controller:  ${controllerAddress}`);
  console.log(`HONEY:       ${honeyAddress}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
