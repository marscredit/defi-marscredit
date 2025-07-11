#!/usr/bin/env node

require('dotenv').config();
const { ethers } = require('ethers');

console.log('🔄 Returning Funds to Bridge Contract');
console.log('====================================');

async function returnFundsToBridge() {
  try {
    // Use DEPLOYER private key
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, l1Provider);
    
    const bridgeContractAddress = process.env.BRIDGE_CONTRACT_ADDRESS;
    
    console.log('👑 Deployer Wallet:', deployerWallet.address);
    console.log('🏛️ Bridge Contract:', bridgeContractAddress);
    
    // Check deployer balance
    const deployerBalance = await l1Provider.getBalance(deployerWallet.address);
    const deployerBalanceInMars = parseFloat(ethers.formatEther(deployerBalance));
    
    console.log(`💰 Deployer Balance: ${deployerBalanceInMars.toFixed(3)} MARS`);
    
    // We want to send exactly 9,240,514.236 MARS to match Solana supply
    const amountToSend = 9240514.236;
    
    if (deployerBalanceInMars < amountToSend) {
      throw new Error(`Insufficient balance! Need ${amountToSend} MARS, have ${deployerBalanceInMars} MARS`);
    }
    
    console.log(`🎯 Sending ${amountToSend} MARS to bridge contract...`);
    
    // Send the funds back to bridge contract
    const returnTx = await deployerWallet.sendTransaction({
      to: bridgeContractAddress,
      value: ethers.parseEther(amountToSend.toString()),
      gasLimit: 30000, // Higher gas limit
      gasPrice: ethers.parseUnits('0.5', 'gwei') // Higher gas price
    });
    
    console.log(`⏳ Transaction: ${returnTx.hash}`);
    await returnTx.wait();
    
    console.log('✅ Funds returned successfully!');
    
    // Verify final state
    const finalBridgeBalance = await l1Provider.getBalance(bridgeContractAddress);
    const finalBridgeBalanceInMars = parseFloat(ethers.formatEther(finalBridgeBalance));
    
    console.log('\n🎉 FINAL RESULT:');
    console.log('================');
    console.log(`✅ Bridge Contract Balance: ${finalBridgeBalanceInMars.toFixed(3)} MARS`);
    console.log(`✅ Should match Solana Supply: 9,240,514.236 MARS`);
    
    const difference = Math.abs(finalBridgeBalanceInMars - 9240514.236);
    if (difference < 1) {
      console.log('🎉 BRIDGE IS NOW PERFECTLY BALANCED!');
    } else {
      console.log(`⚠️  Small discrepancy: ${difference.toFixed(3)} MARS`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

returnFundsToBridge(); 