// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ComBNFT.sol";

contract MockController {
    ComBNFT public comb;

    constructor(address combAddress) {
        comb = ComBNFT(combAddress);
    }

    function mintFor(address to) external {
        comb.mint(to);
    }

    function forgeFor(address payer, uint256 tokenId) external {
        comb.forge(payer, tokenId);
    }

    function mergeFor(
        address payer,
        uint256 tokenId1,
        uint256 tokenId2
    ) external {
        comb.merge(payer, tokenId1, tokenId2);
    }

    function burnBcellFor(uint256 tokenId) external {
        comb.burnBcell(tokenId);
    }
}
