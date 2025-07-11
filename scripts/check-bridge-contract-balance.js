#!/usr/bin/env node

require('dotenv').config();
const { ethers } = require('ethers');

console.log('🔍 Bridge Contract Balance Check');
console.log('================================');

async function checkBridgeBalance() {
  try {
    // Connect to L1
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const l1Wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
    
    const bridgeContractAddress = process.env.BRIDGE_CONTRACT_ADDRESS;
    console.log('🏛️ Bridge Contract:', bridgeContractAddress);
    
    // Get actual MARS balance of bridge contract
    const bridgeBalance = await l1Provider.getBalance(bridgeContractAddress);
    const bridgeBalanceInMars = parseFloat(ethers.formatEther(bridgeBalance));
    
    console.log(`💰 Actual Bridge Contract Balance: ${bridgeBalanceInMars.toFixed(3)} MARS`);
    
    // Get sum of TokensLocked events
    const bridgeABI = [
      'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(bridgeContractAddress, bridgeABI, l1Wallet);
    
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    let eventBasedTotal = 0;
    for (const event of events) {
      eventBasedTotal += parseFloat(ethers.formatEther(event.args.amount));
    }
    
    console.log(`📊 Sum of TokensLocked Events: ${eventBasedTotal.toFixed(3)} MARS`);
    
    const difference = bridgeBalanceInMars - eventBasedTotal;
    console.log(`📊 Difference (Your Transfer): ${difference.toFixed(3)} MARS`);
    
    // Get Solana supply for final comparison
    const { Connection, PublicKey } = require('@solana/web3.js');
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey('5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs');
    
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const solanaSupply = mintInfo.value.uiAmount;
    
    console.log('');
    console.log('🎯 FINAL BALANCE CHECK:');
    console.log('=======================');
    console.log(`L1 Bridge Contract Balance: ${bridgeBalanceInMars.toFixed(3)} MARS`);
    console.log(`Solana Total Supply:        ${solanaSupply.toFixed(3)} MARS`);
    
    const finalDiscrepancy = solanaSupply - bridgeBalanceInMars;
    console.log(`Final Discrepancy:          ${finalDiscrepancy.toFixed(3)} MARS`);
    
    if (Math.abs(finalDiscrepancy) < 1) {
      console.log('\n🎉 BRIDGE IS NOW BALANCED!');
    } else if (finalDiscrepancy > 0) {
      console.log('\n🚨 Still excess MARS on Solana');
      console.log(`   Need to burn: ${finalDiscrepancy.toFixed(3)} MARS`);
    } else {
      console.log('\n⚠️  Still deficit on Solana');
      console.log(`   Need to mint: ${Math.abs(finalDiscrepancy).toFixed(3)} MARS`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBridgeBalance(); 