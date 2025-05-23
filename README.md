# comB NFT

A mutable NFT contract deployed on Berachain for the B Side staking system.

## Features

- Mutable `bcellCount` attribute
- $HONEY-based forge and merge mechanics
- Burn Bcells to unstake or convert rewards
- On-chain dynamic `tokenURI` based on Bcell count
- Emits key events for indexing, frontend syncing, and marketplace reindexing

## Setup

```bash
npm install
npx hardhat test
```

## Deploy

Edit deploy scripts or deploy manually using Kingdomly or Hardhat.

## Events Reference

This contract emits the following events to help off-chain systems like frontends, dashboards, and marketplaces stay in sync with comB state changes:

---

### `event Forged(uint256 indexed tokenId, uint8 newBcellCount)`

Emitted when a user successfully forges a comB, increasing its Bcell count.

---

### `event Merged(uint256 indexed survivor, uint256 indexed burned)`

Emitted when a user merges two 3-Bcell comBs. One is upgraded, one is burned.

---

### `event Burned(uint256 indexed tokenId, uint8 remainingBcells)`

Emitted when a Bcell is burned. If the Bcell count hits 0, the NFT is destroyed.

---

### `event HoneyWithdrawn(address to, uint256 amount)`

Emitted when the contract owner withdraws HONEY tokens from the contract.

---

### `event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId)`

Emitted when `baseURI` changes — helps OpenSea and others re-index metadata.
Typically called as:

```solidity
emit BatchMetadataUpdate(0, type(uint256).max);
```

This ensures all tokens refresh their metadata without needing to call individually.
