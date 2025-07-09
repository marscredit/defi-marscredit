#!/usr/bin/env node

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount } = require('@solana/spl-token');

async function mintMarsToUser() {
  console.log('🪙 Minting 10,000 MARS to User');
  console.log('==============================');
  
  // Load configuration from environment variables 
  const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
  const MARS_MINT = process.env.MARS_MINT_ADDRESS || 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b';
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || '3vk55mgyoNcA2xMtf4GjqBu1SdGUPVut7mBF6SSFKJwL';
  
  if (!RELAYER_PRIVATE_KEY) {
    console.error('❌ RELAYER_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }
  
  // Configuration
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const relayerWallet = Keypair.fromSecretKey(
    Buffer.from(RELAYER_PRIVATE_KEY.split(',').map(num => parseInt(num)))
  );
  const marsMint = new PublicKey(MARS_MINT);
  const recipient = new PublicKey(RECIPIENT_ADDRESS);
  
  console.log('🏦 Relayer Wallet:', relayerWallet.publicKey.toString());
  console.log('🎯 Recipient:', recipient.toString());
  console.log('🪙 MARS Mint:', marsMint.toString());
  
  // Check balances
  const solBalance = await connection.getBalance(relayerWallet.publicKey);
  console.log('💳 Relayer SOL Balance:', (solBalance / 1e9).toFixed(6), 'SOL');
  
  // Get associated token account
  const tokenAccount = await getAssociatedTokenAddress(marsMint, recipient);
  console.log('🏪 Token Account:', tokenAccount.toString());
  
  // Check if token account exists
  let tokenAccountExists = false;
  try {
    await getAccount(connection, tokenAccount);
    tokenAccountExists = true;
    console.log('✅ Token account already exists');
  } catch (error) {
    console.log('🔨 Token account needs to be created');
  }
  
  // Build transaction
  const transaction = new Transaction();
  
  // Create token account if needed
  if (!tokenAccountExists) {
    const createATAIx = createAssociatedTokenAccountInstruction(
      relayerWallet.publicKey, // payer
      tokenAccount,            // associated token account
      recipient,               // owner
      marsMint                 // mint
    );
    transaction.add(createATAIx);
    console.log('📝 Added: Create Associated Token Account instruction');
  }
  
  // Add mint instruction
  const amount = BigInt(10000 * 1e9); // 10,000 MARS with 9 decimals
  const mintIx = createMintToInstruction(
    marsMint,                // mint
    tokenAccount,            // destination
    relayerWallet.publicKey, // authority
    amount                   // amount
  );
  transaction.add(mintIx);
  console.log('📝 Added: Mint 10,000 MARS instruction');
  
  console.log('');
  console.log('📤 Sending transaction...');
  
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [relayerWallet],
      { commitment: 'confirmed' }
    );
    
    console.log('');
    console.log('🎉 SUCCESS! Your 10,000 MARS has been minted!');
    console.log('===============================================');
    console.log('✅ Transaction:', signature);
    console.log('🎯 Recipient:', recipient.toString());
    console.log('💰 Amount: 10,000 MARS');
    console.log('🏪 Token Account:', tokenAccount.toString());
    console.log('');
    console.log('🔍 View on Solscan:');
    console.log('   Transaction: https://solscan.io/tx/' + signature);
    console.log('   Token Account: https://solscan.io/account/' + tokenAccount.toString());
    console.log('   Recipient: https://solscan.io/account/' + recipient.toString());
    console.log('');
    console.log('💡 Your MARS tokens should now appear in your Solana wallet!');
    
  } catch (error) {
    console.error('❌ Transaction failed:', error.message);
    console.error('');
    console.error('📋 Error details:');
    if (error.logs) {
      error.logs.forEach(log => console.error('   ', log));
    }
    console.error('');
    console.error('💡 This might help:');
    console.error('   - Check if the MARS mint authority is correct');
    console.error('   - Verify Solana network status');
    console.error('   - Ensure sufficient SOL for transaction fees');
    process.exit(1);
  }
}

// Run the mint
mintMarsToUser().catch(console.error); 