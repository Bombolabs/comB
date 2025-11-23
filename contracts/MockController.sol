// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ComBNFT.sol";

interface IHoneyToken {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract MockController {
    ComBNFT public comb;
    IHoneyToken public honey;
    address public treasury;

    uint256 public mergeCost;
    uint256 public forgeBaseCost;

    constructor(address comb_, address honey_, address treasury_) {
        comb = ComBNFT(comb_);
        honey = IHoneyToken(honey_);
        treasury = treasury_;
        mergeCost = 15 ether;
        forgeBaseCost = 2 ether;
    }

    function setMergeCost(uint256 newCost) external {
        mergeCost = newCost;
    }

    function setForgeBaseCost(uint256 newCost) external {
        forgeBaseCost = newCost;
    }

    function setTreasury(address newTreasury) external {
        treasury = newTreasury;
    }

    function mintFor(address to) external {
        comb.mint(to);
    }

    function forgeFor(address payer, uint256 tokenId) external {
        uint8 bcells = comb.bcellCount(tokenId);
        require(bcells >= 1 && bcells < comb.MAX_BCELLS(), "Cannot forge");

        uint256 cost = forgeBaseCost * bcells;

        require(
            honey.transferFrom(payer, treasury, cost),
            "HONEY transfer failed"
        );

        comb.forge(tokenId);
    }

    function mergeFor(
        address payer,
        uint256 tokenId1,
        uint256 tokenId2
    ) external {
        require(
            honey.transferFrom(payer, treasury, mergeCost),
            "HONEY transfer failed"
        );

        comb.merge(tokenId1, tokenId2);
    }

    function burnBcellFor(uint256 tokenId) external {
        comb.burnBcell(tokenId);
    }
}
