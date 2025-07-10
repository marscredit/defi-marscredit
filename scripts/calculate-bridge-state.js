#!/usr/bin/env node

require('dotenv').config();
const { PublicKey } = require('@solana/web3.js');
const { ethers } = require('ethers');

console.log('🔍 Bridge Program Information Calculator');
console.log('========================================');

// Your bridge program ID from Anchor.toml
const BRIDGE_PROGRAM_ID = 'MarsB1dg3K8GzRTaY3PdJwEYy2HjnxCEwUXXUyZvvQUz';

console.log('✅ Bridge Program ID:', BRIDGE_PROGRAM_ID);

// Calculate bridge state PDA
async function calculateBridgeState() {
  console.log('\n🔧 Calculating Bridge State PDA...');
  
  // We need the authority key to calculate the PDA
  // The authority is your Solana wallet (relayer wallet)
  
  if (!process.env.SOLANA_PRIVATE_KEY) {
    console.log('❌ SOLANA_PRIVATE_KEY not found in .env file');
    console.log('💡 Please add your Solana private key to calculate the bridge state PDA');
    return;
  }

  try {
    const { Keypair } = require('@solana/web3.js');
    const solanaPrivateKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
    const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(solanaPrivateKey));
    
    console.log('👛 Authority (Solana Wallet):', solanaWallet.publicKey.toString());
    
    // Calculate the bridge state PDA
    const [bridgeStatePDA, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from('bridge_state'),
        solanaWallet.publicKey.toBuffer()
      ],
      new PublicKey(BRIDGE_PROGRAM_ID)
    );
    
    console.log('🎯 Bridge State PDA:', bridgeStatePDA.toString());
    console.log('   Bump:', bump);
    
    console.log('\n✅ Add these to your .env file:');
    console.log('BRIDGE_PROGRAM_ID=' + BRIDGE_PROGRAM_ID);
    console.log('BRIDGE_STATE_ADDRESS=' + bridgeStatePDA.toString());
    
    return bridgeStatePDA.toString();
    
  } catch (error) {
    console.error('❌ Error calculating bridge state:', error.message);
    console.log('💡 Make sure SOLANA_PRIVATE_KEY is a valid JSON array in your .env file');
  }
}

// Calculate double-minting amount
async function calculateDoubleMinting() {
  console.log('\n💰 Calculating Double-Minting Amount...');
  
  if (!process.env.BRIDGE_CONTRACT_ADDRESS || !process.env.RELAYER_PRIVATE_KEY) {
    console.log('❌ Missing L1 connection details');
    console.log('💡 Please ensure BRIDGE_CONTRACT_ADDRESS and RELAYER_PRIVATE_KEY are in your .env file');
    return;
  }

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
    
    console.log(`📊 Found ${events.length} total bridge transactions`);
    
    // Calculate amounts for Bridge IDs 6-15 (the double-minted ones)
    let totalDoubleMinted = 0;
    const doubleMintedBridges = [];
    
    for (const event of events) {
      const bridgeId = parseInt(event.args.bridgeId.toString());
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      
      // Bridge IDs 6-15 were double-minted according to the user
      if (bridgeId >= 6 && bridgeId <= 15) {
        totalDoubleMinted += amount;
        doubleMintedBridges.push({
          bridgeId,
          amount,
          user: event.args.user,
          recipient: event.args.solanaRecipient
        });
      }
    }
    
    console.log('\n🚨 Double-Minted Bridge IDs (6-15):');
    doubleMintedBridges.forEach(bridge => {
      console.log(`   Bridge ID ${bridge.bridgeId}: ${bridge.amount} MARS to ${bridge.recipient}`);
    });
    
    console.log(`\n💸 Total Extra MARS Minted: ${totalDoubleMinted.toFixed(2)} MARS`);
    console.log(`   (This is the amount you need to burn from your wallet to balance the bridge)`);
    
    // Show current bridge stats
    const stats = await bridgeContract.getBridgeStats();
    console.log(`\n📈 Current L1 Bridge Stats:`);
    console.log(`   Total Locked: ${ethers.formatEther(stats[0])} MARS`);
    console.log(`   Bridge Count: ${stats[2].toString()}`);
    
    return totalDoubleMinted;
    
  } catch (error) {
    console.error('❌ Error calculating double-minting:', error.message);
  }
}

async function main() {
  await calculateBridgeState();
  await calculateDoubleMinting();
  
  console.log('\n🎯 Summary:');
  console.log('1. Add the BRIDGE_PROGRAM_ID and BRIDGE_STATE_ADDRESS to your .env file');
  console.log('2. Burn the calculated amount of MARS from your wallet to balance the bridge');
  console.log('3. Update scripts/relayer-state.json with all processed Bridge IDs');
  console.log('4. Restart your relayer with the fixed code');
}

main().catch(console.error); 