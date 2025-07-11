#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

async function analyzeBridgeDiscrepancy() {
  console.log('🔍 Analyzing Bridge Contract Discrepancy...\n');
  
  try {
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const l1Wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
    
    const bridgeABI = [
      'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
      'event TokensUnlocked(address indexed recipient, uint256 amount, bytes32 indexed solanaTxId, uint256 indexed bridgeId)',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI, l1Wallet);
    
    // === L1 Analysis ===
    console.log('📊 L1 Bridge Contract Analysis:');
    console.log('================================');
    
    // Get actual contract balance
    const contractBalance = await l1Provider.getBalance(process.env.BRIDGE_CONTRACT_ADDRESS);
    const contractBalanceInMars = parseFloat(ethers.formatEther(contractBalance));
    console.log(`Contract Balance: ${contractBalanceInMars.toFixed(6)} MARS`);
    
    // Get TokensLocked events (L1 → Solana)
    const lockedFilter = bridgeContract.filters.TokensLocked();
    const lockedEvents = await bridgeContract.queryFilter(lockedFilter, 0);
    
    let totalLocked = 0;
    console.log(`\n🔒 TokensLocked Events (L1 → Solana): ${lockedEvents.length}`);
    
    for (const event of lockedEvents) {
      const bridgeId = event.args.bridgeId.toString();
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      totalLocked += amount;
      console.log(`   Bridge ID ${bridgeId.padStart(2, ' ')}: ${amount.toFixed(6)} MARS → ${event.args.solanaRecipient}`);
    }
    
    // Get TokensUnlocked events (Solana → L1)
    const unlockedFilter = bridgeContract.filters.TokensUnlocked();
    const unlockedEvents = await bridgeContract.queryFilter(unlockedFilter, 0);
    
    let totalUnlocked = 0;
    console.log(`\n🔓 TokensUnlocked Events (Solana → L1): ${unlockedEvents.length}`);
    
    for (const event of unlockedEvents) {
      const bridgeId = event.args.bridgeId.toString();
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      totalUnlocked += amount;
      console.log(`   Bridge ID ${bridgeId.padStart(2, ' ')}: ${amount.toFixed(6)} MARS → ${event.args.recipient}`);
    }
    
    // Calculate what contract should have
    const expectedContractBalance = totalLocked - totalUnlocked;
    
    console.log('\n📋 L1 Summary:');
    console.log('==============');
    console.log(`Total Locked (L1 → Solana):   ${totalLocked.toFixed(6)} MARS`);
    console.log(`Total Unlocked (Solana → L1): ${totalUnlocked.toFixed(6)} MARS`);
    console.log(`Expected Contract Balance:    ${expectedContractBalance.toFixed(6)} MARS`);
    console.log(`Actual Contract Balance:      ${contractBalanceInMars.toFixed(6)} MARS`);
    console.log(`Contract Balance Difference:  ${(contractBalanceInMars - expectedContractBalance).toFixed(6)} MARS`);
    
    // === Solana Analysis ===
    console.log('\n📊 Solana Analysis:');
    console.log('===================');
    
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey('5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs');
    
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const solanaTotalSupply = mintInfo.value.uiAmount;
    
    // Calculate what Solana should have based on bridge events
    const expectedSolanaSupply = totalLocked - totalUnlocked;
    
    console.log(`Expected Solana Supply:       ${expectedSolanaSupply.toFixed(6)} MARS`);
    console.log(`Actual Solana Supply:         ${solanaTotalSupply.toFixed(6)} MARS`);
    console.log(`Solana Supply Difference:     ${(solanaTotalSupply - expectedSolanaSupply).toFixed(6)} MARS`);
    
    // === Root Cause Analysis ===
    console.log('\n🎯 Root Cause Analysis:');
    console.log('=======================');
    
    const contractExcess = contractBalanceInMars - expectedContractBalance;
    const solanaExcess = solanaTotalSupply - expectedSolanaSupply;
    
    if (contractExcess > 0) {
      console.log(`✅ L1 Contract has EXTRA: ${contractExcess.toFixed(6)} MARS`);
      console.log('   This could be from:');
      console.log('   - Direct transfers to contract');
      console.log('   - Returns from previous fixes');
      console.log('   - Emergency withdrawals that were returned');
    } else if (contractExcess < 0) {
      console.log(`❌ L1 Contract has DEFICIT: ${Math.abs(contractExcess).toFixed(6)} MARS`);
      console.log('   This suggests funds were withdrawn from contract');
    } else {
      console.log('✅ L1 Contract balance matches bridge events perfectly');
    }
    
    if (solanaExcess > 0) {
      console.log(`❌ Solana has EXCESS: ${solanaExcess.toFixed(6)} MARS`);
      console.log('   This suggests duplicate minting occurred');
    } else if (solanaExcess < 0) {
      console.log(`✅ Solana has DEFICIT: ${Math.abs(solanaExcess).toFixed(6)} MARS`);
      console.log('   This suggests some tokens were burned');
    } else {
      console.log('✅ Solana supply matches bridge events perfectly');
    }
    
    // === The Real Issue ===
    console.log('\n🚨 The Real Issue:');
    console.log('==================');
    
    if (solanaTotalSupply > contractBalanceInMars) {
      console.log(`The problem is NOT that the contract needs more MARS.`);
      console.log(`The problem is that Solana has ${(solanaTotalSupply - contractBalanceInMars).toFixed(6)} MARS more than the L1 contract.`);
      console.log('');
      console.log('This happened because:');
      console.log('- Some bridge transactions were processed twice (double-minting)');
      console.log('- Extra MARS was minted on Solana without corresponding L1 locks');
      console.log('');
      console.log('The correct fix is:');
      console.log('1. Keep the current L1 contract balance as-is');
      console.log('2. Deploy V3 relayer to prevent future duplicates');
      console.log('3. Accept the existing imbalance (it won\'t get worse)');
      console.log('');
      console.log('OR alternatively:');
      console.log('1. Burn excess MARS from Solana to match L1 contract');
      console.log('2. Deploy V3 relayer');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing bridge discrepancy:', error.message);
  }
}

analyzeBridgeDiscrepancy().catch(console.error); 