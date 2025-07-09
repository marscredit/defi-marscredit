#!/usr/bin/env node

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram } = require('@solana/web3.js');
const { createAccount, createMintToInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

console.log('🎯 Simple MARS Transfer (Alternative Approach)');
console.log('===============================================');

async function transferMarsAlternative() {
  // Load configuration from environment variables
  const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
  const MARS_MINT = process.env.MARS_MINT || 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b';
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || '3vk55mgyoNcA2xMtf4GjqBu1SdGUPVut7mBF6SSFKJwL';
  
  if (!RELAYER_PRIVATE_KEY) {
    console.error('❌ RELAYER_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }
  
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const relayerWallet = Keypair.fromSecretKey(
    Buffer.from(RELAYER_PRIVATE_KEY.split(',').map(num => parseInt(num)))
  );
  const marsMint = new PublicKey(MARS_MINT);
  const recipient = new PublicKey(RECIPIENT_ADDRESS);
  
  console.log('🏦 Relayer:', relayerWallet.publicKey.toString());
  console.log('🎯 Recipient:', recipient.toString());
  console.log('🪙 MARS Mint:', marsMint.toString());
  
  try {
    // Check relayer balance
    const balance = await connection.getBalance(relayerWallet.publicKey);
    console.log('💳 Relayer SOL:', (balance / 1e9).toFixed(6), 'SOL');
    
    if (balance < 10000000) { // 0.01 SOL minimum
      console.error('❌ Insufficient SOL for transaction fees');
      return;
    }
    
    // Create a new token account owned by the recipient
    console.log('🔨 Creating new token account...');
    
    const newTokenAccount = Keypair.generate();
    const rent = await connection.getMinimumBalanceForRentExemption(165); // Token account size
    
    const transaction = new Transaction();
    
    // Create account instruction
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: relayerWallet.publicKey,
        newAccountPubkey: newTokenAccount.publicKey,
        space: 165, // Token account size
        lamports: rent,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize account instruction  
    transaction.add(
      createInitializeAccountInstruction(
        newTokenAccount.publicKey,
        marsMint,
        recipient,
        TOKEN_PROGRAM_ID
      )
    );
    
    // Mint instruction
    const amount = BigInt(10000 * 1e9);
    transaction.add(
      createMintToInstruction(
        marsMint,
        newTokenAccount.publicKey,
        relayerWallet.publicKey,
        amount,
        TOKEN_PROGRAM_ID
      )
    );
    
    console.log('📤 Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [relayerWallet, newTokenAccount],
      { commitment: 'confirmed' }
    );
    
    console.log('');
    console.log('🎉 SUCCESS! 10,000 MARS transferred!');
    console.log('✅ Transaction:', signature);
    console.log('🏪 Token Account:', newTokenAccount.publicKey.toString());
    console.log('👤 Owner:', recipient.toString());
    console.log('💰 Amount: 10,000 MARS');
    console.log('');
    console.log('🔍 View on Solscan:');
    console.log('   https://solscan.io/tx/' + signature);
    console.log('   https://solscan.io/account/' + newTokenAccount.publicKey.toString());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Helper function for initialize account instruction
function createInitializeAccountInstruction(account, mint, owner, programId) {
  const keys = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
  ];
  
  const data = Buffer.from([1]); // InitializeAccount instruction
  
  return {
    keys,
    programId,
    data,
  };
}

transferMarsAlternative(); 