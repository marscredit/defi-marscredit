#!/usr/bin/env node

const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY
} = require('@solana/web3.js');
const { 
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID 
} = require('@metaplex-foundation/mpl-token-metadata');

console.log('🏷️  Adding Token Metadata to MARS');
console.log('=================================');

// Configuration
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ? 
    JSON.parse(process.env.SOLANA_PRIVATE_KEY) : 
    [155,171,247,212,37,199,222,84,239,121,126,211,47,58,211,70,78,197,121,59,120,141,228,188,58,129,26,189,62,198,5,120,189,211,191,106,228,136,171,154,143,153,202,219,35,33,170,75,11,231,13,145,226,159,162,3,99,36,129,102,247,105,139,147],
  marsMintAddress: process.env.MARS_MINT_ADDRESS || 'A9jPcpg7zUVtcNgs3GQS88BrLNiBnNxw1kwX3JRJrsw8'
};

// Token metadata
const tokenMetadata = {
  name: 'MARS',
  symbol: 'MARS',
  description: 'The native token of Mars Credit Network, bridged to Solana for DeFi use.',
  image: 'https://defi.marscredit.xyz/mars-logo.png', // You can update this URL
  external_url: 'https://marscredit.xyz',
  properties: {
    category: 'currency',
    creators: []
  }
};

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
    try {
      const existingMetadata = await solanaConnection.getAccountInfo(metadataAccount);
      if (existingMetadata) {
        console.log('⚠️  Metadata account already exists!');
        console.log('   This token already has metadata. Skipping creation...');
        return;
      }
    } catch (error) {
      console.log('✅ No existing metadata found, proceeding with creation...');
    }
    
    // Create metadata instruction
    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAccount,
        mint: mintPubkey,
        mintAuthority: solanaWallet.publicKey,
        payer: solanaWallet.publicKey,
        updateAuthority: solanaWallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            uri: '', // We'll set this if you want to host metadata JSON
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    );
    
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
    console.log('   Name:', tokenMetadata.name);
    console.log('   Symbol:', tokenMetadata.symbol);
    console.log('   Description:', tokenMetadata.description);
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
      console.log('   The token may already have metadata set up.');
    } else if (error.message.includes('insufficient funds')) {
      console.log('💡 Insufficient SOL for transaction fees.');
      console.log('   Need ~0.01 SOL for metadata creation.');
    }
    
    throw error;
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
  await addTokenMetadata();
  
  // Verify
  console.log('\n🔍 Verifying metadata creation...');
  await checkTokenMetadata();
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Token should now display as "MARS" in wallets');
  console.log('   2. DEXs like Jupiter will show proper name/symbol');
  console.log('   3. Consider uploading metadata JSON for richer data');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 