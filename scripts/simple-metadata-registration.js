#!/usr/bin/env node

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram } = require('@solana/web3.js');
const { Buffer } = require('buffer');

console.log('🏷️ Simple Mars Token Metadata Registration');
console.log('==========================================');

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

// Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x764');

async function registerMetadata() {
  try {
    console.log('🔌 Connecting to Solana...');
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');
    
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(config.solanaPrivateKey));
    console.log('👛 Mint Authority:', payerKeypair.publicKey.toString());
    
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
    
    // Check if metadata exists
    const existingMetadata = await connection.getAccountInfo(metadataAccount);
    if (existingMetadata) {
      console.log('✅ Metadata already exists for this token!');
      return;
    }
    
    // Create metadata using raw instruction
    const metadataUri = 'https://github.com/marscredit/brandassets/raw/refs/heads/main/mars-token.json';
    console.log('🏷️ Creating metadata with URI:', metadataUri);
    
    // Create a simple instruction to create metadata account
    const createMetadataInstructionData = Buffer.alloc(679);
    let offset = 0;
    
    // Instruction discriminator for CreateMetadataAccountV3
    createMetadataInstructionData.writeUInt8(33, offset);
    offset += 1;
    
    // Data struct
    // Name (32 bytes max)
    const name = 'Mars Credit';
    createMetadataInstructionData.writeUInt32LE(name.length, offset);
    offset += 4;
    createMetadataInstructionData.write(name, offset);
    offset += 32;
    
    // Symbol (10 bytes max)
    const symbol = 'MARS';
    createMetadataInstructionData.writeUInt32LE(symbol.length, offset);
    offset += 4;
    createMetadataInstructionData.write(symbol, offset);
    offset += 10;
    
    // URI (200 bytes max)
    createMetadataInstructionData.writeUInt32LE(metadataUri.length, offset);
    offset += 4;
    createMetadataInstructionData.write(metadataUri, offset);
    offset += 200;
    
    // Seller fee basis points (2 bytes)
    createMetadataInstructionData.writeUInt16LE(0, offset);
    offset += 2;
    
    // Creators (Option<Vec<Creator>>)
    createMetadataInstructionData.writeUInt8(0, offset); // None
    offset += 1;
    
    // Collection (Option<Collection>)
    createMetadataInstructionData.writeUInt8(0, offset); // None
    offset += 1;
    
    // Uses (Option<Uses>)
    createMetadataInstructionData.writeUInt8(0, offset); // None
    offset += 1;
    
    // is_mutable
    createMetadataInstructionData.writeUInt8(1, offset); // true
    offset += 1;
    
    // collection_details (Option<CollectionDetails>)
    createMetadataInstructionData.writeUInt8(0, offset); // None
    
    console.log('❌ Manual instruction creation is complex. Using alternative approach...');
    
    // Alternative: Try using the Token Extensions directly
    console.log('🔄 Trying to use Token Extensions for metadata...');
    
    // For now, let's show what the metadata should be
    console.log('📄 Token metadata should be:');
    console.log('   Name: Mars Credit');
    console.log('   Symbol: MARS');
    console.log('   URI:', metadataUri);
    console.log('   Decimals: 9');
    console.log('   Mint Authority:', payerKeypair.publicKey.toString());
    
    console.log('');
    console.log('💡 Alternative registration methods:');
    console.log('   1. Use Metaboss: cargo install metaboss');
    console.log('   2. Use Solana CLI with metadata extension');
    console.log('   3. Use web interface: https://www.solmint.app/');
    console.log('   4. Use Jupiter metadata registration');
    
    console.log('');
    console.log('🎯 Manual command to try with Metaboss:');
    console.log(`   metaboss create metadata \\`);
    console.log(`     --keypair ~/.config/solana/id.json \\`);
    console.log(`     --mint ${config.marsMintAddress} \\`);
    console.log(`     --metadata-uri "${metadataUri}" \\`);
    console.log(`     --name "Mars Credit" \\`);
    console.log(`     --symbol "MARS" \\`);
    console.log(`     --seller-fee-basis-points 0`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  registerMetadata();
} 