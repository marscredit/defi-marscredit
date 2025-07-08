#!/usr/bin/env node

const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const { 
  createMint,
  getMint
} = require('@solana/spl-token');

console.log('🪙 Creating New MARS Token (9 Decimals)');
console.log('=======================================');

// Configuration
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ? 
    JSON.parse(process.env.SOLANA_PRIVATE_KEY) : 
    [155,171,247,212,37,199,222,84,239,121,126,211,47,58,211,70,78,197,121,59,120,141,228,188,58,129,26,189,62,198,5,120,189,211,191,106,228,136,171,154,143,153,202,219,35,33,170,75,11,231,13,145,226,159,162,3,99,36,129,102,247,105,139,147]
};

// Initialize connection
const solanaConnection = new Connection(config.solanaRpcUrl, 'confirmed');
const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));

async function checkSOLBalance() {
  const balance = await solanaConnection.getBalance(solanaWallet.publicKey);
  const balanceSOL = balance / 1e9;
  console.log(`💰 SOL Balance: ${balanceSOL.toFixed(6)} SOL`);
  
  if (balanceSOL < 0.02) {
    console.log('⚠️  Low SOL balance. Need at least 0.02 SOL for token creation.');
    return false;
  }
  return true;
}

async function createNewMarsToken() {
  console.log('🔧 Creating new MARS token with 9 decimals...');
  
  try {
    // Check SOL balance
    const hasBalance = await checkSOLBalance();
    if (!hasBalance) {
      throw new Error('Insufficient SOL balance');
    }
    
    console.log('📍 Configuration:');
    console.log('   Decimals: 9 (allows ~18 billion MARS max)');
    console.log('   Mint Authority:', solanaWallet.publicKey.toString());
    console.log('   Freeze Authority: None');
    
    // Create new mint with 9 decimals
    const newMintAddress = await createMint(
      solanaConnection,
      solanaWallet, // Payer
      solanaWallet.publicKey, // Mint authority
      null, // Freeze authority (none)
      9 // Decimals
    );
    
    console.log('✅ New MARS token created successfully!');
    console.log('📋 New Token Details:');
    console.log('   Mint Address:', newMintAddress.toString());
    console.log('   Decimals: 9');
    console.log('   Max Supply: ~18.4 billion MARS');
    console.log('   Mint Authority:', solanaWallet.publicKey.toString());
    
    // Get mint info to verify
    const mintInfo = await getMint(solanaConnection, newMintAddress);
    console.log('✅ Verification:');
    console.log('   Current Supply:', mintInfo.supply.toString(), '(should be 0)');
    console.log('   Decimals:', mintInfo.decimals);
    console.log('   Mint Authority:', mintInfo.mintAuthority?.toString());
    console.log('   Freeze Authority:', mintInfo.freezeAuthority?.toString() || 'None');
    
    console.log('\n🔄 Next Steps:');
    console.log('   1. Update bridge configuration to use new mint address');
    console.log('   2. Update frontend to use new mint address');
    console.log('   3. Process pending bridge transactions with new token');
    
    console.log('\n📝 Configuration Update:');
    console.log('   OLD_MARS_MINT_ADDRESS=A9jPcpg7zUVtcNgs3GQS88BrLNiBnNxw1kwX3JRJrsw8');
    console.log('   NEW_MARS_MINT_ADDRESS=' + newMintAddress.toString());
    
    return newMintAddress;
  } catch (error) {
    console.error('❌ Failed to create new MARS token:', error.message);
    throw error;
  }
}

async function compareTokens() {
  console.log('\n📊 Token Comparison:');
  
  try {
    // Old token
    const oldMint = new PublicKey('A9jPcpg7zUVtcNgs3GQS88BrLNiBnNxw1kwX3JRJrsw8');
    const oldMintInfo = await getMint(solanaConnection, oldMint);
    
    console.log('📛 Old MARS Token (FULL):');
    console.log('   Address:', oldMint.toString());
    console.log('   Decimals:', oldMintInfo.decimals);
    console.log('   Current Supply:', (Number(oldMintInfo.supply) / Math.pow(10, oldMintInfo.decimals)).toFixed(6), 'MARS');
    console.log('   Max Capacity: ~18 MARS');
    console.log('   Status: ⚠️  MAXED OUT');
    
  } catch (error) {
    console.error('❌ Error checking old token:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting new MARS token creation...');
  console.log('   Authority:', solanaWallet.publicKey.toString());
  
  // Show comparison
  await compareTokens();
  
  // Create new token
  const newMintAddress = await createNewMarsToken();
  
  console.log('\n🎉 New MARS token ready for bridging!');
  console.log('   Use this mint address in your bridge configuration.');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 