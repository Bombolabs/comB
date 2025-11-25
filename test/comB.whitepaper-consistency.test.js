const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployFixture, metaFor } = require("./shared/comB.fixture");

let comb;
let honey;
let controller;
let owner;
let user;
let ownerAddr;
let userAddr;
let treasuryAddr;

describe("ComBNFT whitepaper consistency", function () {
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
  });

  it("single comB can go 3→7 via pure forge with correct final metadata and cost shape", async function () {
    const tokenId = 0n;
    const forgeBaseCost = await controller.forgeBaseCost();

    const startBalance = await honey.balanceOf(userAddr);

    let bcells = await comb.bcellCount(tokenId);
    expect(bcells).to.equal(3n);

    while (bcells < 7n) {
      await controller.connect(user).forgeFor(userAddr, tokenId);
      bcells = await comb.bcellCount(tokenId);
    }

    const endBalance = await honey.balanceOf(userAddr);
    const spent = startBalance - endBalance;

    const expected = forgeBaseCost * (3n + 4n + 5n + 6n);

    expect(bcells).to.equal(7n);

    const uri = await comb.tokenURI(tokenId);
    expect(uri).to.equal(metaFor(7).jsonPath);

    expect(spent).to.equal(expected);
  });

  it("two comBs 3+3→merge to 6, then forge to 7, is cheaper than pure forge path", async function () {
    await controller.mintFor(userAddr);

    const forgeBaseCost = await controller.forgeBaseCost();
    const mergeCost = await controller.mergeCost();

    const startBalance = await honey.balanceOf(userAddr);

    await controller.connect(user).mergeFor(userAddr, 0n, 1n);

    let bcells = await comb.bcellCount(0n);
    expect(bcells).to.equal(6n);

    await controller.connect(user).forgeFor(userAddr, 0n);
    bcells = await comb.bcellCount(0n);

    const endBalance = await honey.balanceOf(userAddr);
    const spent = startBalance - endBalance;

    const expected = mergeCost + forgeBaseCost * 6n;
    const directForgeCost = forgeBaseCost * (3n + 4n + 5n + 6n);

    expect(bcells).to.equal(7n);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(7).jsonPath);

    expect(spent).to.equal(expected);
    expect(spent).to.be.lessThan(directForgeCost);
  });
});
