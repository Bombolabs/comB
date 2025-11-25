require("dotenv").config();
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

const getCombEvents = async (tx) => {
  const receipt = await tx.wait();
  const events = [];
  for (const log of receipt.logs) {
    try {
      const parsed = comb.interface.parseLog(log);
      events.push(parsed);
    } catch (e) {}
  }
  return events;
};

describe("ComBNFT metadata and ERC-4906", function () {
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

  it("maps Bcell counts 1..7 to comb_<Bcells>.json via tokenURI", async function () {
    const id = 0n;

    let b = await comb.bcellCount(id);
    expect(b).to.equal(3);
    let uri = await comb.tokenURI(id);
    expect(uri).to.equal(metaFor(3).jsonPath);

    await controller.burnBcellFor(id);
    b = await comb.bcellCount(id);
    expect(b).to.equal(2);
    uri = await comb.tokenURI(id);
    expect(uri).to.equal(metaFor(2).jsonPath);

    await controller.burnBcellFor(id);
    b = await comb.bcellCount(id);
    expect(b).to.equal(1);
    uri = await comb.tokenURI(id);
    expect(uri).to.equal(metaFor(1).jsonPath);

    await controller.burnBcellFor(id);
    await expect(comb.tokenURI(id)).to.be.reverted;

    await controller.mintFor(userAddr);
    const id2 = 1n;

    for (let target = 3; target <= 7; target++) {
      const current = await comb.bcellCount(id2);
      expect(current).to.equal(target);
      const uri2 = await comb.tokenURI(id2);
      expect(uri2).to.equal(metaFor(target).jsonPath);
      if (target < 7) {
        await controller.connect(user).forgeFor(userAddr, id2);
      }
    }
  });

  it("off-chain JSON metadata exists and follows the schema", async function () {
    for (let b = 1; b <= 7; b++) {
      const onChainPath = metaFor(b).jsonPath;
      const url = onChainPath.replace("ipfs://", "https://ipfs.io/ipfs/");
      const res = await fetch(url);
      expect(res.ok).to.equal(true);
      const json = await res.json();

      expect(json).to.have.property("name");
      expect(json).to.have.property("description");
      expect(json).to.have.property("image");
      expect(json).to.have.property("animation_url");
      expect(json).to.have.property("attributes");

      const bcellAttr = json.attributes.find(
        (a) => a.trait_type === "Bcells"
      );
      expect(bcellAttr).to.not.equal(undefined);
      expect(bcellAttr.value).to.equal(b);
    }
  });

  it("mint does not emit metadata events", async function () {
    const tx = await controller.mintFor(userAddr);
    const events = await getCombEvents(tx);
    const names = events.map((e) => e.name);

    const metaEvents = names.filter(
      (n) =>
        n === "MetadataChanged" ||
        n === "MetadataUpdate" ||
        n === "BatchMetadataUpdate"
    );
    expect(metaEvents.length).to.equal(0);
  });

  it("forge emits Forged, MetadataChanged, and MetadataUpdate", async function () {
    const tx = await controller.connect(user).forgeFor(userAddr, 0n);
    const events = await getCombEvents(tx);
    const names = events.map((e) => e.name);

    expect(names).to.include("Forged");
    expect(names).to.include("MetadataChanged");
    expect(names).to.include("MetadataUpdate");
  });

  it("merge emits Merged, MetadataChanged, and MetadataUpdate on survivor", async function () {
    await controller.mintFor(userAddr);
    const tx = await controller.connect(user).mergeFor(userAddr, 0n, 1n);
    const events = await getCombEvents(tx);
    const names = events.map((e) => e.name);

    expect(names).to.include("Merged");
    expect(names).to.include("MetadataChanged");
    expect(names).to.include("MetadataUpdate");
  });

  it("burnBcell emits Burned, MetadataChanged, MetadataUpdate and burns at 0 Bcells", async function () {
    await controller.burnBcellFor(0n);
    await controller.burnBcellFor(0n);
    const tx = await controller.burnBcellFor(0n);

    const events = await getCombEvents(tx);
    const names = events.map((e) => e.name);

    expect(names).to.include("Burned");
    expect(names).to.include("MetadataChanged");
    expect(names).to.include("MetadataUpdate");

    await expect(comb.ownerOf(0n)).to.be.reverted;
    await expect(comb.tokenURI(0n)).to.be.reverted;
  });

  it("setBaseURI emits BatchMetadataUpdate and refreshes tokenURI", async function () {
    const id = 0n;
    const uriBefore = await comb.tokenURI(id);
    expect(uriBefore).to.equal(metaFor(3).jsonPath);

    const newBase = "ipfs://newbase/";
    const tx = await comb.setBaseURI(newBase);
    const events = await getCombEvents(tx);
    const batch = events.find((e) => e.name === "BatchMetadataUpdate");
    expect(batch).to.not.equal(undefined);
    expect(batch.args[0]).to.equal(0n);
    expect(batch.args[1]).to.equal(ethers.MaxUint256);

    const uriAfter = await comb.tokenURI(id);
    expect(uriAfter).to.equal(`${newBase}comb_3.json`);
  });

  it("all public functions revert on nonexistent token IDs", async function () {
    const bad = 999n;
    await expect(comb.tokenURI(bad)).to.be.reverted;
    await expect(comb.ownerOf(bad)).to.be.reverted;
    await expect(controller.forgeFor(userAddr, bad)).to.be.reverted;
    await expect(controller.mergeFor(userAddr, bad, 0n)).to.be.reverted;
    await expect(controller.burnBcellFor(bad)).to.be.reverted;
  });
});
