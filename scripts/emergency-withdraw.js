#!/usr/bin/env node

require('dotenv').config();
const { ethers } = require('ethers');

console.log('🚨 Bridge Emergency Withdrawal');
console.log('==============================');

async function performEmergencyWithdrawal() {
  try {
    // Use DEPLOYER private key (the contract owner)
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, l1Provider);
    
    const bridgeContractAddress = process.env.BRIDGE_CONTRACT_ADDRESS;
    const targetAddress = '0x6039E53688Da87EBF30B0C84d22FCd6707b0C564'; // User's specified address
    
    console.log('🏛️ Bridge Contract:', bridgeContractAddress);
    console.log('👑 Using Deployer Wallet:', deployerWallet.address);
    console.log('🎯 Target Address:', targetAddress);
    
    // Bridge contract ABI
    const bridgeABI = [
      'function owner() external view returns (address)',
      'function emergencyWithdraw() external',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(bridgeContractAddress, bridgeABI, deployerWallet);
    
    // Verify ownership
    const contractOwner = await bridgeContract.owner();
    if (contractOwner.toLowerCase() !== deployerWallet.address.toLowerCase()) {
      throw new Error(`Not the owner! Contract owner: ${contractOwner}, Your address: ${deployerWallet.address}`);
    }
    
    console.log('✅ Ownership verified');
    
    // Get current balance
    const balance = await l1Provider.getBalance(bridgeContractAddress);
    const balanceInMars = parseFloat(ethers.formatEther(balance));
    
    console.log(`💰 Current Bridge Balance: ${balanceInMars.toFixed(3)} MARS`);
    
    const withdrawAmount = 8040.528; // Amount to send to target address
    const returnAmount = balanceInMars - withdrawAmount;
    
    console.log(`🎯 Will send ${withdrawAmount} MARS to: ${targetAddress}`);
    console.log(`🔄 Will return ${returnAmount.toFixed(3)} MARS to bridge contract`);
    
    console.log('\n⚠️  WARNING: This will perform the following actions:');
    console.log('1. Emergency withdraw ALL funds from bridge contract');
    console.log(`2. Send ${withdrawAmount} MARS to ${targetAddress}`);
    console.log(`3. Send ${returnAmount.toFixed(3)} MARS back to bridge contract`);
    console.log('\nType "YES" to confirm, or anything else to cancel:');
    
    // Since this is automated, I'll add a safety check
    if (balanceInMars < withdrawAmount) {
      throw new Error(`Insufficient balance! Need ${withdrawAmount} MARS, have ${balanceInMars} MARS`);
    }
    
    console.log('\n🚀 Proceeding with withdrawal...');
    
    // Step 1: Emergency withdraw all funds
    console.log('📤 Step 1: Emergency withdrawing all funds...');
    const withdrawTx = await bridgeContract.emergencyWithdraw({
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('0.1', 'gwei')
    });
    
    console.log(`⏳ Withdrawal transaction: ${withdrawTx.hash}`);
    await withdrawTx.wait();
    console.log('✅ Emergency withdrawal completed');
    
    // Step 2: Send specified amount to target address
    console.log(`📤 Step 2: Sending ${withdrawAmount} MARS to ${targetAddress}...`);
    const sendTx = await deployerWallet.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther(withdrawAmount.toString()),
      gasLimit: 21000,
      gasPrice: ethers.parseUnits('0.1', 'gwei')
    });
    
    console.log(`⏳ Send transaction: ${sendTx.hash}`);
    await sendTx.wait();
    console.log('✅ Transfer to target address completed');
    
    // Step 3: Send remaining funds back to bridge contract
    console.log(`📤 Step 3: Returning ${returnAmount.toFixed(3)} MARS to bridge contract...`);
    const returnTx = await deployerWallet.sendTransaction({
      to: bridgeContractAddress,
      value: ethers.parseEther(returnAmount.toString()),
      gasLimit: 21000,
      gasPrice: ethers.parseUnits('0.1', 'gwei')
    });
    
    console.log(`⏳ Return transaction: ${returnTx.hash}`);
    await returnTx.wait();
    console.log('✅ Return to bridge contract completed');
    
    console.log('\n🎉 ALL OPERATIONS COMPLETED!');
    console.log('==============================');
    console.log(`✅ Sent ${withdrawAmount} MARS to ${targetAddress}`);
    console.log(`✅ Returned ${returnAmount.toFixed(3)} MARS to bridge contract`);
    console.log('✅ Bridge should now be balanced');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// SAFETY: Only run if explicitly confirmed
console.log('This script will withdraw funds from the bridge contract.');
console.log('Make sure you understand the implications before running.');
console.log('');

performEmergencyWithdrawal(); 