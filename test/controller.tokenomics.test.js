const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployFixture } = require("./shared/comB.fixture");

let comb;
let honey;
let controller;
let owner;
let user;
let ownerAddr;
let userAddr;
let treasuryAddr;
let controllerAddr;

describe("MockController tokenomics", function () {
  beforeEach(async function () {
    const fx = await deployFixture();
    comb = fx.comb;
    honey = fx.honey;
    controller = fx.controller;
    owner = fx.owner;
    user = fx.user;
    ownerAddr = fx.ownerAddr;
    userAddr = fx.userAddr;
    treasuryAddr = fx.treasuryAddr;
    controllerAddr = await controller.getAddress();
  });

  it("charges forgeBaseCost * Bcells and responds to base cost changes", async function () {
    const tokenId = 0n;

    const forgeBaseCost1 = await controller.forgeBaseCost();
    const bcellsBefore1 = await comb.bcellCount(tokenId);
    const userBefore1 = await honey.balanceOf(userAddr);
    const treasuryBefore1 = await honey.balanceOf(treasuryAddr);

    await controller.connect(user).forgeFor(userAddr, tokenId);

    const userAfter1 = await honey.balanceOf(userAddr);
    const treasuryAfter1 = await honey.balanceOf(treasuryAddr);
    const expected1 = forgeBaseCost1 * bcellsBefore1;

    expect(treasuryAfter1 - treasuryBefore1).to.equal(expected1);
    expect(userBefore1 - userAfter1).to.equal(expected1);

    const newBaseCost = ethers.parseUnits("3", 18);
    await controller.setForgeBaseCost(newBaseCost);

    const bcellsBefore2 = await comb.bcellCount(tokenId);
    const userBefore2 = await honey.balanceOf(userAddr);
    const treasuryBefore2 = await honey.balanceOf(treasuryAddr);

    await controller.connect(user).forgeFor(userAddr, tokenId);

    const userAfter2 = await honey.balanceOf(userAddr);
    const treasuryAfter2 = await honey.balanceOf(treasuryAddr);
    const expected2 = newBaseCost * bcellsBefore2;

    expect(treasuryAfter2 - treasuryBefore2).to.equal(expected2);
    expect(userBefore2 - userAfter2).to.equal(expected2);
  });

  it("charges exactly mergeCost HONEY on merge", async function () {
    await controller.mintFor(userAddr);

    const mergeCost = await controller.mergeCost();

    const userBefore = await honey.balanceOf(userAddr);
    const treasuryBefore = await honey.balanceOf(treasuryAddr);

    await controller.connect(user).mergeFor(userAddr, 0n, 1n);

    const userAfter = await honey.balanceOf(userAddr);
    const treasuryAfter = await honey.balanceOf(treasuryAddr);

    expect(treasuryAfter - treasuryBefore).to.equal(mergeCost);
    expect(userBefore - userAfter).to.equal(mergeCost);
  });

  it("reverts merge when HONEY cannot be transferred", async function () {
    await controller.mintFor(userAddr);
    await honey.connect(user).approve(controllerAddr, 0n);

    await expect(
      controller.connect(user).mergeFor(userAddr, 0n, 1n)
    ).to.be.reverted;
  });

  it("sends HONEY only to treasury and never to controller", async function () {
    const tokenId = 0n;

    const forgeBaseCost = await controller.forgeBaseCost();
    const bcellsBefore = await comb.bcellCount(tokenId);

    const userBefore = await honey.balanceOf(userAddr);
    const treasuryBefore = await honey.balanceOf(treasuryAddr);
    const controllerBefore = await honey.balanceOf(controllerAddr);

    await controller.connect(user).forgeFor(userAddr, tokenId);

    const userAfter = await honey.balanceOf(userAddr);
    const treasuryAfter = await honey.balanceOf(treasuryAddr);
    const controllerAfter = await honey.balanceOf(controllerAddr);

    const expected = forgeBaseCost * bcellsBefore;

    expect(treasuryAfter - treasuryBefore).to.equal(expected);
    expect(userBefore - userAfter).to.equal(expected);
    expect(controllerAfter - controllerBefore).to.equal(0n);
  });

  it("respects updated treasury address for subsequent flows", async function () {
    const tokenId = 0n;

    const [, , newTreasury] = await ethers.getSigners();
    const newTreasuryAddr = await newTreasury.getAddress();
    await controller.setTreasury(newTreasuryAddr);

    const forgeBaseCost = await controller.forgeBaseCost();
    const bcellsBefore = await comb.bcellCount(tokenId);

    const userBefore = await honey.balanceOf(userAddr);
    const oldTreasuryBefore = await honey.balanceOf(treasuryAddr);
    const newTreasuryBefore = await honey.balanceOf(newTreasuryAddr);

    await controller.connect(user).forgeFor(userAddr, tokenId);

    const userAfter = await honey.balanceOf(userAddr);
    const oldTreasuryAfter = await honey.balanceOf(treasuryAddr);
    const newTreasuryAfter = await honey.balanceOf(newTreasuryAddr);

    const expected = forgeBaseCost * bcellsBefore;

    expect(newTreasuryAfter - newTreasuryBefore).to.equal(expected);
    expect(userBefore - userAfter).to.equal(expected);
    expect(oldTreasuryAfter - oldTreasuryBefore).to.equal(0n);
  });
});
