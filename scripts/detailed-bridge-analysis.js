#!/usr/bin/env node

require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const { ethers } = require('ethers');

console.log('🔍 Detailed Bridge Analysis');
console.log('===========================');

async function detailedAnalysis() {
  try {
    // Connect to L1
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const l1Wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
    
    const bridgeABI = [
      'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI, l1Wallet);
    
    // Get all TokensLocked events
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`📊 Found ${events.length} bridge transactions\n`);
    
    let totalLocked = 0;
    
    console.log('🔍 Bridge Transaction Details:');
    console.log('==============================');
    
    for (const event of events) {
      const bridgeId = parseInt(event.args.bridgeId.toString());
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      
      totalLocked += amount;
      
      console.log(`Bridge ID ${bridgeId.toString().padStart(2, ' ')}: ${amount.toFixed(3).padStart(12, ' ')} MARS → ${event.args.solanaRecipient}`);
    }
    
    console.log('==============================');
    console.log(`📊 L1 Total Locked: ${totalLocked.toFixed(3)} MARS`);
    
    // Get Solana total supply
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey('5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs');
    
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const totalSupply = mintInfo.value.uiAmount;
    
    console.log(`📊 Solana Total Supply: ${totalSupply.toFixed(3)} MARS`);
    
    const discrepancy = totalSupply - totalLocked;
    console.log(`📊 Discrepancy: ${discrepancy.toFixed(3)} MARS`);
    
    if (Math.abs(discrepancy) < 1) {
      console.log('\n✅ BRIDGE IS BALANCED!');
    } else if (discrepancy > 0) {
      console.log('\n🚨 EXCESS MARS ON SOLANA');
      console.log(`   Need to burn: ${discrepancy.toFixed(3)} MARS`);
    } else {
      console.log('\n⚠️  DEFICIT ON SOLANA');
      console.log(`   Need to mint: ${Math.abs(discrepancy).toFixed(3)} MARS`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

detailedAnalysis(); 