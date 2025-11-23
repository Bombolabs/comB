const { expect } = require("chai");
const { ethers } = require("hardhat");

const ASSETS_CID =
  "bafybeiejecjpek4ebgy4jnfru4zcd37ezfeiyu344nzjkjyfmqbh3fbaxy";

const baseURI = "ipfs://baseuri/";

const metaFor = (bcells) => ({
  jsonPath: `${baseURI}comb_${bcells}.json`,
  image: `ipfs://${ASSETS_CID}/comb_${bcells}_poster.jpg`,
  animation_url: `ipfs://${ASSETS_CID}/comb_${bcells}.mp4`,
});

let comb;
let honey;
let controller;
let owner;
let user;
let ownerAddr;
let userAddr;

describe("ComBNFT + MockController (economic controller)", function () {
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    userAddr = await user.getAddress();

    const MockHoney = await ethers.getContractFactory("MockHoney");
    honey = await MockHoney.deploy();
    await honey.waitForDeployment();
    const honeyAddress = await honey.getAddress();

    await honey.mint(userAddr, ethers.parseUnits("1000", 18));

    const ComBNFT = await ethers.getContractFactory("ComBNFT");
    comb = await ComBNFT.deploy("comB", "COMB", baseURI);
    await comb.waitForDeployment();
    const combAddress = await comb.getAddress();

    const MockController = await ethers.getContractFactory("MockController");
    controller = await MockController.deploy(combAddress, honeyAddress, ownerAddr);
    await controller.waitForDeployment();
    const controllerAddress = await controller.getAddress();

    await comb.setController(controllerAddress);

    await controller.setForgeBaseCost(ethers.parseUnits("2", 18));
    await controller.setMergeCost(ethers.parseUnits("15", 18));

    await honey.connect(user).approve(controllerAddress, ethers.MaxUint256);

    await controller.mintFor(userAddr);
  });

  it("mints comB with 3 Bcells and correct metadata", async function () {
    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(3);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(3).jsonPath);
  });

  it("forges 3→4 Bcells, charges 2×3 HONEY to treasury, updates metadata", async function () {
    const forgeBaseCost = await controller.forgeBaseCost();
    const expectedCost = forgeBaseCost * 3n;

    const beforeTreasury = await honey.balanceOf(ownerAddr);
    const beforeUser = await honey.balanceOf(userAddr);

    await controller.connect(user).forgeFor(userAddr, 0n);

    const afterTreasury = await honey.balanceOf(ownerAddr);
    const afterUser = await honey.balanceOf(userAddr);

    expect(afterTreasury - beforeTreasury).to.equal(expectedCost);
    expect(beforeUser - afterUser).to.equal(expectedCost);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(4);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(4).jsonPath);
  });

  it("merges two 3-Bcell comBs into a 6-Bcell comB and charges flat merge cost", async function () {
    await controller.mintFor(userAddr);

    const mergeCost = await controller.mergeCost();

    const beforeTreasury = await honey.balanceOf(ownerAddr);
    const beforeUser = await honey.balanceOf(userAddr);

    await controller.connect(user).mergeFor(userAddr, 0n, 1n);

    const afterTreasury = await honey.balanceOf(ownerAddr);
    const afterUser = await honey.balanceOf(userAddr);

    expect(afterTreasury - beforeTreasury).to.equal(mergeCost);
    expect(beforeUser - afterUser).to.equal(mergeCost);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(6);

    await expect(comb.ownerOf(1n)).to.be.reverted;

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(6).jsonPath);
  });

  it("burns Bcells down to 0 and destroys the NFT (no HONEY impact)", async function () {
    const beforeTreasury = await honey.balanceOf(ownerAddr);

    await controller.burnBcellFor(0n);
    await controller.burnBcellFor(0n);
    await controller.burnBcellFor(0n);

    const afterTreasury = await honey.balanceOf(ownerAddr);
    expect(afterTreasury - beforeTreasury).to.equal(0n);

    await expect(comb.ownerOf(0n)).to.be.reverted;
    await expect(comb.tokenURI(0n)).to.be.reverted;
  });

  it("burning one Bcell updates metadata from 3→2 Bcells", async function () {
    await controller.burnBcellFor(0n);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(2);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(2).jsonPath);
  });

  it("rejects direct forge calls on comB (must go through controller)", async function () {
    await expect(
      comb.connect(user).forge(0n)
    ).to.be.revertedWith("Not controller");
  });
});
