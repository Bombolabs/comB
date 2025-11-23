// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IHoneyToken {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}

contract ComBNFT is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;
    string public baseURI;
    uint8 public constant MAX_BCELLS = 7;

    mapping(uint256 => uint8) public bcellCount;

    IHoneyToken public honeyToken;
    uint256 public forgeCost;
    uint256 public mergeCost;

    address public controller;
    bool public controllerLocked;

    event Forged(uint256 indexed tokenId, uint8 newBcellCount);
    event Merged(uint256 indexed survivor, uint256 burned);
    event Burned(uint256 indexed tokenId, uint8 remainingBcells);
    event HoneyWithdrawn(address to, uint256 amount);
    event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId);
    event MetadataChanged(uint256 indexed tokenId);
    event MetadataUpdate(uint256 indexed tokenId);
    event ControllerUpdated(address indexed newController);
    event ControllerLocked();

    modifier onlyController() {
        require(msg.sender == controller, "Not controller");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address honeyTokenAddress_,
        uint256 forgeCost_,
        uint256 mergeCost_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        baseURI = baseURI_;
        honeyToken = IHoneyToken(honeyTokenAddress_);
        forgeCost = forgeCost_;
        mergeCost = mergeCost_;
        controller = address(0);
        controllerLocked = false;
    }

    function setController(address controller_) external onlyOwner {
        require(!controllerLocked, "Controller locked");
        controller = controller_;
        emit ControllerUpdated(controller_);
    }

    function lockController() external onlyOwner {
        controllerLocked = true;
        emit ControllerLocked();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function mint(address to) external onlyController {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        bcellCount[tokenId] = 3;
    }

    function forge(address payer, uint256 tokenId) external onlyController {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        require(
            bcellCount[tokenId] >= 1 && bcellCount[tokenId] < MAX_BCELLS,
            "Cannot forge"
        );
        require(
            honeyToken.transferFrom(payer, address(this), forgeCost),
            "HONEY transfer failed"
        );

        bcellCount[tokenId]++;
        emit Forged(tokenId, bcellCount[tokenId]);
        emit MetadataChanged(tokenId);
        emit MetadataUpdate(tokenId);
    }

    function merge(
        address payer,
        uint256 tokenId1,
        uint256 tokenId2
    ) external onlyController {
        require(_ownerOf(tokenId1) != address(0), "Token1 nonexistent");
        require(_ownerOf(tokenId2) != address(0), "Token2 nonexistent");
        require(
            bcellCount[tokenId1] == 3 && bcellCount[tokenId2] == 3,
            "Must be 3-bcell comBs"
        );
        require(
            honeyToken.transferFrom(payer, address(this), mergeCost),
            "HONEY transfer failed"
        );

        bcellCount[tokenId1] = 6;
        _burn(tokenId2);
        delete bcellCount[tokenId2];

        emit Merged(tokenId1, tokenId2);
        emit MetadataChanged(tokenId1);
        emit MetadataUpdate(tokenId1);
    }

    function burnBcell(uint256 tokenId) external onlyController {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        require(bcellCount[tokenId] >= 1, "No Bcells left");

        bcellCount[tokenId]--;
        emit Burned(tokenId, bcellCount[tokenId]);
        emit MetadataChanged(tokenId);
        emit MetadataUpdate(tokenId);

        if (bcellCount[tokenId] == 0) {
            _burn(tokenId);
            delete bcellCount[tokenId];
        }
    }

    function setBaseURI(string memory uri) external onlyOwner {
        baseURI = uri;
        emit BatchMetadataUpdate(0, type(uint256).max);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: invalid token ID");

        uint8 count = bcellCount[tokenId];
        return
            string(
                abi.encodePacked(
                    baseURI,
                    "comb_",
                    Strings.toString(count),
                    ".json"
                )
            );
    }

    function withdrawHONEY(address to, uint256 amount) external onlyOwner {
        require(honeyToken.transfer(to, amount), "Withdraw failed");
        emit HoneyWithdrawn(to, amount);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 amount
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, amount);
    }
}
