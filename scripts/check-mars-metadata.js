#!/usr/bin/env node

const { Connection, PublicKey } = require('@solana/web3.js');
const { MPL_TOKEN_METADATA_PROGRAM_ID } = require('@metaplex-foundation/mpl-token-metadata');

console.log('🔍 Checking Mars Token Metadata Status');
console.log('======================================');

// Configuration
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  marsMintAddress: process.env.MARS_MINT_ADDRESS || 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b',
};

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

async function checkMetadata() {
  try {
    // Connect to Solana
    console.log('🔌 Connecting to Solana...');
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');
    
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
    
    // Check if metadata exists
    try {
      const existingMetadata = await connection.getAccountInfo(metadataAccount);
      if (existingMetadata) {
        console.log('✅ Metadata EXISTS for this token!');
        console.log('   Account Size:', existingMetadata.data.length, 'bytes');
        console.log('   Owner:', existingMetadata.owner.toString());
        console.log('   Executable:', existingMetadata.executable);
        console.log('   Rent Epoch:', existingMetadata.rentEpoch);
        console.log('');
        console.log('🎉 MARS token metadata is already registered!');
        console.log('📊 View on Solscan: https://solscan.io/token/' + mintPubkey.toString());
        return true;
      } else {
        console.log('❌ Metadata does NOT exist for this token');
        console.log('   Registration needed to make token appear in wallets');
        return false;
      }
    } catch (error) {
      console.log('❌ Error checking metadata:', error.message);
      console.log('   This likely means metadata does not exist');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

if (require.main === module) {
  checkMetadata().then((exists) => {
    if (!exists) {
      console.log('');
      console.log('💡 To register metadata, set up your environment:');
      console.log('   export SOLANA_PRIVATE_KEY="[your_private_key_as_json_array]"');
      console.log('   node scripts/register-mars-metadata.js');
    }
  }).catch(console.error);
} 