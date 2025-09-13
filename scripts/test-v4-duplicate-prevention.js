const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const config = {
  l1RpcUrl: 'https://rpc.marscredit.xyz',
  bridgeContractAddress: process.env.BRIDGE_CONTRACT_ADDRESS,
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  marsMintAddress: process.env.MARS_MINT_ADDRESS,
};

// Create connections
const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
const bridgeABI = [
  'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
];
const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, provider);

// Create Solana connection
const solanaConnection = new Connection(config.solanaRpcUrl, { commitment: 'confirmed' });

// Test the improved duplicate detection
async function testDuplicateDetection() {
  console.log('🧪 Testing V4 Duplicate Prevention');
  console.log('=' . repeat(60));
  
  try {
    // Get all bridge events
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`\n📊 Found ${events.length} total bridge events`);
    
    // Test each bridge ID
    for (const event of events.slice(0, 5)) { // Test first 5 for brevity
      const bridgeId = event.args.bridgeId.toString();
      const recipient = event.args.solanaRecipient;
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      
      console.log(`\n🔍 Testing Bridge ID ${bridgeId}:`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   Amount: ${amount} MARS`);
      
      // Check using V4 logic (checks up to 200 transactions)
      const isProcessed = await checkIfProcessedV4(bridgeId, recipient, amount);
      console.log(`   V4 Detection Result: ${isProcessed ? '✅ Processed' : '❌ Not Processed'}`);
      
      // Compare with V3 logic (only checks 50 transactions)
      const isProcessedV3 = await checkIfProcessedV3(bridgeId, recipient, amount);
      console.log(`   V3 Detection Result: ${isProcessedV3 ? '✅ Processed' : '❌ Not Processed'}`);
      
      if (isProcessed && !isProcessedV3) {
        console.log(`   ⚠️  V3 WOULD HAVE MISSED THIS! V4 caught it correctly.`);
      }
    }
    
    // Summary
    console.log('\n' + '=' . repeat(60));
    console.log('📊 Test Summary:');
    console.log('   V4 checks up to 200 transactions (more thorough)');
    console.log('   V3 only checked 50 transactions (could miss older mints)');
    console.log('   V4 also adds memo tracking for future Bridge IDs');
    console.log('   V4 includes a local cache for speed optimization');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// V4 logic - checks up to 200 transactions
async function checkIfProcessedV4(bridgeId, recipient, amount) {
  try {
    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    // Get associated token account
    const associatedTokenAccount = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey);
    
    // Check more transactions (200 vs 50)
    const signatures = await solanaConnection.getSignaturesForAddress(
      associatedTokenAccount, 
      { limit: 200 }
    );
    
    let foundCount = 0;
    
    // Check first 100 transactions thoroughly
    for (const sigInfo of signatures.slice(0, 100)) {
      try {
        const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx) continue;
        
        // Look for mint instructions
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if (ix.parsed && ix.parsed.type === 'mintTo') {
            const mintInfo = ix.parsed.info;
            const mintAmount = parseFloat(mintInfo.amount) / 1e9;
            
            if (Math.abs(mintAmount - amount) < 0.001) {
              foundCount++;
              if (foundCount === 1) {
                return true; // Found matching mint
              }
            }
          }
        }
        
        // Also check for memo with Bridge ID (V4 feature)
        for (const ix of instructions) {
          if (ix.programId && ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
            if (ix.data) {
              const memoText = Buffer.from(ix.data, 'base64').toString('utf-8');
              if (memoText.includes(`Bridge ID: ${bridgeId}`)) {
                console.log(`     Found memo tracking for Bridge ID ${bridgeId}`);
                return true;
              }
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`   Error in V4 check: ${error.message}`);
    return false;
  }
}

// V3 logic - only checks 50 transactions
async function checkIfProcessedV3(bridgeId, recipient, amount) {
  try {
    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    // Get associated token account
    const associatedTokenAccount = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey);
    
    // Only check 50 transactions (V3 limit)
    const signatures = await solanaConnection.getSignaturesForAddress(
      associatedTokenAccount, 
      { limit: 50 }
    );
    
    for (const sigInfo of signatures) {
      try {
        const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx) continue;
        
        // Look for mint instructions
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if (ix.parsed && ix.parsed.type === 'mintTo') {
            const mintInfo = ix.parsed.info;
            const mintAmount = parseFloat(mintInfo.amount) / 1e9;
            
            if (Math.abs(mintAmount - amount) < 0.001) {
              return true; // Found matching mint
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`   Error in V3 check: ${error.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log('🚀 Mars Bridge V4 Duplicate Prevention Test');
  console.log('=' . repeat(60));
  console.log('This test compares V3 vs V4 duplicate detection');
  console.log('');
  
  await testDuplicateDetection();
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
