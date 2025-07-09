#!/usr/bin/env node

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction } = require('@solana/spl-token');

console.log('🚑 Mars Bridge Transaction Rescue');
console.log('==================================');

// Your specific transaction details
const RESCUE_DATA = {
  recipient: '3vk55mgyoNcA2xMtf4GjqBu1SdGUPVut7mBF6SSFKJwL',
  amount: 10000, // MARS tokens
  bridgeId: 4,
  l1TxHash: '0xe2b66b547dabc12d8df3fea8b05ca747beeffb88f888b79430858a35d9365264'
};

// Configuration from environment variables (matching Railway config)
const config = {
  solanaRpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  marsMintAddress: process.env.MARS_MINT_ADDRESS || 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b',
  solanaPrivateKey: process.env.RELAYER_PRIVATE_KEY
};

async function rescueTransaction() {
  try {
    console.log('🔧 Initializing rescue operation...');
    
    // Check environment variables
    if (!config.solanaPrivateKey) {
      console.error('❌ RELAYER_PRIVATE_KEY environment variable is required');
      process.exit(1);
    }
    
    // Initialize Solana connection
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');
    const relayerWallet = Keypair.fromSecretKey(
      Buffer.from(config.solanaPrivateKey.split(',').map(num => parseInt(num)))
    );
    const marsMint = new PublicKey(config.marsMintAddress);
    const recipient = new PublicKey(RESCUE_DATA.recipient);
    
    console.log('🏦 Relayer Wallet:', relayerWallet.publicKey.toString());
    console.log('🎯 Recipient:', RESCUE_DATA.recipient);
    console.log('💰 Amount:', RESCUE_DATA.amount, 'MARS');
    
    // Check relayer balance
    const balance = await connection.getBalance(relayerWallet.publicKey);
    const solBalance = balance / 1e9;
    console.log('💳 Relayer SOL Balance:', solBalance.toFixed(6), 'SOL');
    
    if (solBalance < 0.01) {
      console.error('❌ Insufficient SOL balance!');
      console.error('   Please send at least 0.1 SOL to:', relayerWallet.publicKey.toString());
      console.error('   Current balance:', solBalance.toFixed(6), 'SOL');
      process.exit(1);
    }
    
    // Get or create associated token account
    const tokenAccount = await getAssociatedTokenAddress(marsMint, recipient);
    console.log('🪙 Token Account:', tokenAccount.toString());
    
    // Check if token account exists
    const accountInfo = await connection.getAccountInfo(tokenAccount);
    
    // Build transaction
    const transaction = new Transaction();
    
    // Create token account if it doesn't exist
    if (!accountInfo) {
      console.log('🔨 Creating token account...');
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        relayerWallet.publicKey, // payer
        tokenAccount, // associated token account
        recipient, // owner
        marsMint // mint
      );
      transaction.add(createATAInstruction);
    } else {
      console.log('✅ Token account already exists');
    }
    
    // Add mint instruction
    const amount = BigInt(RESCUE_DATA.amount * 1e9); // Convert to lamports with 9 decimals
    console.log('🪙 Minting amount:', amount.toString(), 'lamports');
    
    const mintInstruction = createMintToInstruction(
      marsMint, // mint
      tokenAccount, // destination
      relayerWallet.publicKey, // authority
      amount // amount
    );
    
    transaction.add(mintInstruction);
    
    console.log('📤 Sending rescue transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [relayerWallet],
      { commitment: 'confirmed' }
    );
    
    console.log('');
    console.log('🎉 SUCCESS! Your MARS tokens have been rescued!');
    console.log('✅ Transaction:', signature);
    console.log('💰 Amount:', RESCUE_DATA.amount, 'MARS');
    console.log('🎯 Recipient:', RESCUE_DATA.recipient);
    console.log('🔗 Original L1 TX:', RESCUE_DATA.l1TxHash);
    console.log('');
    console.log('🔍 View on Solscan:');
    console.log('   https://solscan.io/tx/' + signature);
    console.log('');
    console.log('💡 Your tokens should now appear in your Solana wallet!');
    
  } catch (error) {
    console.error('❌ Rescue failed:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Ensure relayer wallet has at least 0.1 SOL');
    console.error('   2. Check Solana network status');
    console.error('   3. Verify recipient address is valid');
    console.error('   4. Try again in a few minutes');
    process.exit(1);
  }
}

// Run rescue
if (require.main === module) {
  rescueTransaction();
} 