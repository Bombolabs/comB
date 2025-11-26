const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("ComBNFT Airdrop", function () {
  it("airdrops the correct number of comB NFTs with proper bcellCount", async function () {
    const [owner, alice, bob] = await ethers.getSigners()

    const ComBNFT = await ethers.getContractFactory("ComBNFT")
    const comb = await ComBNFT.connect(owner).deploy("comB", "COMB", "ipfs://test-base/")
    await comb.waitForDeployment()

    const combAddress = await comb.getAddress()

    const ComBAirdropController = await ethers.getContractFactory("ComBAirdropController")
    const controller = await ComBAirdropController.connect(owner).deploy(combAddress)
    await controller.waitForDeployment()

    const controllerAddress = await controller.getAddress()

    await comb.connect(owner).setController(controllerAddress)

    await controller.connect(owner).airdrop(alice.address, 2)
    await controller.connect(owner).airdrop(bob.address, 1)

    const aliceBalance = await comb.balanceOf(alice.address)
    const bobBalance = await comb.balanceOf(bob.address)
    const nextTokenId = await comb.nextTokenId()

    expect(aliceBalance).to.equal(2n)
    expect(bobBalance).to.equal(1n)
    expect(nextTokenId).to.equal(3n)

    const b0 = await comb.bcellCount(0)
    const b1 = await comb.bcellCount(1)
    const b2 = await comb.bcellCount(2)

    expect(b0).to.equal(3)
    expect(b1).to.equal(3)
    expect(b2).to.equal(3)
  })

  it("only owner can call airdrop", async function () {
    const [owner, alice, attacker] = await ethers.getSigners()

    const ComBNFT = await ethers.getContractFactory("ComBNFT")
    const comb = await ComBNFT.connect(owner).deploy("comB", "COMB", "ipfs://test-base/")
    await comb.waitForDeployment()

    const combAddress = await comb.getAddress()

    const ComBAirdropController = await ethers.getContractFactory("ComBAirdropController")
    const controller = await ComBAirdropController.connect(owner).deploy(combAddress)
    await controller.waitForDeployment()

    const controllerAddress = await controller.getAddress()
    await comb.connect(owner).setController(controllerAddress)

    await expect(
      controller.connect(attacker).airdrop(alice.address, 1)
    ).to.be.reverted
  })
})
