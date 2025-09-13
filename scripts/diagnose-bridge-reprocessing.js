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

// Create Solana connection with API key if available
let solanaConnection;
const solanaApiKey = process.env.SOLANA_RPC_API_KEY;

if (solanaApiKey && config.solanaRpcUrl.includes('helius-rpc.com')) {
  console.log('🔑 Using Helius API key for Solana connection');
  solanaConnection = new Connection(config.solanaRpcUrl, { commitment: 'confirmed' });
} else {
  console.log('🔗 Using Solana RPC:', config.solanaRpcUrl);
  solanaConnection = new Connection(config.solanaRpcUrl, { commitment: 'confirmed' });
}

async function diagnoseBridgeId(targetBridgeId) {
  console.log(`\n🔍 Diagnosing Bridge ID ${targetBridgeId}:`);
  console.log('=' . repeat(60));
  
  try {
    // 1. Get L1 bridge event details
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    let bridgeEvent = null;
    for (const event of events) {
      if (event.args.bridgeId.toString() === targetBridgeId.toString()) {
        bridgeEvent = event;
        break;
      }
    }
    
    if (!bridgeEvent) {
      console.log('❌ Bridge ID not found in L1 events');
      return;
    }
    
    // Display L1 details
    console.log('\n📊 L1 Bridge Details:');
    console.log(`   Bridge ID: ${bridgeEvent.args.bridgeId.toString()}`);
    console.log(`   User: ${bridgeEvent.args.user}`);
    console.log(`   Amount: ${ethers.formatEther(bridgeEvent.args.amount)} MARS`);
    console.log(`   Solana Recipient: ${bridgeEvent.args.solanaRecipient}`);
    console.log(`   L1 Tx Hash: ${bridgeEvent.transactionHash}`);
    console.log(`   Block Number: ${bridgeEvent.blockNumber}`);
    
    // Get current block for confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - bridgeEvent.blockNumber;
    console.log(`   Confirmations: ${confirmations}`);
    
    // 2. Check Solana side
    console.log('\n🔍 Checking Solana for minting evidence...');
    const recipient = bridgeEvent.args.solanaRecipient;
    const amount = parseFloat(ethers.formatEther(bridgeEvent.args.amount));
    
    try {
      const recipientPubkey = new PublicKey(recipient);
      const mintPubkey = new PublicKey(config.marsMintAddress);
      
      // Get associated token account
      const associatedTokenAccount = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey);
      
      // Get ALL transactions for this token account (not just 50)
      console.log(`   Fetching transaction history for ${recipient.substring(0, 8)}...`);
      
      let allSignatures = [];
      let before = null;
      let hasMore = true;
      
      // Fetch all signatures in batches
      while (hasMore) {
        const options = { limit: 1000 };
        if (before) options.before = before;
        
        const batch = await solanaConnection.getSignaturesForAddress(
          associatedTokenAccount, 
          options
        );
        
        if (batch.length === 0) {
          hasMore = false;
        } else {
          allSignatures = allSignatures.concat(batch);
          before = batch[batch.length - 1].signature;
          
          // Limit total signatures to check (for performance)
          if (allSignatures.length >= 5000) {
            console.log(`   ⚠️  Limiting search to first 5000 transactions`);
            break;
          }
        }
      }
      
      console.log(`   Found ${allSignatures.length} total transactions for recipient`);
      
      // Look for mint transactions matching the amount
      let matchingMints = [];
      let checkedCount = 0;
      
      for (const sigInfo of allSignatures) {
        checkedCount++;
        if (checkedCount % 100 === 0) {
          console.log(`   Checked ${checkedCount}/${allSignatures.length} transactions...`);
        }
        
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
              const mintAmount = parseFloat(mintInfo.amount) / 1e9; // Convert from smallest unit
              
              // Check if this mint matches our expected amount (within 0.001 MARS tolerance)
              if (Math.abs(mintAmount - amount) < 0.001) {
                matchingMints.push({
                  signature: sigInfo.signature,
                  amount: mintAmount,
                  slot: sigInfo.slot,
                  blockTime: sigInfo.blockTime ? new Date(sigInfo.blockTime * 1000).toISOString() : 'Unknown'
                });
              }
            }
          }
        } catch (error) {
          // Skip problematic transactions
          continue;
        }
      }
      
      // Display results
      console.log(`\n📊 Solana Minting Analysis:`);
      console.log(`   Total transactions checked: ${checkedCount}`);
      console.log(`   Matching mints found: ${matchingMints.length}`);
      
      if (matchingMints.length > 0) {
        console.log('\n✅ Found matching mint transactions:');
        for (const mint of matchingMints) {
          console.log(`   - Signature: ${mint.signature}`);
          console.log(`     Amount: ${mint.amount} MARS`);
          console.log(`     Slot: ${mint.slot}`);
          console.log(`     Time: ${mint.blockTime}`);
        }
        
        // Check how far back the first matching mint is
        if (matchingMints.length > 0) {
          const firstMintIndex = allSignatures.findIndex(
            sig => sig.signature === matchingMints[0].signature
          );
          console.log(`\n   ⚠️  First matching mint is ${firstMintIndex} transactions ago`);
          
          if (firstMintIndex >= 50) {
            console.log(`   ❌ This is beyond the 50-transaction limit of isL1TransactionProcessed()`);
            console.log(`   🐛 THIS IS WHY THE BRIDGE IS BEING REPROCESSED!`);
          }
        }
      } else {
        console.log('\n❌ No matching mint transactions found');
        console.log('   This bridge may not have been processed yet');
      }
      
      // 3. Check current token balance
      const tokenAccountInfo = await solanaConnection.getTokenAccountBalance(associatedTokenAccount);
      console.log(`\n💰 Current token balance: ${tokenAccountInfo.value.uiAmount} MARS`);
      
    } catch (error) {
      console.error('❌ Error checking Solana:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error in diagnosis:', error.message);
  }
}

// Main function
async function main() {
  console.log('🔍 Bridge Reprocessing Diagnostic Tool');
  console.log('=' . repeat(60));
  
  // Check specific bridge IDs mentioned in the logs
  await diagnoseBridgeId(1);
  await diagnoseBridgeId(2);
  
  // Get bridge stats
  console.log('\n📊 Current Bridge Stats:');
  const stats = await bridgeContract.getBridgeStats();
  console.log(`   Total Locked: ${ethers.formatEther(stats[0])} MARS`);
  console.log(`   Total Unlocked: ${ethers.formatEther(stats[1])} MARS`);
  console.log(`   Bridge Count: ${stats[2].toString()}`);
  console.log(`   Current Balance: ${ethers.formatEther(stats[3])} MARS`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
