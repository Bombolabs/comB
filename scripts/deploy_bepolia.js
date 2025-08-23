// scripts/deploy_bepolia.js
const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  const DEPLOYER = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  console.log(`\n🔑 Deployer: ${DEPLOYER.address}`);
  console.log(`🌐 Network:  ${network.name}`);

  // ---- env inputs ----
  const BASE_URI = process.env.BASE_URI || "ipfs://baseuri/";
  const FORGE_COST = process.env.FORGE_COST ? ethers.BigNumber.from(process.env.FORGE_COST) : ethers.BigNumber.from(100);
  const MERGE_COST = process.env.MERGE_COST ? ethers.BigNumber.from(process.env.MERGE_COST) : ethers.BigNumber.from(200);
  const AIRDROP_ADDRESSES = (process.env.AIRDROP_ADDRESSES || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // ---- HONEY: use provided address or deploy mock ----
  let honeyAddress = process.env.HONEY_ADDRESS;
  if (!honeyAddress) {
    console.log("🍯 No HONEY_ADDRESS in .env — deploying MockHoney...");
    const MockHoney = await ethers.getContractFactory("MockHoney", DEPLOYER);
    const honey = await MockHoney.deploy();
    await honey.deployed();
    honeyAddress = honey.address;
    console.log(`🍯 MockHoney deployed at: ${honeyAddress}`);
  } else {
    console.log(`🍯 Using existing HONEY at: ${honeyAddress}`);
  }

  // ---- Deploy comB ----
  const ComBNFT = await ethers.getContractFactory("ComBNFT", DEPLOYER);
  const comb = await ComBNFT.deploy(
    "comB",
    "COMB",
    BASE_URI,
    honeyAddress,
    FORGE_COST,
    MERGE_COST
  );
  await comb.deployed();
  console.log(`🐝 comB deployed at: ${comb.address}`);

  // If we deployed MockHoney in this run, mint some to deployer and approve comB
  // (If you supplied a real HONEY address, skip this section or ensure you have balance/approval off-chain)
  if (!process.env.HONEY_ADDRESS) {
    const honey = await ethers.getContractAt("MockHoney", honeyAddress, DEPLOYER);
    // Mint 10,000 HONEY to deployer for testing
    await (await honey.mint(DEPLOYER.address, ethers.utils.parseUnits("10000", 18))).wait();
    // Approve comB to pull HONEY for forge/merge costs
    await (await honey.approve(comb.address, ethers.utils.parseUnits("1000000", 18))).wait();
    console.log("✅ Minted test HONEY to deployer + approved comB");
  }

  // ---- Optional: tiny test airdrop ----
  if (AIRDROP_ADDRESSES.length > 0) {
    console.log(`✈️  Airdropping to ${AIRDROP_ADDRESSES.length} address(es)...`);
    for (const addr of AIRDROP_ADDRESSES) {
      const tx = await comb.mint(addr);
      await tx.wait();
      console.log(`  • minted comB to ${addr}`);
    }
    console.log("✅ Airdrop simulation complete.");
  } else {
    console.log("ℹ️  No AIRDROP_ADDRESSES set. Skipping airdrop simulation.");
  }

  console.log("\n🎉 Done.");
  console.log(`comB:   ${comb.address}`);
  console.log(`HONEY:  ${honeyAddress}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
