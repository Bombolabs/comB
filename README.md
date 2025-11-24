# comB NFT Protocol

A modular, controller-driven, mutable NFT standard built for the B Side ecosystem on Berachain.

comB NFTs represent honeycomb fragments containing 1–7 Bcells, and evolve on-chain through forging, merging, and burning. The protocol enables an upgradable, deflationary, multiplier-based NFT system without redeploying the core NFT.

This repository includes the immutable comB NFT contract, its configurable Controller, deployment scripts, and a full testing suite.

## Overview

### Why comB?

The comB NFT functions as an upgradeable multiplier for staking, rewards, and ecosystem mechanics.

Its state evolves through strictly validated transitions:

- Forge increases Bcells
- Merge combines two 3-Bcell comBs into one 6-Bcell comB
- Burn Bcell reduces Bcells; NFT is destroyed at 0
- No economic rules inside comB
- Upgradeable controller manages all cost, treasury, and future Proof-of-Liquidity rules

### Architectural Guarantees

- The NFT logic is secure and unchanging
- Economic rules can evolve without redeploying comB
- Marketplaces automatically re-index metadata changes via ERC-4906
- Future features such as Vase Finance LP logic or Booga PoL multipliers can be added through the controller

## Architecture

<architecture diagram omitted for plaintext>

## Economic Rules

### Forge

cost = baseCost × currentBcellCount

### Merge

- Two 3-Bcell comBs → one 6-Bcell comB
- One NFT burned
- Flat 15 HONEY cost

### Burn Bcell

- Free
- If Bcells reach 0 → NFT burned permanently

## Metadata Standard

tokenURI(id) = baseURI + "comb\_<Bcells>.json"

Example provided in previous conversation.

## Repository Structure

contracts/
scripts/
test/
README.md

## Development

npm install  
npx hardhat test  
npx hardhat console

## Deployment (Bepolia Testnet)

Env variables and deployment script included.

## License

MIT
