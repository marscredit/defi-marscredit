#!/usr/bin/env node

const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction
} = require('@solana/web3.js');

console.log('🏷️  Adding Simple Token Metadata to MARS');
console.log('========================================');

// Configuration
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ? 
    JSON.parse(process.env.SOLANA_PRIVATE_KEY) : 
    [155,171,247,212,37,199,222,84,239,121,126,211,47,58,211,70,78,197,121,59,120,141,228,188,58,129,26,189,62,198,5,120,189,211,191,106,228,136,171,154,143,153,202,219,35,33,170,75,11,231,13,145,226,159,162,3,99,36,129,102,247,105,139,147],
  marsMintAddress: process.env.MARS_MINT_ADDRESS || 'A9jPcpg7zUVtcNgs3GQS88BrLNiBnNxw1kwX3JRJrsw8'
};

// Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Initialize connection
const solanaConnection = new Connection(config.solanaRpcUrl, 'confirmed');
const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));

// Derive metadata account address
function getMetadataAccount(mint) {
  const [metadataAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer()
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return metadataAccount;
}

// Create metadata instruction data
function createMetadataInstructionData() {
  const name = 'MARS';
  const symbol = 'MARS';
  const uri = ''; // Empty URI for now
  
  // Instruction discriminator for CreateMetadataAccountV3
  const discriminator = Buffer.from([33, 169, 136, 87, 188, 221, 26, 156]);
  
  // Encode the metadata
  const nameBytes = Buffer.from(name, 'utf8');
  const symbolBytes = Buffer.from(symbol, 'utf8');
  const uriBytes = Buffer.from(uri, 'utf8');
  
  // Create the instruction data (simplified version)
  const instructionData = Buffer.concat([
    discriminator,
    Buffer.from([
      // Data struct
      nameBytes.length, 0, 0, 0, // name length (u32)
    ]),
    nameBytes,
    Buffer.from([
      symbolBytes.length, 0, 0, 0, // symbol length (u32)
    ]),
    symbolBytes,
    Buffer.from([
      uriBytes.length, 0, 0, 0, // uri length (u32)
    ]),
    uriBytes,
    Buffer.from([
      0, 0, // seller_fee_basis_points (u16)
      0, // creators option (None)
      1, // is_mutable (true)
      0, // collection option (None)
      0, // uses option (None)
      0, // collection_details option (None)
    ])
  ]);
  
  return instructionData;
}

async function checkSOLBalance() {
  const balance = await solanaConnection.getBalance(solanaWallet.publicKey);
  const balanceSOL = balance / 1e9;
  console.log(`💰 SOL Balance: ${balanceSOL.toFixed(6)} SOL`);
  
  if (balanceSOL < 0.01) {
    console.log('⚠️  Low SOL balance. Need at least 0.01 SOL for metadata creation.');
    return false;
  }
  return true;
}

async function addTokenMetadata() {
  console.log('🔧 Setting up token metadata...');
  
  try {
    const mintPubkey = new PublicKey(config.marsMintAddress);
    const metadataAccount = getMetadataAccount(mintPubkey);
    
    console.log('📍 Addresses:');
    console.log('   Mint:', mintPubkey.toString());
    console.log('   Metadata Account:', metadataAccount.toString());
    console.log('   Update Authority:', solanaWallet.publicKey.toString());
    
    // Check if metadata already exists
    const existingMetadata = await solanaConnection.getAccountInfo(metadataAccount);
    if (existingMetadata) {
      console.log('⚠️  Metadata account already exists!');
      console.log('   This token already has metadata. Skipping creation...');
      return;
    }
    
    // Check SOL balance
    const hasBalance = await checkSOLBalance();
    if (!hasBalance) {
      throw new Error('Insufficient SOL balance');
    }
    
    // Create the instruction using direct program call
    const instructionData = createMetadataInstructionData();
    
    const createMetadataInstruction = new TransactionInstruction({
      keys: [
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: solanaWallet.publicKey, isSigner: true, isWritable: false }, // mint authority
        { pubkey: solanaWallet.publicKey, isSigner: true, isWritable: true }, // payer
        { pubkey: solanaWallet.publicKey, isSigner: false, isWritable: false }, // update authority
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: TOKEN_METADATA_PROGRAM_ID,
      data: instructionData,
    });
    
    // Create transaction
    const transaction = new Transaction().add(createMetadataInstruction);
    
    console.log('📝 Creating metadata transaction...');
    
    // Send transaction
    const signature = await sendAndConfirmTransaction(
      solanaConnection,
      transaction,
      [solanaWallet],
      {
        commitment: 'confirmed',
      }
    );
    
    console.log('✅ Token metadata created successfully!');
    console.log('📋 Details:');
    console.log('   Name: MARS');
    console.log('   Symbol: MARS');
    console.log('   Mint Address:', mintPubkey.toString());
    console.log('   Metadata Account:', metadataAccount.toString());
    console.log('   Transaction:', signature);
    
    console.log('\n🎉 MARS token now has proper metadata!');
    console.log('   It should now show up as "MARS" in wallets and DEXs.');
    
    return signature;
  } catch (error) {
    console.error('❌ Failed to create token metadata:', error);
    
    // More specific error handling
    if (error.message.includes('custom program error: 0x0')) {
      console.log('💡 This error usually means the metadata account already exists.');
    } else if (error.message.includes('insufficient funds')) {
      console.log('💡 Insufficient SOL for transaction fees.');
    } else if (error.message.includes('Instruction index: 0')) {
      console.log('💡 Token Metadata program instruction failed.');
      console.log('   This might be due to incorrect instruction format.');
    }
    
    return null;
  }
}

async function checkTokenMetadata() {
  console.log('\n🔍 Checking current token metadata...');
  
  try {
    const mintPubkey = new PublicKey(config.marsMintAddress);
    const metadataAccount = getMetadataAccount(mintPubkey);
    
    const metadataInfo = await solanaConnection.getAccountInfo(metadataAccount);
    
    if (metadataInfo) {
      console.log('✅ Metadata account exists');
      console.log('   Address:', metadataAccount.toString());
      console.log('   Data length:', metadataInfo.data.length, 'bytes');
      console.log('   Owner:', metadataInfo.owner.toString());
      
      if (metadataInfo.owner.toString() === TOKEN_METADATA_PROGRAM_ID.toString()) {
        console.log('   ✅ Owned by Token Metadata Program');
      } else {
        console.log('   ⚠️  Unexpected owner');
      }
    } else {
      console.log('❌ No metadata account found');
      console.log('   The token does not have metadata yet');
    }
    
    return !!metadataInfo;
  } catch (error) {
    console.error('❌ Error checking metadata:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting metadata setup for MARS token...');
  console.log('   Mint Address:', config.marsMintAddress);
  console.log('   Authority:', solanaWallet.publicKey.toString());
  
  // Check current status
  const hasMetadata = await checkTokenMetadata();
  
  if (hasMetadata) {
    console.log('\n✅ Token already has metadata! No action needed.');
    return;
  }
  
  // Add metadata
  console.log('\n🔧 Attempting to add metadata...');
  const result = await addTokenMetadata();
  
  if (result) {
    // Verify
    console.log('\n🔍 Verifying metadata creation...');
    await checkTokenMetadata();
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Token should now display as "MARS" in wallets');
    console.log('   2. DEXs like Jupiter will show proper name/symbol');
  } else {
    console.log('\n⚠️  Metadata creation failed. The token will show up without a name/symbol.');
    console.log('   You can try using the Solana CLI or other tools to add metadata later.');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 