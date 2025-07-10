#!/usr/bin/env node

require('dotenv').config();
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');

console.log('🧪 Testing Bridge Connection');
console.log('============================');

async function testBridgeConnection() {
  try {
    // Initialize connections
    const solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const solanaPrivateKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
    const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(solanaPrivateKey));
    
    console.log('✅ Solana Wallet:', solanaWallet.publicKey.toString());
    
    // Test program IDs - handle them safely
    console.log('🔧 Testing PublicKey creation...');
    
    if (!process.env.SOLANA_BRIDGE_PROGRAM_ID) {
      throw new Error('SOLANA_BRIDGE_PROGRAM_ID not set in .env file');
    }
    if (!process.env.SOLANA_BRIDGE_STATE_ADDRESS) {
      throw new Error('SOLANA_BRIDGE_STATE_ADDRESS not set in .env file');
    }
    if (!process.env.MARS_MINT_ADDRESS) {
      throw new Error('MARS_MINT_ADDRESS not set in .env file');
    }
    
    const bridgeProgramId = new PublicKey(process.env.SOLANA_BRIDGE_PROGRAM_ID);
    const bridgeStateAddress = new PublicKey(process.env.SOLANA_BRIDGE_STATE_ADDRESS);
    const marsMintAddress = new PublicKey(process.env.MARS_MINT_ADDRESS);
    
    console.log('✅ Bridge Program ID:', bridgeProgramId.toString());
    console.log('✅ Bridge State Address:', bridgeStateAddress.toString());
    console.log('✅ Mars Mint Address:', marsMintAddress.toString());
    
    // Test account existence
    const bridgeStateInfo = await solanaConnection.getAccountInfo(bridgeStateAddress);
    if (bridgeStateInfo) {
      console.log('✅ Bridge State Account exists');
      console.log('   Owner:', bridgeStateInfo.owner.toString());
      console.log('   Data length:', bridgeStateInfo.data.length);
    } else {
      console.log('❌ Bridge State Account does not exist');
      console.log('💡 You may need to initialize the bridge program first');
    }
    
    const mintInfo = await solanaConnection.getAccountInfo(marsMintAddress);
    if (mintInfo) {
      console.log('✅ Mars Mint Account exists');
    } else {
      console.log('❌ Mars Mint Account does not exist');
    }
    
    console.log('\n🎯 Connection Test Results:');
    console.log('- Solana RPC: ✅ Connected');
    console.log('- Wallet: ✅ Valid');
    console.log('- Program ID: ✅ Valid');
    console.log('- Bridge State:', bridgeStateInfo ? '✅ Exists' : '❌ Missing');
    console.log('- Mars Mint:', mintInfo ? '✅ Exists' : '❌ Missing');
    
    if (bridgeStateInfo && mintInfo) {
      console.log('\n🚀 Ready to restart relayer!');
      console.log('   Run: node scripts/simple-relayer.js');
    } else {
      console.log('\n⚠️  Issues detected. Check the missing accounts above.');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testBridgeConnection(); 