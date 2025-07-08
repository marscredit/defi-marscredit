#!/usr/bin/env node

const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  sendAndConfirmTransaction, 
  SystemProgram,
  TransactionInstruction
} = require('@solana/web3.js');

console.log('🏷️ Mars Token Metadata Registration (Raw Instructions)');
console.log('====================================================');

// Configuration
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ? 
    JSON.parse(process.env.SOLANA_PRIVATE_KEY) : 
    null,
  marsMintAddress: process.env.MARS_MINT_ADDRESS || 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b',
};

// Validate configuration
if (!config.solanaPrivateKey) {
  console.error('❌ Missing SOLANA_PRIVATE_KEY environment variable');
  process.exit(1);
}

// Token Metadata Program ID (Metaplex)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

async function registerMetadata() {
  try {
    // Connect to Solana
    console.log('🔌 Connecting to Solana...');
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');
    
    // Create keypair from private key
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(config.solanaPrivateKey));
    console.log('👛 Payer/Authority:', payerKeypair.publicKey.toString());
    
    // MARS mint address
    const mintPubkey = new PublicKey(config.marsMintAddress);
    console.log('🪙 MARS Mint:', mintPubkey.toString());
    
    // Calculate metadata account address
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    
    console.log('📝 Metadata Account:', metadataAccount.toString());
    
    // Check if metadata already exists
    const existingMetadata = await connection.getAccountInfo(metadataAccount);
    if (existingMetadata) {
      console.log('✅ Metadata already exists for this token!');
      console.log('📊 View on Solscan: https://solscan.io/token/' + mintPubkey.toString());
      return;
    }
    
    console.log('🏷️ Creating metadata account...');
    
    // Create metadata instruction data
    const metadataUri = 'https://github.com/marscredit/brandassets/raw/refs/heads/main/mars-token.json';
    const name = 'Mars Credit';
    const symbol = 'MARS';
    
    // Build instruction data for CreateMetadataAccountV3
    const instructionData = Buffer.alloc(1000); // Allocate enough space
    let offset = 0;
    
    // Instruction discriminator for CreateMetadataAccountV3 (33 = 0x21)
    instructionData.writeUInt8(33, offset);
    offset += 1;
    
    // DataV2 struct
    // Name length and data
    instructionData.writeUInt32LE(name.length, offset);
    offset += 4;
    instructionData.write(name, offset);
    offset += name.length;
    
    // Symbol length and data  
    instructionData.writeUInt32LE(symbol.length, offset);
    offset += 4;
    instructionData.write(symbol, offset);
    offset += symbol.length;
    
    // URI length and data
    instructionData.writeUInt32LE(metadataUri.length, offset);
    offset += 4;
    instructionData.write(metadataUri, offset);
    offset += metadataUri.length;
    
    // Seller fee basis points (u16)
    instructionData.writeUInt16LE(0, offset);
    offset += 2;
    
    // Creators (Option<Vec<Creator>>) - None
    instructionData.writeUInt8(0, offset);
    offset += 1;
    
    // Collection (Option<Collection>) - None
    instructionData.writeUInt8(0, offset);
    offset += 1;
    
    // Uses (Option<Uses>) - None
    instructionData.writeUInt8(0, offset);
    offset += 1;
    
    // Additional fields for V3
    // is_mutable (bool)
    instructionData.writeUInt8(1, offset);
    offset += 1;
    
    // collection_details (Option<CollectionDetails>) - None
    instructionData.writeUInt8(0, offset);
    offset += 1;
    
    // Trim the buffer to actual size
    const finalInstructionData = instructionData.slice(0, offset);
    
    // Create instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      programId: TOKEN_METADATA_PROGRAM_ID,
      data: finalInstructionData,
    });
    
    console.log('📦 Instruction data size:', finalInstructionData.length);
    console.log('📤 Sending transaction...');
    
    // Create and send transaction
    const transaction = new Transaction().add(instruction);
    
    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payerKeypair],
        {
          commitment: 'confirmed',
        }
      );
      
      console.log('✅ Metadata registered successfully!');
      console.log('   Transaction:', signature);
      console.log('   Metadata Account:', metadataAccount.toString());
      console.log('');
      console.log('🎉 MARS token now has proper metadata and should appear in wallets!');
      console.log('📊 View on Solscan: https://solscan.io/token/' + mintPubkey.toString());
      
    } catch (error) {
      console.error('❌ Transaction failed:', error.message);
      if (error.logs) {
        console.error('📜 Transaction logs:');
        error.logs.forEach(log => console.error('   ', log));
      }
      
      // Try alternative approach - maybe we need to use a different method
      console.log('');
      console.log('💡 Alternative approaches:');
      console.log('   1. Use Jupiter Token List submission');
      console.log('   2. Use Phantom wallet metadata update');
      console.log('   3. Use Solflare wallet metadata update');
      console.log('   4. Contact exchanges directly');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  registerMetadata();
} 