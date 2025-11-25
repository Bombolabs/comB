require("dotenv").config();
const { ethers } = require("hardhat");

if (!process.env.BASE_URI) throw new Error("Missing BASE_URI in .env");
if (!process.env.ASSETS_CID) throw new Error("Missing ASSETS_CID in .env");

let baseURI = process.env.BASE_URI;
if (!baseURI.endsWith("/")) {
  baseURI = baseURI + "/";
}
const ASSETS_CID = process.env.ASSETS_CID;

const metaFor = (bcells) => ({
  jsonPath: `${baseURI}comb_${bcells}.json`,
  image: `ipfs://${ASSETS_CID}/comb_${bcells}_poster.jpg`,
  animation_url: `ipfs://${ASSETS_CID}/comb_${bcells}.mp4`,
});

async function deployFixture() {
  const [owner, user, extra1, extra2] = await ethers.getSigners();
  const ownerAddr = await owner.getAddress();
  const userAddr = await user.getAddress();

  const MockHoney = await ethers.getContractFactory("MockHoney");
  const honey = await MockHoney.deploy();
  await honey.waitForDeployment();
  const honeyAddress = await honey.getAddress();

  await honey.mint(userAddr, ethers.parseUnits("10000", 18));

  const ComBNFT = await ethers.getContractFactory("ComBNFT");
  const comb = await ComBNFT.deploy("comB", "COMB", baseURI);
  await comb.waitForDeployment();
  const combAddress = await comb.getAddress();

  const MockController = await ethers.getContractFactory("MockController");
  const controller = await MockController.deploy(combAddress, honeyAddress, ownerAddr);
  await controller.waitForDeployment();
  const controllerAddress = await controller.getAddress();

  await comb.setController(controllerAddress);
  await controller.setForgeBaseCost(ethers.parseUnits("2", 18));
  await controller.setMergeCost(ethers.parseUnits("15", 18));

  await honey.connect(user).approve(controllerAddress, ethers.MaxUint256);

  await controller.mintFor(userAddr);

  return {
    comb,
    honey,
    controller,
    owner,
    user,
    extra1,
    extra2,
    ownerAddr,
    userAddr,
    treasuryAddr: ownerAddr,
    baseURI,
    ASSETS_CID,
    metaFor,
  };
}

module.exports = {
  deployFixture,
  metaFor,
  baseURI,
  ASSETS_CID,
};
