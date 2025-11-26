// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IComBNFT {
    function mint(address to) external;
}

contract ComBAirdropController is Ownable {
    IComBNFT public immutable comb;

    constructor(address comb_) Ownable(msg.sender) {
        require(comb_ != address(0), "Invalid comB address");
        comb = IComBNFT(comb_);
    }

    function airdrop(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        for (uint256 i = 0; i < amount; i++) {
            comb.mint(to);
        }
    }

    function airdropBatch(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        uint256 length = recipients.length;
        require(length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < length; i++) {
            address to = recipients[i];
            uint256 amount = amounts[i];
            require(to != address(0), "Invalid recipient");
            require(amount > 0, "Amount must be > 0");

            for (uint256 j = 0; j < amount; j++) {
                comb.mint(to);
            }
        }
    }
}
