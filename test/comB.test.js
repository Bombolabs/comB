
const { expect } = require("chai");

let comb, honey, user;

describe("ComBNFT", function () {
  const baseURI = "ipfs://baseuri/";
  const forgeCost = 100;
  const mergeCost = 200;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
  
    const MockHoney = await ethers.getContractFactory("MockHoney");
    honey = await MockHoney.deploy();
    console.log("HONEY ADDRESS:", honey.target);
  
    const ComBNFT = await ethers.getContractFactory("ComBNFT");
    comb = await ComBNFT.deploy(
      "comB",
      "COMB",
      baseURI,
      honey.target,
      forgeCost,
      mergeCost
    );
    await comb.waitForDeployment();
  
    await honey.mint(user.address, 1000);
    await honey.connect(user).approve(comb.target, 10000);
  
    await comb.mint(user.address);
  });
  

  it("should mint with 3 Bcells", async function () {
    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(3);
  });


  it("should forge and increase Bcells", async function () {
    await comb.connect(user).forge(0);
    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(4);
  });

  it("should merge two 3-Bcell comBs into one 6-Bcell", async function () {
    await comb.mint(user.address); 
    await comb.connect(user).merge(0, 1);
    const bcell = await comb.bcellCount(0);
    expect(bcell).to.equal(6);
    await expect(comb.ownerOf(1)).to.be.reverted;
  });

  it("should burn Bcell and auto-burn when zero", async function () {
    await comb.connect(user).burnBcell(0);
    await comb.connect(user).burnBcell(0);
    await comb.connect(user).burnBcell(0);
    await expect(comb.ownerOf(0)).to.be.reverted;
  });

  it("should return correct tokenURI for 4 Bcells", async function () {
    // Start with 3 Bcells (default)
    await comb.connect(user).forge(0); // +1 → now 4 Bcells
  
    const uri = await comb.tokenURI(0);
    expect(uri).to.equal("ipfs://baseuri/comb_4.json");
  });

  it("should return correct tokenURI for 6 Bcells after merge", async function () {
    await comb.mint(user.address); // mint tokenId 1
  
    // Ensure user has enough HONEY to pay for merge
    await honey.mint(user.address, 1000);
    await honey.connect(user).approve(comb.target, 10000);
  
    await comb.connect(user).merge(0, 1); // tokenId 0 becomes 6 Bcells
  
    const uri = await comb.tokenURI(0);
    expect(uri).to.equal("ipfs://baseuri/comb_6.json");
  });
  
  it("should return correct tokenURI after burning down to 2 Bcells", async function () {
    // Mint starts at 3 Bcells
    await comb.connect(user).burnBcell(0); // now 2 Bcells
  
    const uri = await comb.tokenURI(0);
    expect(uri).to.equal("ipfs://baseuri/comb_2.json");
  });
  
  
});
