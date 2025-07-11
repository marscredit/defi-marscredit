#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

async function checkBridgeSync() {
  console.log('🔍 Checking Bridge Sync Status...\n');
  
  try {
    // === L1 (Mars) Bridge Analysis ===
    console.log('📊 Analyzing L1 (Mars) Bridge...');
    
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const l1Wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
    
    const bridgeABI = [
      'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI, l1Wallet);
    
    // Get all TokensLocked events to calculate actual locked amount
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    let totalLocked = 0;
    console.log(`   Found ${events.length} bridge transactions`);
    
    for (const event of events) {
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      totalLocked += amount;
    }
    
    console.log(`   Total Locked: ${totalLocked.toFixed(6)} MARS`);
    
    // Also get actual contract balance for comparison
    const contractBalance = await l1Provider.getBalance(process.env.BRIDGE_CONTRACT_ADDRESS);
    const contractBalanceInMars = parseFloat(ethers.formatEther(contractBalance));
    console.log(`   Contract Balance: ${contractBalanceInMars.toFixed(6)} MARS`);
    
    // === Solana Analysis ===
    console.log('\n📊 Analyzing Solana Bridge...');
    
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey('5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs');
    
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const solanaTotalSupply = mintInfo.value.uiAmount;
    
    console.log(`   Solana Total Supply: ${solanaTotalSupply.toFixed(6)} MARS`);
    
    // === Sync Analysis ===
    console.log('\n🎯 BRIDGE SYNC ANALYSIS:');
    console.log('========================');
    console.log(`L1 Total Locked:     ${totalLocked.toFixed(6)} MARS`);
    console.log(`Solana Total Supply: ${solanaTotalSupply.toFixed(6)} MARS`);
    console.log('------------------------');
    
    const difference = solanaTotalSupply - totalLocked;
    console.log(`Difference:          ${difference.toFixed(6)} MARS`);
    
    if (Math.abs(difference) < 0.001) {
      console.log('\n✅ BRIDGE IS PERFECTLY SYNCED!');
    } else if (difference > 0) {
      console.log('\n🚨 EXCESS MARS ON SOLANA');
      console.log(`   Solana has ${difference.toFixed(6)} MARS more than L1 locked`);
      console.log(`   This excess needs to be burned to balance the bridge`);
    } else {
      console.log('\n⚠️  DEFICIT ON SOLANA');
      console.log(`   Solana has ${Math.abs(difference).toFixed(6)} MARS less than L1 locked`);
      console.log(`   This deficit needs to be minted to balance the bridge`);
    }
    
    // === Additional Details ===
    console.log('\n📋 Additional Details:');
    console.log('=====================');
    console.log(`L1 Contract Balance vs Locked: ${(contractBalanceInMars - totalLocked).toFixed(6)} MARS`);
    console.log(`Sync Percentage: ${((Math.min(totalLocked, solanaTotalSupply) / Math.max(totalLocked, solanaTotalSupply)) * 100).toFixed(4)}%`);
    
    if (contractBalanceInMars !== totalLocked) {
      const contractDifference = contractBalanceInMars - totalLocked;
      if (contractDifference > 0) {
        console.log(`\n💡 Note: Bridge contract has ${contractDifference.toFixed(6)} MARS more than locked events`);
        console.log(`   This could be from direct transfers or returns`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking bridge sync:', error.message);
  }
}

// Run the check
checkBridgeSync().catch(console.error); 