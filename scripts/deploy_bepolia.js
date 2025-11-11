// scripts/deploy_bepolia.js
const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  // ---- signer & network ----
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const net = await ethers.provider.getNetwork();

  console.log(`\n🔑 Deployer: ${deployerAddress}`);
  console.log(`🌐 Network:  ${network.name} (chainId ${net.chainId})\n`);

  // ---- env inputs ----
  // BASE_URI should be ipfs://<CID>/  (note trailing slash!)
  const BASE_URI = (process.env.BASE_URI || "ipfs://baseuri/").trim();
  if (!BASE_URI.endsWith("/")) {
    throw new Error("BASE_URI must end with a trailing slash `/`");
  }

  // If these costs are in whole HONEY tokens, convert with parseUnits.
  // If they are raw integer (no decimals), you can pass as BigInt.
  const FORGE_COST =
    process.env.FORGE_COST !== undefined
      ? ethers.parseUnits(process.env.FORGE_COST, 18) // e.g. "100" -> 100.0 HONEY with 18 decimals
      : ethers.parseUnits("100", 18);

  const MERGE_COST =
    process.env.MERGE_COST !== undefined
      ? ethers.parseUnits(process.env.MERGE_COST, 18)
      : ethers.parseUnits("200", 18);

  const AIRDROP_ADDRESSES = (process.env.AIRDROP_ADDRESSES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // ---- HONEY: use provided address or deploy mock ----
  let honeyAddress = process.env.HONEY_ADDRESS;
  if (!honeyAddress) {
    console.log("🍯 No HONEY_ADDRESS in .env — deploying MockHoney...");
    const MockHoney = await ethers.getContractFactory("MockHoney");
    const honey = await MockHoney.deploy();
    await honey.waitForDeployment();
    honeyAddress = await honey.getAddress();
    console.log(`🍯 MockHoney deployed at: ${honeyAddress}\n`);
  } else {
    console.log(`🍯 Using existing HONEY at: ${honeyAddress}\n`);
  }

  // ---- Deploy comB ----
  // Constructor must match your ComBNFT.sol signature
  // e.g. constructor(string name, string symbol, string baseURI, address honey, uint256 forgeCost, uint256 mergeCost)
  const ComBNFT = await ethers.getContractFactory("ComBNFT");
  const comb = await ComBNFT.deploy(
    "comB",
    "COMB",
    BASE_URI,
    honeyAddress,
    FORGE_COST,
    MERGE_COST
  );
  await comb.waitForDeployment();
  const combAddress = await comb.getAddress();

  console.log(`🐝 comB deployed at: ${combAddress}`);

  // ---- If MockHoney was deployed, mint some to deployer & approve ----
  if (!process.env.HONEY_ADDRESS) {
    const honey = await ethers.getContractAt("MockHoney", honeyAddress);
    // Mint 10,000 HONEY to deployer (18 decimals)
    await (await honey.mint(deployerAddress, ethers.parseUnits("10000", 18))).wait();
    // Approve comB to pull HONEY for forge/merge costs
    await (await honey.approve(combAddress, ethers.MaxUint256)).wait();
    console.log("✅ Minted test HONEY to deployer + approved comB\n");
  }

  // ---- Optional: tiny test airdrop ----
  if (AIRDROP_ADDRESSES.length > 0) {
    console.log(`✈️  Airdropping to ${AIRDROP_ADDRESSES.length} address(es)...`);
    for (const addr of AIRDROP_ADDRESSES) {
      if (!ethers.isAddress(addr)) {
        console.log(`  • Skipping invalid address: ${addr}`);
        continue;
      }
      const tx = await comb.mint(addr);
      await tx.wait();
      console.log(`  • minted comB to ${addr}`);
    }
    console.log("✅ Airdrop simulation complete.\n");
  } else {
    console.log("ℹ️  No AIRDROP_ADDRESSES set. Skipping airdrop simulation.\n");
  }

  console.log("🎉 Done.");
  console.log(`comB:   ${combAddress}`);
  console.log(`HONEY:  ${honeyAddress}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
