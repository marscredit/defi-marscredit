#!/usr/bin/env node

require('dotenv').config();
const { ethers } = require('ethers');

console.log('🔍 Bridge Contract Owner Check');
console.log('==============================');

async function checkBridgeOwner() {
  try {
    // Connect to L1
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const l1Wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
    
    const bridgeContractAddress = process.env.BRIDGE_CONTRACT_ADDRESS;
    console.log('🏛️ Bridge Contract:', bridgeContractAddress);
    console.log('👛 Your Wallet:', l1Wallet.address);
    
    // Bridge contract ABI (including owner function)
    const bridgeABI = [
      'function owner() external view returns (address)',
      'function emergencyWithdraw() external',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(bridgeContractAddress, bridgeABI, l1Wallet);
    
    // Check owner
    const contractOwner = await bridgeContract.owner();
    console.log('👑 Contract Owner:', contractOwner);
    
    const isOwner = contractOwner.toLowerCase() === l1Wallet.address.toLowerCase();
    console.log('🔑 You are owner:', isOwner ? '✅ YES' : '❌ NO');
    
    if (!isOwner) {
      console.log('\n❌ You cannot withdraw from the bridge contract');
      console.log('💡 Only the contract owner can call emergencyWithdraw');
      console.log('👑 Contact the owner to perform this withdrawal');
      return;
    }
    
    // Get current balance
    const balance = await l1Provider.getBalance(bridgeContractAddress);
    const balanceInMars = parseFloat(ethers.formatEther(balance));
    
    console.log('\n💰 Current Bridge Balance:', balanceInMars.toFixed(3), 'MARS');
    console.log('🎯 Want to withdraw: 8040.528 MARS');
    console.log(`📊 Would remain: ${(balanceInMars - 8040.528).toFixed(3)} MARS`);
    
    console.log('\n⚠️  WARNING: emergencyWithdraw() withdraws ALL funds!');
    console.log('💡 You would need to send back the remainder to the contract');
    
    // Ask for confirmation (this is just a check script, not executing)
    console.log('\n🔧 To proceed:');
    console.log('1. Call emergencyWithdraw() to get all funds');
    console.log('2. Send back the excess to the bridge contract');
    console.log('3. Or create a custom withdrawal function');
    
    return {
      isOwner,
      currentBalance: balanceInMars,
      contractOwner,
      yourAddress: l1Wallet.address
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

checkBridgeOwner(); 