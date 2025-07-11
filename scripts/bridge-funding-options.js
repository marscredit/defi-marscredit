#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

async function analyzeFundingOptions() {
  console.log('💰 Analyzing Bridge Funding Options...\n');
  
  try {
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    
    // Get current state
    const contractBalance = await l1Provider.getBalance(process.env.BRIDGE_CONTRACT_ADDRESS);
    const contractBalanceInMars = parseFloat(ethers.formatEther(contractBalance));
    
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey('5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs');
    
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const solanaTotalSupply = mintInfo.value.uiAmount;
    
    const neededAmount = solanaTotalSupply - contractBalanceInMars;
    
    console.log('📊 Current Situation:');
    console.log('====================');
    console.log(`L1 Contract Balance: ${contractBalanceInMars.toFixed(6)} MARS`);
    console.log(`Solana Total Supply: ${solanaTotalSupply.toFixed(6)} MARS`);
    console.log(`Amount Needed: ${neededAmount.toFixed(6)} MARS`);
    
    // Check available wallet balances
    console.log('\n💼 Available Wallet Balances:');
    console.log('=============================');
    
    const wallets = [];
    
    // Check deployer wallet
    if (process.env.DEPLOYER_PRIVATE_KEY) {
      const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, l1Provider);
      const deployerBalance = await l1Provider.getBalance(deployerWallet.address);
      const deployerBalanceInMars = parseFloat(ethers.formatEther(deployerBalance));
      wallets.push({
        name: 'Deployer',
        address: deployerWallet.address,
        balance: deployerBalanceInMars
      });
    }
    
    // Check relayer wallet
    if (process.env.RELAYER_PRIVATE_KEY) {
      const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
      const relayerBalance = await l1Provider.getBalance(relayerWallet.address);
      const relayerBalanceInMars = parseFloat(ethers.formatEther(relayerBalance));
      wallets.push({
        name: 'Relayer',
        address: relayerWallet.address,
        balance: relayerBalanceInMars
      });
    }
    
    let totalAvailable = 0;
    wallets.forEach(wallet => {
      console.log(`${wallet.name.padEnd(12)}: ${wallet.balance.toFixed(6)} MARS (${wallet.address})`);
      totalAvailable += wallet.balance;
    });
    
    console.log(`${'Total'.padEnd(12)}: ${totalAvailable.toFixed(6)} MARS`);
    
    // Analysis and recommendations
    console.log('\n🎯 Funding Analysis:');
    console.log('===================');
    
    if (totalAvailable >= neededAmount) {
      console.log('✅ Sufficient funds available across wallets');
      console.log(`   Can fully balance the bridge`);
    } else {
      console.log('❌ Insufficient funds available');
      console.log(`   Need: ${neededAmount.toFixed(6)} MARS`);
      console.log(`   Have: ${totalAvailable.toFixed(6)} MARS`);
      console.log(`   Shortfall: ${(neededAmount - totalAvailable).toFixed(6)} MARS`);
    }
    
    console.log('\n🔄 Recommended Approach:');
    console.log('========================');
    
    if (totalAvailable >= neededAmount) {
      console.log('1. Transfer available funds to bridge contract');
      console.log('2. Deploy V3 relayer to production');
      console.log('3. Bridge will be fully balanced and restart-safe');
      
    } else {
      console.log('OPTION 1: Partial Balance + V3 Deployment');
      console.log(`- Transfer all available funds (${totalAvailable.toFixed(6)} MARS) to bridge`);
      console.log(`- This reduces the imbalance from ${neededAmount.toFixed(6)} to ${(neededAmount - totalAvailable).toFixed(6)} MARS`);
      console.log('- Deploy V3 relayer to prevent further imbalance');
      console.log('- Bridge will be restart-safe, only existing imbalance remains');
      
      console.log('\nOPTION 2: Source Additional Funds');
      console.log('- Find additional funding sources');
      console.log('- Fully balance the bridge before V3 deployment');
      console.log('- Results in perfectly balanced bridge');
      
      console.log('\nOPTION 3: Accept Current Imbalance');
      console.log('- Deploy V3 relayer without additional funding');
      console.log('- Bridge becomes restart-safe but remains imbalanced');
      console.log('- No new imbalances will occur going forward');
    }
    
    console.log('\n🚀 V3 Relayer Benefits (regardless of option):');
    console.log('==============================================');
    console.log('- Completely stateless operation');
    console.log('- No JSON file dependencies');
    console.log('- Fully restart-safe');
    console.log('- On-chain verification only');
    console.log('- No more duplicate transactions');
    console.log('- Production-ready deployment');
    
    // Show partial funding calculation
    if (totalAvailable > 0 && totalAvailable < neededAmount) {
      const remainingImbalance = neededAmount - totalAvailable;
      const syncPercentage = ((solanaTotalSupply - remainingImbalance) / solanaTotalSupply) * 100;
      
      console.log('\n📊 Partial Funding Impact:');
      console.log('==========================');
      console.log(`Current Sync: ${((contractBalanceInMars / solanaTotalSupply) * 100).toFixed(2)}%`);
      console.log(`After Partial Funding: ${syncPercentage.toFixed(2)}%`);
      console.log(`Remaining Imbalance: ${remainingImbalance.toFixed(6)} MARS`);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing funding options:', error.message);
  }
}

async function executePartialFunding() {
  console.log('🚀 Executing Partial Bridge Funding...\n');
  
  try {
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    
    // Check if we have any funds to transfer
    const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, l1Provider);
    const deployerBalance = await l1Provider.getBalance(deployerWallet.address);
    const deployerBalanceInMars = parseFloat(ethers.formatEther(deployerBalance));
    
    if (deployerBalanceInMars < 0.1) {
      console.log('❌ Insufficient funds for transfer (less than 0.1 MARS)');
      return;
    }
    
    // Leave some for gas fees
    const amountToTransfer = deployerBalanceInMars - 0.01; // Leave 0.01 MARS for gas
    
    console.log(`💸 Transferring ${amountToTransfer.toFixed(6)} MARS to bridge contract...`);
    
    const tx = await deployerWallet.sendTransaction({
      to: process.env.BRIDGE_CONTRACT_ADDRESS,
      value: ethers.parseEther(amountToTransfer.toString()),
      gasLimit: 30000,
      gasPrice: ethers.parseUnits('0.5', 'gwei')
    });
    
    console.log(`⏳ Transaction hash: ${tx.hash}`);
    await tx.wait();
    
    console.log('✅ Partial funding completed!');
    
    // Show updated state
    const finalBalance = await l1Provider.getBalance(process.env.BRIDGE_CONTRACT_ADDRESS);
    const finalBalanceInMars = parseFloat(ethers.formatEther(finalBalance));
    
    console.log('\n📊 Updated State:');
    console.log('================');
    console.log(`L1 Contract Balance: ${finalBalanceInMars.toFixed(6)} MARS`);
    console.log(`Improvement: +${amountToTransfer.toFixed(6)} MARS`);
    
  } catch (error) {
    console.error('❌ Error executing partial funding:', error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--execute-partial')) {
  executePartialFunding().catch(console.error);
} else {
  analyzeFundingOptions().catch(console.error);
} 