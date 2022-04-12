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


   describe('Updating royalty fee', ()=>{
      it('Only deployer should be able to update royalty fee', async ()=>{
         const fee = toWei(0.02)
         await nftMarketplace.updateRoyaltyFee(fee)
         await expect(
            nftMarketplace.connect(user1).updateRoyaltyFee(fee)
         ).to.be.revertedWith("Ownable: caller is not the owner")

         expect(await nftMarketplace.royaltyFee()).to.equal(fee)
      })
   })

   describe('Buying tokens', ()=>{
      it('Should update seller to zero address, transfer NFT, pay seller,pay royalty to artist and emit a MarketItemBought event', async ()=>{
         const deployerInitialEthBalance = await deployer.getBalance()
         const artistInitialEthBalance = await artist.getBalance()

         await expect(nftMarketplace.connect(user1).buyToken(0, {value: prices[0]}))
            .to.emit(nftMarketplace, "MarketItemBought")
            .withArgs(
               0,
               deployer.address,
               user1.address,
               prices[0]
            )

         const deployerFinalEthBalance = await deployer.getBalance()
         const artistFinalEthBalance = await artist.getBalance()

         expect((await nftMarketplace.marketItems(0)).seller).to.equal('0x0000000000000000000000000000000000000000')
         expect(+fromWei(deployerFinalEthBalance)).to.equal(+fromWei(prices[0]) + +fromWei(deployerInitialEthBalance))
         expect(+fromWei(artistFinalEthBalance)).to.equal(+fromWei(royaltyFee) + +fromWei(artistInitialEthBalance))

         expect(await nftMarketplace.ownerOf(0)).to.equal(user1.address)
      })

      it('Should fail when ether amount sent with transaction does not equal asking price', async ()=>{
         await expect(
            nftMarketplace.connect(user1).buyToken(0, {value: prices[1]})
         ).to.be.revertedWith('Please send the asking price in order to complete the purchase')
      })
   })

   describe('Reselling tokens', ()=>{
      beforeEach(async ()=>{
         await nftMarketplace.connect(user1).buyToken(0, {value: prices[0]})
      })

      it('Should track resale item, incr. ether balance by royalty fee, transfer NFT to marketplace and emit MarketItemRelisted event', async ()=>{
         const resalePrice = toWei(2)
         const initialMarketBalance = await ethers.provider.getBalance(nftMarketplace.address)

         await expect(nftMarketplace.connect(user1).resellToken(0, resalePrice, {value: royaltyFee}))
            .to.emit(nftMarketplace, "MarketItemRelisted")
            .withArgs(
               0,
               user1.address,
               resalePrice
            )
         const finalMarketBalance = await ethers.provider.getBalance(nftMarketplace.address)

         expect(+fromWei(finalMarketBalance)).to.equal(+fromWei(royaltyFee) +  +fromWei(initialMarketBalance))
         expect(await nftMarketplace.ownerOf(0)).to.equal(nftMarketplace.address)

         const item = await nftMarketplace.marketItems(0)
         expect(item.tokenId).to.equal(0)
         expect(item.seller).to.equal(user1.address)
         expect(item.price).to.equal(resalePrice)
      })

      it('Should fail price is set to zero and royalty fee is not paid', async ()=>{
         await expect(
            nftMarketplace.connect(user1).resellToken(0,0,{value: royaltyFee})
         ).to.be.revertedWith("Price must be higher than zero")
         await expect(
            nftMarketplace.connect(user1).resellToken(0, toWei(1),{value: royaltyFee})
         ).to.be.revertedWith("Must pay royalty")
      })
   })
})