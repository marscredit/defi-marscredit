#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

async function calculateBridgeBalanceFix() {
  console.log('🔧 Calculating Bridge Balance Fix...\n');
  
  try {
    // === Get Current State ===
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const l1Wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
    
    const bridgeABI = [
      'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI, l1Wallet);
    
    // Get L1 contract balance
    const contractBalance = await l1Provider.getBalance(process.env.BRIDGE_CONTRACT_ADDRESS);
    const contractBalanceInMars = parseFloat(ethers.formatEther(contractBalance));
    
    // Get Solana supply
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey('5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs');
    
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const solanaTotalSupply = mintInfo.value.uiAmount;
    
    console.log('📊 Current State:');
    console.log('================');
    console.log(`L1 Contract Balance: ${contractBalanceInMars.toFixed(6)} MARS`);
    console.log(`Solana Total Supply: ${solanaTotalSupply.toFixed(6)} MARS`);
    
    // Calculate needed amount
    const neededAmount = solanaTotalSupply - contractBalanceInMars;
    
    console.log('\n🎯 Balance Fix Required:');
    console.log('========================');
    
    if (neededAmount > 0) {
      console.log(`Need to ADD: ${neededAmount.toFixed(6)} MARS to L1 bridge contract`);
      console.log(`Target balance: ${solanaTotalSupply.toFixed(6)} MARS`);
      
      // Check if deployer has enough balance
      const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, l1Provider);
      const deployerBalance = await l1Provider.getBalance(deployerWallet.address);
      const deployerBalanceInMars = parseFloat(ethers.formatEther(deployerBalance));
      
      console.log(`\n💰 Deployer Balance: ${deployerBalanceInMars.toFixed(6)} MARS`);
      
      if (deployerBalanceInMars >= neededAmount) {
        console.log('✅ Deployer has sufficient balance to complete the fix');
        console.log(`   After transfer: ${(deployerBalanceInMars - neededAmount).toFixed(6)} MARS remaining`);
        
        // Show transaction details
        console.log('\n📋 Transaction Details:');
        console.log('======================');
        console.log(`From: ${deployerWallet.address}`);
        console.log(`To: ${process.env.BRIDGE_CONTRACT_ADDRESS}`);
        console.log(`Amount: ${neededAmount.toFixed(6)} MARS`);
        
        console.log('\n🚀 Ready to execute fix!');
        console.log('Run with --execute flag to perform the transfer');
        
      } else {
        console.log('❌ Deployer does not have sufficient balance');
        console.log(`   Need: ${neededAmount.toFixed(6)} MARS`);
        console.log(`   Have: ${deployerBalanceInMars.toFixed(6)} MARS`);
        console.log(`   Shortfall: ${(neededAmount - deployerBalanceInMars).toFixed(6)} MARS`);
      }
      
    } else if (neededAmount < 0) {
      console.log(`Bridge contract has EXCESS: ${Math.abs(neededAmount).toFixed(6)} MARS`);
      console.log('No additional funds needed - contract already has more than Solana supply');
      
    } else {
      console.log('✅ Bridge contract balance already matches Solana supply!');
    }
    
    console.log('\n🔄 After Fix with V3 Relayer:');
    console.log('=============================');
    console.log('- L1 contract balance will match Solana supply');
    console.log('- V3 relayer uses stateless, on-chain verification only');
    console.log('- No JSON file dependencies = restart-safe');
    console.log('- No more duplicate transactions');
    console.log('- Bridge will be properly balanced going forward');
    
  } catch (error) {
    console.error('❌ Error calculating bridge fix:', error.message);
  }
}

async function executeBridgeFix() {
  console.log('🚀 Executing Bridge Balance Fix...\n');
  
  try {
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, l1Provider);
    
    // Get current state
    const contractBalance = await l1Provider.getBalance(process.env.BRIDGE_CONTRACT_ADDRESS);
    const contractBalanceInMars = parseFloat(ethers.formatEther(contractBalance));
    
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey('5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs');
    
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const solanaTotalSupply = mintInfo.value.uiAmount;
    
    const neededAmount = solanaTotalSupply - contractBalanceInMars;
    
    if (neededAmount <= 0) {
      console.log('✅ No transfer needed - bridge already balanced');
      return;
    }
    
    console.log(`💸 Sending ${neededAmount.toFixed(6)} MARS to bridge contract...`);
    
    const tx = await deployerWallet.sendTransaction({
      to: process.env.BRIDGE_CONTRACT_ADDRESS,
      value: ethers.parseEther(neededAmount.toString()),
      gasLimit: 30000,
      gasPrice: ethers.parseUnits('0.5', 'gwei')
    });
    
    console.log(`⏳ Transaction hash: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    await tx.wait();
    
    console.log('✅ Transfer completed successfully!');
    
    // Verify final state
    const finalBalance = await l1Provider.getBalance(process.env.BRIDGE_CONTRACT_ADDRESS);
    const finalBalanceInMars = parseFloat(ethers.formatEther(finalBalance));
    
    console.log('\n🎉 Final State:');
    console.log('===============');
    console.log(`L1 Contract Balance: ${finalBalanceInMars.toFixed(6)} MARS`);
    console.log(`Solana Total Supply: ${solanaTotalSupply.toFixed(6)} MARS`);
    console.log(`Difference: ${(solanaTotalSupply - finalBalanceInMars).toFixed(6)} MARS`);
    
    if (Math.abs(solanaTotalSupply - finalBalanceInMars) < 0.001) {
      console.log('✅ BRIDGE IS NOW BALANCED!');
    }
    
  } catch (error) {
    console.error('❌ Error executing bridge fix:', error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--execute')) {
  executeBridgeFix().catch(console.error);
} else {
  calculateBridgeBalanceFix().catch(console.error);
} 