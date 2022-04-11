const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = num => ethers.utils.parseEther(num.toString())
const fromWei = num => ethers.utils.formatEther(num)

describe("MusicNFTMarketplace", ()=>{

   let nftMarketplace, deployer, artist, user1, user2, users
   let royaltyFee = toWei(0.01)
   let URI = "https://bafybeidhjjbjonyqcahuzlpt7sznmh4xrlbspa3gstop5o47l6gsiaffee.ipfs.nftstorage.link/"
   let prices = [
      toWei(1),
      toWei(2),
      toWei(3),
      toWei(4),
      toWei(5),
      toWei(6),
      toWei(7),
      toWei(8),
   ]
   let deploymentFees = toWei(prices.length * 0.01)
   beforeEach(async ()=>{
      const NFTMarketplaceFactory = await ethers.getContractFactory("MusicNFTMarketplace");
      /* jshint ignore:start */
      [deployer, artist, user1, user2, ...users] = await ethers.getSigners();
      /* jshint ignore:end */

      // deployer = deployer

      nftMarketplace = await NFTMarketplaceFactory.deploy(
         royaltyFee,
         artist.address,
         prices,
         {
            value: deploymentFees
         }
      )
   })

   describe('Deployment', ()=>{
      it('Should track name, symbol, URI', async ()=>{
         const nftName = "DAppFi"
         const nftSymbol = "DAPP"

         expect(await nftMarketplace.name()).to.equal(nftName)
         expect(await nftMarketplace.symbol()).to.equal(nftSymbol)
         expect(await nftMarketplace.baseURI()).to.equal(URI)
      })

      it("Should mint then list all music NFTS", async ()=>{
         await Promise.all(prices.map(async (i, index)=>{
            const item = await nftMarketplace.marketItems(index)
            expect(item.tokenId).to.equal(index)
            expect(item.seller).to.equal(deployer.address)
            expect(item.price).to.equal(i)
         }))
      })

      it("Ether balance shiould equal deployment fees", async ()=>{
         expect(await ethers.provider.getBalance(nftMarketplace.address)).to.equal(deploymentFees)
      })
   })


})