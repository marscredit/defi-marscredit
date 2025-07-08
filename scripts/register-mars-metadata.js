#!/usr/bin/env node

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram } = require('@solana/web3.js');
const { createMetadataAccountV3, MPL_TOKEN_METADATA_PROGRAM_ID } = require('@metaplex-foundation/mpl-token-metadata');

console.log('🏷️ Mars Token Metadata Registration');
console.log('=====================================');

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
  console.error('   Please set your Solana private key as a JSON array');
  process.exit(1);
}

// Use the imported constant from the library
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

async function registerMetadata() {
  try {
    // Connect to Solana
    console.log('🔌 Connecting to Solana...');
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');
    
    // Create keypair from private key
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(config.solanaPrivateKey));
    console.log('👛 Mint Authority:', payerKeypair.publicKey.toString());
    
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
    try {
      const existingMetadata = await connection.getAccountInfo(metadataAccount);
      if (existingMetadata) {
        console.log('ℹ️ Metadata already exists for this token');
        console.log('✅ Token metadata is already registered!');
        return;
      }
    } catch (error) {
      // Metadata doesn't exist yet, which is expected
    }
    
    // Token metadata
    const metadataData = {
      name: 'Mars Credit',
      symbol: 'MARS',
      uri: 'https://marscredit.xyz/metadata/mars-token.json',
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    };
    
    console.log('🏷️ Creating metadata...');
    console.log('   Name:', metadataData.name);
    console.log('   Symbol:', metadataData.symbol);
    console.log('   URI:', metadataData.uri);
    
    // Create metadata instruction using the simpler API
    const createMetadataInstruction = createMetadataAccountV3(
      {
        metadata: metadataAccount,
        mint: mintPubkey,
        mintAuthority: payerKeypair.publicKey,
        payer: payerKeypair.publicKey,
        updateAuthority: payerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        rent: null,
      },
      {
        data: metadataData,
        isMutable: true,
        collectionDetails: null,
      }
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(createMetadataInstruction);
    
    console.log('📤 Sending metadata transaction...');
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
    console.error('❌ Error registering metadata:', error.message);
    if (error.logs) {
      console.error('📜 Transaction logs:', error.logs);
    }
    process.exit(1);
  }
}

// Create metadata JSON file
async function createMetadataJson() {
  const metadataJson = {
    name: 'Mars Credit',
    symbol: 'MARS',
    description: 'Mars Credit (MARS) is the native token of the Mars Credit ecosystem, bridging L1 and Solana networks for seamless DeFi experiences.',
    image: 'https://marscredit.xyz/images/mars-token-logo.png',
    attributes: [
      {
        trait_type: 'Network',
        value: 'Multi-chain'
      },
      {
        trait_type: 'Type',
        value: 'Utility Token'
      },
      {
        trait_type: 'Decimals',
        value: 9
      },
      {
        trait_type: 'Bridge Enabled',
        value: 'Yes'
      }
    ],
    properties: {
      category: 'fungible',
      files: [
        {
          uri: 'https://marscredit.xyz/images/mars-token-logo.png',
          type: 'image/png'
        }
      ]
    },
    external_url: 'https://marscredit.xyz',
    animation_url: null
  };
  
  console.log('📄 Metadata JSON structure:');
  console.log(JSON.stringify(metadataJson, null, 2));
  console.log('');
  console.log('ℹ️ Upload this JSON to: https://marscredit.xyz/metadata/mars-token.json');
}

// Run the registration
async function main() {
  await createMetadataJson();
  await registerMetadata();
}

if (require.main === module) {
  main().catch(console.error);
} 