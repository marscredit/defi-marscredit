#!/usr/bin/env node

const { PublicKey } = require('@solana/web3.js');

console.log('🎯 Bridge State Address Calculator');
console.log('==================================');

// Your values
const BRIDGE_PROGRAM_ID = 'MarsB1dg3K8GzRTaY3PdJwEYy2HjnxCEwUXXUyZvvQUz';
const AUTHORITY_WALLET = 'J5YSv3NgfTkGosD2EWCj8ExJbzLebtfjXVdENQxoMDVq';

console.log('✅ Bridge Program ID:', BRIDGE_PROGRAM_ID);
console.log('👛 Authority Wallet:', AUTHORITY_WALLET);

async function calculateBridgeState() {
  try {
    // Calculate the bridge state PDA
    const [bridgeStatePDA, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from('bridge_state'),
        new PublicKey(AUTHORITY_WALLET).toBuffer()
      ],
      new PublicKey(BRIDGE_PROGRAM_ID)
    );
    
    console.log('\n🎯 Bridge State PDA:', bridgeStatePDA.toString());
    console.log('   Bump:', bump);
    
    console.log('\n✅ Add these to your .env file:');
    console.log('BRIDGE_PROGRAM_ID=' + BRIDGE_PROGRAM_ID);
    console.log('BRIDGE_STATE_ADDRESS=' + bridgeStatePDA.toString());
    
    return bridgeStatePDA.toString();
    
  } catch (error) {
    console.error('❌ Error calculating bridge state:', error.message);
  }
}

calculateBridgeState(); 