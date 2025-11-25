const { expect } = require("chai");
const { deployFixture, metaFor } = require("./shared/comB.fixture");

let comb;
let honey;
let controller;
let owner;
let user;
let ownerAddr;
let userAddr;

describe("ComBNFT behaviour", function () {
  beforeEach(async function () {
    const fx = await deployFixture();
    comb = fx.comb;
    honey = fx.honey;
    controller = fx.controller;
    owner = fx.owner;
    user = fx.user;
    ownerAddr = fx.ownerAddr;
    userAddr = fx.userAddr;
  });

  it("mints comB with 3 Bcells and consistent supply/ownership", async function () {
    const total = await comb.totalSupply();
    expect(total).to.equal(1n);

    const balance = await comb.balanceOf(userAddr);
    expect(balance).to.equal(1n);

    const tokenId = await comb.tokenOfOwnerByIndex(userAddr, 0n);
    expect(tokenId).to.equal(0n);

    const ownerOf0 = await comb.ownerOf(0n);
    expect(ownerOf0).to.equal(userAddr);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(3);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(3).jsonPath);
  });

  it("forges 3→4 Bcells and updates metadata", async function () {
    await controller.connect(user).forgeFor(userAddr, 0n);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(4);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(4).jsonPath);
  });

  it("forges 3→4→5→6→7 and reverts at 7", async function () {
    for (let target = 4; target <= 7; target++) {
      await controller.connect(user).forgeFor(userAddr, 0n);
      const after = await comb.bcellCount(0n);
      expect(after).to.equal(target);

      const uri = await comb.tokenURI(0n);
      expect(uri).to.equal(metaFor(target).jsonPath);
    }

    const finalCount = await comb.bcellCount(0n);
    expect(finalCount).to.equal(7);

    await expect(
      controller.connect(user).forgeFor(userAddr, 0n)
    ).to.be.revertedWith("Cannot forge");
  });

  it("merges two 3-Bcell comBs into a 6-Bcell comB and burns the second", async function () {
    await controller.mintFor(userAddr);

    const totalBefore = await comb.totalSupply();
    expect(totalBefore).to.equal(2n);

    await controller.connect(user).mergeFor(userAddr, 0n, 1n);

    const totalAfter = await comb.totalSupply();
    expect(totalAfter).to.equal(1n);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(6);

    await expect(comb.ownerOf(1n)).to.be.reverted;
    await expect(comb.tokenURI(1n)).to.be.reverted;

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(6).jsonPath);
  });

  it("rejects merge for non-3+3 combinations", async function () {
    await controller.mintFor(userAddr);
    await controller.mintFor(userAddr);
    await controller.mintFor(userAddr);

    await controller.burnBcellFor(1n);
    await controller.connect(user).forgeFor(userAddr, 2n);
    await controller.connect(user).mergeFor(userAddr, 0n, 3n);

    await expect(comb.ownerOf(3n)).to.be.reverted;

    await expect(
      controller.connect(user).mergeFor(userAddr, 0n, 1n)
    ).to.be.reverted;

    await expect(
      controller.connect(user).mergeFor(userAddr, 0n, 2n)
    ).to.be.reverted;

    await expect(
      controller.connect(user).mergeFor(userAddr, 1n, 2n)
    ).to.be.reverted;
  });

  it("burns Bcells down to 0 and destroys the NFT", async function () {
    const totalBefore = await comb.totalSupply();
    expect(totalBefore).to.equal(1n);

    await controller.burnBcellFor(0n);
    await controller.burnBcellFor(0n);
    await controller.burnBcellFor(0n);

    await expect(comb.ownerOf(0n)).to.be.reverted;
    await expect(comb.tokenURI(0n)).to.be.reverted;

    const totalAfter = await comb.totalSupply();
    expect(totalAfter).to.equal(0n);
  });

  it("burning one Bcell updates metadata and keeps supply until 0", async function () {
    const totalBefore = await comb.totalSupply();
    expect(totalBefore).to.equal(1n);

    await controller.burnBcellFor(0n);

    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(2);

    const uri = await comb.tokenURI(0n);
    expect(uri).to.equal(metaFor(2).jsonPath);

    const totalAfter = await comb.totalSupply();
    expect(totalAfter).to.equal(1n);
  });

  it("burnBcell reverts on non-existent tokens and on already burned tokens", async function () {
    await expect(controller.burnBcellFor(999n)).to.be.reverted;

    await controller.burnBcellFor(0n);
    await controller.burnBcellFor(0n);
    await controller.burnBcellFor(0n);

    await expect(controller.burnBcellFor(0n)).to.be.reverted;
  });

  it("transfers do not change bcellCount", async function () {
    const id = 0n;
    const start = await comb.bcellCount(id);

    await comb.connect(user).transferFrom(userAddr, ownerAddr, id);

    const after = await comb.bcellCount(id);
    expect(after).to.equal(start);
  });

  it("approvals do not change bcellCount", async function () {
    const id = 0n;
    const start = await comb.bcellCount(id);

    await comb.connect(user).approve(ownerAddr, id);
    await comb.connect(user).setApprovalForAll(ownerAddr, true);

    const after = await comb.bcellCount(id);
    expect(after).to.equal(start);
  });
});
