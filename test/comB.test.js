
const { expect } = require("chai");

describe("ComBNFT", function () {
  let ComBNFT, comb, owner, user;
  const baseURI = "ipfs://baseuri/";
  const forgeCost = 100;
  const mergeCost = 200;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockHoney = await ethers.getContractFactory("MockHoney");
    const honey = await MockHoney.deploy();
    await honey.mint(user.address, 10000);

    ComBNFT = await ethers.getContractFactory("ComBNFT");
    comb = await ComBNFT.deploy("comB", "COMB", baseURI, honey.address, forgeCost, mergeCost);
    await comb.deployed();

    await comb.mint(user.address);
    await honey.connect(user).approve(comb.address, 10000);
  });

  it("should mint with 3 Bcells", async function () {
    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(3);
  });

  it("should forge and increase Bcells", async function () {
    await comb.connect(user).forge(0);
    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(4);
  });

  it("should merge two 3-Bcell comBs into one 6-Bcell", async function () {
    await comb.mint(user.address);
    await comb.connect(user).merge(0, 1);
    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(6);
    await expect(comb.ownerOf(1)).to.be.reverted;
  });

  it("should burn Bcell and auto-burn when zero", async function () {
    await comb.connect(user).burnBcell(0); // 2
    await comb.connect(user).burnBcell(0); // 1
    await comb.connect(user).burnBcell(0); // 0 -> burn
    await expect(comb.ownerOf(0)).to.be.reverted;
  });
});
