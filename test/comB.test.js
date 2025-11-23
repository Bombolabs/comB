const { expect } = require("chai");
const { ethers } = require("hardhat");

const ASSETS_CID =
  "bafybeiejecjpek4ebgy4jnfru4zcd37ezfeiyu344nzjkjyfmqbh3fbaxy";

const baseURI = "ipfs://baseuri/";
const forgeCost = 100;
const mergeCost = 200;

const metaFor = (bcells) => ({
  image: `ipfs://${ASSETS_CID}/comb_${bcells}_poster.jpg`,
  animation_url: `ipfs://${ASSETS_CID}/comb_${bcells}.mp4`,
  jsonPath: `${baseURI}comb_${bcells}.json`,
});

let comb, honey, controller, owner, user;

describe("ComBNFT (Controller-Gated)", function () {
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockHoney = await ethers.getContractFactory("MockHoney");
    honey = await MockHoney.deploy();
    await honey.waitForDeployment();

    const honeyAddress = await honey.getAddress();

    const ComBNFT = await ethers.getContractFactory("ComBNFT");
    comb = await ComBNFT.deploy(
      "comB",
      "COMB",
      baseURI,
      honeyAddress,
      forgeCost,
      mergeCost
    );
    await comb.waitForDeployment();

    // Deploy mock controller
    const MockController = await ethers.getContractFactory("MockController");
    controller = await MockController.deploy(await comb.getAddress());
    await controller.waitForDeployment();

    // Set controller in comB
    await comb.connect(owner).setController(await controller.getAddress());

    // Mint HONEY to user
    await honey.mint(await user.getAddress(), 5000);

    // Approve comB for HONEY pull
    await honey.connect(user).approve(await comb.getAddress(), 100000);

    // Mint initial comB for the user via controller
    await controller.mintFor(await user.getAddress()); // tokenId 0
  });

  // ---------------------------------------------------------------
  it("should mint with 3 Bcells", async function () {
    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(3);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(3).jsonPath);

    console.log("[mint] URI:", uri);
  });

  // ---------------------------------------------------------------
  it("should forge → Bcells 3→4 and switch metadata", async function () {
    await controller.forgeFor(await user.getAddress(), 0n);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(4);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(4).jsonPath);
  });

  // ---------------------------------------------------------------
  it("should reject forge if NOT called by controller", async function () {
    await expect(
      comb.connect(user).forge(await user.getAddress(), 0n)
    ).to.be.revertedWith("Not controller");
  });

  // ---------------------------------------------------------------
  it("should merge two 3-Bcell comBs → one 6-Bcell survivor", async function () {
    const userAddr = await user.getAddress();

    await controller.mintFor(userAddr); // tokenId 1

    await honey.connect(user).approve(await comb.getAddress(), 100000);

    await controller.mergeFor(userAddr, 0n, 1n);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(6);

    await expect(comb.ownerOf(1n)).to.be.reverted;

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(6).jsonPath);
  });

  // ---------------------------------------------------------------
  it("should burn Bcells down to 0 and auto-burn NFT", async function () {
    await controller.burnBcellFor(0n); // 3→2
    await controller.burnBcellFor(0n); // 2→1
    await controller.burnBcellFor(0n); // 1→0 → token destroyed

    await expect(comb.ownerOf(0n)).to.be.reverted;
    await expect(comb.tokenURI(0n)).to.be.reverted;
  });

  // ---------------------------------------------------------------
  it("should reduce from 3→2 Bcells and update metadata", async function () {
    await controller.burnBcellFor(0n); // 3→2

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(2);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(2).jsonPath);
  });

  // ---------------------------------------------------------------
  it("should allow owner to withdraw HONEY", async function () {
    const ownerAddr = await owner.getAddress();

    await honey.mint(await comb.getAddress(), 500);

    const before = await honey.balanceOf(ownerAddr);

    await comb.connect(owner).withdrawHONEY(ownerAddr, 500);

    const after = await honey.balanceOf(ownerAddr);
    expect(after - before).to.equal(500n);
  });

  // ---------------------------------------------------------------
  it("should block non-owner from withdrawing HONEY", async function () {
    await honey.mint(await comb.getAddress(), 500);

    await expect(
      comb.connect(user).withdrawHONEY(await user.getAddress(), 500)
    ).to.be.reverted;
  });
});
