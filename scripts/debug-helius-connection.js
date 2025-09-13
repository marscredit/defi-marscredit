#!/usr/bin/env node

const { Connection } = require('@solana/web3.js');
require('dotenv').config();

console.log('🔍 Helius Connection Debug Script');
console.log('=================================');
console.log('');

// Show environment variables
console.log('📝 Environment Variables:');
console.log('   SOLANA_RPC_URL:', process.env.SOLANA_RPC_URL || '❌ Missing');
console.log('   SOLANA_RPC_API_KEY:', process.env.SOLANA_RPC_API_KEY ? '✅ Set' : '❌ Missing');
console.log('');

async function testConnections() {
  // Test the exact URL from environment
  if (process.env.SOLANA_RPC_URL) {
    console.log('🔗 Testing environment SOLANA_RPC_URL...');
    console.log('   URL:', process.env.SOLANA_RPC_URL);
    
    try {
      const connection = new Connection(process.env.SOLANA_RPC_URL, { commitment: 'confirmed' });
      const slot = await connection.getSlot();
      console.log('   ✅ SUCCESS! Slot:', slot);
      console.log('   🎉 Helius API key is working in this environment!');
    } catch (error) {
      console.log('   ❌ FAILED:', error.message);
      console.log('   🔍 Error details:', JSON.stringify(error, null, 2));
    }
  } else {
    console.log('❌ SOLANA_RPC_URL not set in environment');
  }

  console.log('');

  // Test hardcoded URL as backup
  console.log('🔗 Testing hardcoded Helius URL...');
  const hardcodedUrl = 'https://mainnet.helius-rpc.com/?api-key=4766ce6f-d787-4a25-9198-8ab35bed3acd';
  console.log('   URL:', hardcodedUrl);

  try {
    const connection = new Connection(hardcodedUrl, { commitment: 'confirmed' });
    const slot = await connection.getSlot();
    console.log('   ✅ SUCCESS! Slot:', slot);
    console.log('   💡 Hardcoded URL works - environment variable issue');
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    console.log('   🔍 This suggests API key or network issue');
  }

  console.log('');

  // Test public RPC as fallback
  console.log('🔗 Testing public Solana RPC fallback...');
  try {
    const publicConnection = new Connection('https://api.mainnet-beta.solana.com', { commitment: 'confirmed' });
    const publicSlot = await publicConnection.getSlot();
    console.log('   ✅ Public RPC works! Slot:', publicSlot);
    console.log('   💡 Can use this as immediate fallback');
  } catch (publicError) {
    console.log('   ❌ Public RPC failed:', publicError.message);
  }
}

testConnections().catch(console.error);
