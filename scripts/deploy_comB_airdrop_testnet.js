const { ethers, network } = require("hardhat")
require("dotenv").config()

async function main() {
  const [deployer] = await ethers.getSigners()
  const deployerAddress = await deployer.getAddress()
  const net = await ethers.provider.getNetwork()

  console.log(`\nDeployer: ${deployerAddress}`)
  console.log(`Network:  ${network.name} (chainId ${net.chainId})\n`)

  const BASE_URI = (process.env.BASE_URI || "ipfs://baseuri/").trim()
  if (!BASE_URI.endsWith("/")) {
    throw new Error("BASE_URI must end with a trailing slash `/`")
  }

  const rawAirdrop = (process.env.AIRDROP_ADDRESSES || "").trim()
  const AIRDROP_ADDRESSES = rawAirdrop
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (AIRDROP_ADDRESSES.length === 0) {
    throw new Error("AIRDROP_ADDRESSES must contain at least one address")
  }

  console.log("Airdrop recipients from env:")
  AIRDROP_ADDRESSES.forEach((addr, i) => console.log(`  [${i}] ${addr}`))
  console.log("")

  const ComBNFT = await ethers.getContractFactory("ComBNFT")
  const comb = await ComBNFT.deploy("comB", "COMB", BASE_URI)
  await comb.waitForDeployment()
  const combAddress = await comb.getAddress()
  console.log(`ComBNFT deployed at: ${combAddress}`)

  const ComBAirdropController = await ethers.getContractFactory("ComBAirdropController")
  const controller = await ComBAirdropController.deploy(combAddress)
  await controller.waitForDeployment()
  const controllerAddress = await controller.getAddress()
  console.log(`ComBAirdropController deployed at: ${controllerAddress}`)

  const tx = await comb.setController(controllerAddress)
  await tx.wait()
  console.log(`Controller set on ComBNFT\n`)

  console.log("Starting airdrop: 1 comB per address\n")

  let totalMints = 0

  for (const addr of AIRDROP_ADDRESSES) {
    if (!ethers.isAddress(addr)) {
      console.log(`Skipping invalid address: ${addr}`)
      continue
    }
    console.log(`Airdropping 1 comB to ${addr}...`)
    const atx = await controller.airdrop(addr, 1)
    const receipt = await atx.wait()
    console.log(`  Done in tx: ${receipt.hash}`)
    totalMints++
  }

  console.log(`\nDeployment + airdrop complete.`)
  console.log(`ComBNFT:              ${combAddress}`)
  console.log(`Airdrop controller:   ${controllerAddress}`)
  console.log(`Total comB minted:    ${totalMints}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
