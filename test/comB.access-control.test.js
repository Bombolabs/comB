const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployFixture } = require("./shared/comB.fixture");

let comb;
let controller;
let owner;
let user;
let ownerAddr;
let userAddr;

describe("ComBNFT access control", function () {
  beforeEach(async function () {
    const fx = await deployFixture();
    comb = fx.comb;
    controller = fx.controller;
    owner = fx.owner;
    user = fx.user;
    ownerAddr = fx.ownerAddr;
    userAddr = fx.userAddr;
  });

  it("rejects direct mint/forge/merge/burn calls on comB for non-controller", async function () {
    await expect(
      comb.connect(user).mint(userAddr)
    ).to.be.revertedWith("Not controller");

    await expect(
      comb.connect(user).forge(0n)
    ).to.be.revertedWith("Not controller");

    await expect(
      comb.connect(user).merge(0n, 0n)
    ).to.be.revertedWith("Not controller");

    await expect(
      comb.connect(user).burnBcell(0n)
    ).to.be.revertedWith("Not controller");
  });

  it("setController and setBaseURI revert for non-owner", async function () {
    await expect(
      comb.connect(user).setController(userAddr)
    ).to.be.reverted;

    await expect(
      comb.connect(user).setBaseURI("ipfs://other/")
    ).to.be.reverted;
  });

  it("lockController prevents further controller changes", async function () {
    const oldController = await comb.controller();
    const newControllerAddr = ethers.Wallet.createRandom().address;

    await comb.lockController();

    await expect(
      comb.setController(newControllerAddr)
    ).to.be.revertedWith("Controller locked");

    const controllerAfter = await comb.controller();
    expect(controllerAfter).to.equal(oldController);
  });

  it("locked controller can still operate normally", async function () {
    await comb.lockController();

    await controller.mintFor(userAddr);
    const total = await comb.totalSupply();
    expect(total).to.equal(2n);

    await controller.burnBcellFor(0n);
    const bcell = await comb.bcellCount(0n);
    expect(bcell).to.equal(2);
  });
});
