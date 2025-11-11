// test/comb.test.js (CommonJS + ethers v6)
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Pin your ASSETS CID (where the mp4/jpg live)
const ASSETS_CID =
  "bafybeiejecjpek4ebgy4jnfru4zcd37ezfeiyu344nzjkjyfmqbh3fbaxy";

// Base metadata directory (points to JSONs)
const baseURI = "ipfs://baseuri/";
const forgeCost = 100;
const mergeCost = 200;

// Helper: expected URIs for a given bcells value
const metaFor = (bcells) => ({
  image: `ipfs://${ASSETS_CID}/comb_${bcells}_poster.jpg`,
  animation_url: `ipfs://${ASSETS_CID}/comb_${bcells}.mp4`,
  jsonPath: `${baseURI}comb_${bcells}.json`,
});

let comb, honey, owner, user;

describe("ComBNFT", function () {
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockHoney = await ethers.getContractFactory("MockHoney");
    honey = await MockHoney.deploy();
    await honey.waitForDeployment();
    const honeyAddress = await honey.getAddress();
    console.log("HONEY ADDRESS:", honeyAddress);

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

    const userAddr = await user.getAddress();
    const combAddr = await comb.getAddress();

    await honey.mint(userAddr, 1000);
    await honey.connect(user).approve(combAddr, 10000);

    // onlyOwner mint → called by default signer (owner)
    await comb.mint(userAddr); // tokenId 0 with 3 bcells
  });

  it("should mint with 3 Bcells", async function () {
    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(3);

    const uri = await comb.tokenURI(0);
    const expected = metaFor(3);
    expect(uri).to.equal(expected.jsonPath);

    console.log("[mint] JSON:", expected.jsonPath);
    console.log("[mint] image:", expected.image);
    console.log("[mint] animation_url:", expected.animation_url);
  });

  it("should forge and increase Bcells → metadata switches to comb_4.json", async function () {
    await comb.connect(user).forge(0); // 3 -> 4

    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(4);

    const uri = await comb.tokenURI(0);
    const expected = metaFor(4);
    expect(uri).to.equal(expected.jsonPath);

    console.log("[forge] JSON:", expected.jsonPath);
    console.log("[forge] image:", expected.image);
    console.log("[forge] animation_url:", expected.animation_url);
  });

  it("should merge two 3-Bcell comBs → one 6-Bcell (comb_6.json)", async function () {
    const userAddr = await user.getAddress();
    await comb.mint(userAddr); // tokenId 1 with 3 bcells

    await honey.mint(userAddr, 1000);
    const combAddr = await comb.getAddress();
    await honey.connect(user).approve(combAddr, 10000);

    await comb.connect(user).merge(0, 1);

    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(6);
    await expect(comb.ownerOf(1)).to.be.reverted;

    const uri = await comb.tokenURI(0);
    const expected = metaFor(6);
    expect(uri).to.equal(expected.jsonPath);

    console.log("[merge] JSON:", expected.jsonPath);
    console.log("[merge] image:", expected.image);
    console.log("[merge] animation_url:", expected.animation_url);
  });

  it("should burn Bcell thrice → auto-burn at 0 (no tokenURI anymore)", async function () {
    await comb.connect(user).burnBcell(0); // 3 -> 2
    await comb.connect(user).burnBcell(0); // 2 -> 1
    await comb.connect(user).burnBcell(0); // 1 -> 0 (burns token)

    await expect(comb.ownerOf(0)).to.be.reverted;
    await expect(comb.tokenURI(0)).to.be.reverted; // requires tokenURI to check existence first
  });

  it("should reflect correct JSON after single burn to 2 Bcells (comb_2.json)", async function () {
    await comb.connect(user).burnBcell(0); // 3 -> 2

    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(2);

    const uri = await comb.tokenURI(0);
    const expected = metaFor(2);
    expect(uri).to.equal(expected.jsonPath);

    console.log("[burn→2] JSON:", expected.jsonPath);
    console.log("[burn→2] image:", expected.image);
    console.log("[burn→2] animation_url:", expected.animation_url);
  });

  it("should allow the owner to withdraw HONEY", async function () {
    const ownerAddr = await owner.getAddress();
    const combAddr  = await comb.getAddress();

    await honey.mint(combAddr, 500);

    const before = await honey.balanceOf(ownerAddr);

    const tx = await comb.connect(owner).withdrawHONEY(ownerAddr, 500);
    const rcpt = await tx.wait();

    const parsed = rcpt.logs
      .map(log => {
        try { return comb.interface.parseLog(log); } catch { return null; }
      })
      .filter(Boolean);

    const evt = parsed.find(e => e.name === "HoneyWithdrawn");
    expect(evt, "HoneyWithdrawn event not found").to.exist;
    expect(evt.args.to).to.equal(ownerAddr);
    expect(evt.args.amount).to.equal(500n);

    const after = await honey.balanceOf(ownerAddr);
    expect(after - before).to.equal(500n);
  });

  it("should not allow non-owner to withdraw HONEY", async function () {
    const userAddr = await user.getAddress();
    const combAddr = await comb.getAddress();

    await honey.mint(combAddr, 500);

    await expect(
      comb.connect(user).withdrawHONEY(userAddr, 500)
    ).to.be.reverted;
  });
});
