#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const config = {
  l1RpcUrl: 'https://rpc.marscredit.xyz',
  l1PrivateKey: process.env.RELAYER_PRIVATE_KEY,
  bridgeContractAddress: process.env.BRIDGE_CONTRACT_ADDRESS,
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  marsMintAddress: process.env.MARS_MINT_ADDRESS
};

// Validate Solana RPC URL
if (!config.solanaRpcUrl || (!config.solanaRpcUrl.startsWith('http://') && !config.solanaRpcUrl.startsWith('https://'))) {
  config.solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
}

// Initialize connections
const l1Wallet = new ethers.Wallet(config.l1PrivateKey, new ethers.JsonRpcProvider(config.l1RpcUrl));

let solanaConnection;
const solanaApiKey = process.env.SOLANA_RPC_API_KEY;
if (solanaApiKey && config.solanaRpcUrl.includes('tatum.io')) {
  const customFetch = (url, options) => {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': solanaApiKey,
      ...options.headers
    };
    return fetch(url, { ...options, headers });
  };
  solanaConnection = new Connection(config.solanaRpcUrl, {
    commitment: 'confirmed',
    fetch: customFetch
  });
} else if (solanaApiKey && config.solanaRpcUrl.includes('helius-rpc.com')) {
  const customFetch = (url, options) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    return fetch(url, { ...options, headers });
  };
  solanaConnection = new Connection(config.solanaRpcUrl, {
    commitment: 'confirmed',
    fetch: customFetch
  });
} else {
  solanaConnection = new Connection(config.solanaRpcUrl);
}

const bridgeABI = [
  'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
  'event TokensUnlocked(address indexed recipient, uint256 amount, bytes32 indexed solanaTxId, uint256 indexed bridgeId)',
  'function isSolanaTxProcessed(bytes32 solanaTxId) external view returns (bool)'
];

const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Wallet);

// Add delay to avoid rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if a specific L1 → Solana bridge transaction was processed on Solana
async function checkSolanaMintForBridge(recipient, expectedAmount, bridgeId) {
  try {
    await delay(1000); // 1 second delay to avoid rate limits
    
    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      recipientPubkey
    );
    
    // Get token account info first
    const accountInfo = await solanaConnection.getAccountInfo(associatedTokenAccount);
    if (!accountInfo) {
      return { processed: false, reason: 'No token account found' };
    }
    
    // Get recent transactions (limit to 20 to avoid rate limits)
    const signatures = await solanaConnection.getSignaturesForAddress(associatedTokenAccount, {
      limit: 20
    });
    
    console.log(`   📊 Found ${signatures.length} recent transactions for ${recipient.substring(0, 8)}...`);
    
    // Check each transaction for mint operations
    for (const sigInfo of signatures) {
      try {
        await delay(500); // Small delay between transaction checks
        
        const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { 
          maxSupportedTransactionVersion: 0 
        });
        
        if (!tx) continue;
        
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if (ix.parsed && ix.parsed.type === 'mintTo') {
            const mintInfo = ix.parsed.info;
            const mintAmount = parseFloat(mintInfo.amount) / 1e9;
            
            // Check if this mint matches our expected amount (within 0.001 tolerance)
            if (Math.abs(mintAmount - expectedAmount) < 0.001) {
              return { 
                processed: true, 
                signature: sigInfo.signature,
                amount: mintAmount,
                slot: sigInfo.slot
              };
            }
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Error checking transaction: ${error.message}`);
        continue;
      }
    }
    
    return { processed: false, reason: 'No matching mint transaction found' };
    
  } catch (error) {
    return { processed: false, reason: `Error: ${error.message}` };
  }
}

// Check if a Solana burn transaction was processed on L1
async function checkL1UnlockForBurn(burnTxSignature, burnAmount, burnAuthority) {
  try {
    await delay(1000); // Rate limiting
    
    // Convert Solana transaction signature to bytes32 hash
    const solanaTxIdBytes = ethers.id(burnTxSignature);
    
    // Check if this Solana transaction was processed on L1
    const isProcessed = await bridgeContract.isSolanaTxProcessed(solanaTxIdBytes);
    
    if (isProcessed) {
      // Find the corresponding TokensUnlocked event
      const filter = bridgeContract.filters.TokensUnlocked();
      const unlockEvents = await bridgeContract.queryFilter(filter, 0);
      
      for (const event of unlockEvents) {
        const eventSolanaTxId = event.args.solanaTxId;
        if (eventSolanaTxId === solanaTxIdBytes) {
          const unlockAmount = parseFloat(ethers.formatEther(event.args.amount));
          
          return {
            processed: true,
            l1TxHash: event.transactionHash,
            recipient: event.args.recipient,
            amount: unlockAmount,
            bridgeId: event.args.bridgeId.toString()
          };
        }
      }
    }
    
    return { processed: false, reason: 'No matching L1 unlock found' };
    
  } catch (error) {
    return { processed: false, reason: `Error: ${error.message}` };
  }
}

// Get recent Solana burn transactions
async function getRecentSolanaBurns(limit = 50) {
  try {
    console.log('🔍 Scanning for recent Solana burn transactions...');
    
    const mintPubkey = new PublicKey(config.marsMintAddress);
    const signatures = await solanaConnection.getSignaturesForAddress(mintPubkey, {
      limit: limit
    });
    
    console.log(`   Found ${signatures.length} recent transactions on MARS mint`);
    
    const burnTransactions = [];
    
    for (const sigInfo of signatures) {
      try {
        await delay(500); // Rate limiting
        
        const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { 
          maxSupportedTransactionVersion: 0 
        });
        
        if (!tx) continue;
        
        // Look for burn instructions
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if (ix.parsed && ix.parsed.type === 'burn') {
            const burnInfo = ix.parsed.info;
            const burnAmount = parseFloat(burnInfo.amount) / 1e9;
            
            burnTransactions.push({
              signature: sigInfo.signature,
              amount: burnAmount,
              authority: burnInfo.authority,
              slot: sigInfo.slot,
              blockTime: sigInfo.blockTime
            });
            
            console.log(`   🔥 Found burn: ${burnAmount} MARS in tx ${sigInfo.signature}`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Error processing transaction: ${error.message}`);
        continue;
      }
    }
    
    return burnTransactions;
    
  } catch (error) {
    console.error('❌ Error getting Solana burns:', error.message);
    return [];
  }
}

// Audit L1 → Solana transactions
async function auditL1ToSolana() {
  console.log('🔍 Auditing L1 → Solana Transactions');
  console.log('====================================');
  
  try {
    // Get all L1 TokensLocked events
    const filter = bridgeContract.filters.TokensLocked();
    const l1Events = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`📊 Found ${l1Events.length} total L1 TokensLocked events`);
    
    // Focus on recent transactions (Bridge IDs >= 29)
    const recentEvents = l1Events.filter(event => {
      const bridgeId = parseInt(event.args.bridgeId.toString());
      return bridgeId >= 29;
    });
    
    console.log(`🎯 Checking ${recentEvents.length} recent bridge transactions (ID >= 29)`);
    console.log('');
    
    let processed = 0;
    let unprocessed = 0;
    const unprocessedTransactions = [];
    
    for (const event of recentEvents) {
      const bridgeId = event.args.bridgeId.toString();
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      const recipient = event.args.solanaRecipient;
      const l1TxHash = event.transactionHash;
      
      console.log(`🔄 Checking L1→Solana Bridge ID ${bridgeId}:`);
      console.log(`   Amount: ${amount} MARS`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   L1 Tx: ${l1TxHash}`);
      
      // Check if transaction has enough confirmations
      const currentBlock = await l1Wallet.provider.getBlockNumber();
      const confirmations = currentBlock - event.blockNumber;
      
      if (confirmations < 30) {
        console.log(`   ⏳ Only ${confirmations} confirmations, needs 30. Skipping.`);
        continue;
      }
      
      // Check if processed on Solana
      const result = await checkSolanaMintForBridge(recipient, amount, bridgeId);
      
      if (result.processed) {
        console.log(`   ✅ PROCESSED: Found Solana mint (${result.amount} MARS)`);
        console.log(`   📝 Solana Tx: ${result.signature}`);
        processed++;
      } else {
        console.log(`   ❌ NOT PROCESSED: ${result.reason}`);
        unprocessedTransactions.push({
          bridgeId,
          amount,
          recipient,
          l1TxHash,
          confirmations,
          reason: result.reason
        });
        unprocessed++;
      }
      
      console.log('');
    }
    
    return {
      direction: 'L1→Solana',
      processed,
      unprocessed,
      unprocessedTransactions
    };
    
  } catch (error) {
    console.error('❌ L1→Solana audit failed:', error.message);
    return {
      direction: 'L1→Solana',
      processed: 0,
      unprocessed: 0,
      unprocessedTransactions: []
    };
  }
}

// Audit Solana → L1 transactions
async function auditSolanaToL1() {
  console.log('🔍 Auditing Solana → L1 Transactions');
  console.log('====================================');
  
  try {
    // Get recent Solana burn transactions
    const burnTransactions = await getRecentSolanaBurns(50);
    
    console.log(`📊 Found ${burnTransactions.length} recent Solana burn transactions`);
    console.log('');
    
    let processed = 0;
    let unprocessed = 0;
    const unprocessedTransactions = [];
    
    for (const burn of burnTransactions) {
      console.log(`🔄 Checking Solana→L1 burn ${burn.signature.substring(0, 16)}...:`);
      console.log(`   Amount: ${burn.amount} MARS`);
      console.log(`   Authority: ${burn.authority}`);
      console.log(`   Slot: ${burn.slot}`);
      
      // Check if processed on L1
      const result = await checkL1UnlockForBurn(burn.signature, burn.amount, burn.authority);
      
      if (result.processed) {
        console.log(`   ✅ PROCESSED: Found L1 unlock (${result.amount} MARS)`);
        console.log(`   📝 L1 Tx: ${result.l1TxHash}`);
        console.log(`   🎯 Recipient: ${result.recipient}`);
        console.log(`   🔗 Bridge ID: ${result.bridgeId}`);
        processed++;
      } else {
        console.log(`   ❌ NOT PROCESSED: ${result.reason}`);
        unprocessedTransactions.push({
          solanaTxSignature: burn.signature,
          amount: burn.amount,
          authority: burn.authority,
          slot: burn.slot,
          blockTime: burn.blockTime,
          reason: result.reason
        });
        unprocessed++;
      }
      
      console.log('');
    }
    
    return {
      direction: 'Solana→L1',
      processed,
      unprocessed,
      unprocessedTransactions
    };
    
  } catch (error) {
    console.error('❌ Solana→L1 audit failed:', error.message);
    return {
      direction: 'Solana→L1',
      processed: 0,
      unprocessed: 0,
      unprocessedTransactions: []
    };
  }
}

// Main bidirectional audit function
async function bidirectionalBridgeAudit() {
  console.log('🔍 BIDIRECTIONAL BRIDGE AUDIT');
  console.log('==============================');
  console.log('');
  
  try {
    // Test connections
    console.log('🔧 Testing connections...');
    const l1Block = await l1Wallet.provider.getBlockNumber();
    const solanaSlot = await solanaConnection.getSlot();
    console.log(`✅ L1 block: ${l1Block}, Solana slot: ${solanaSlot}`);
    console.log('');
    
    // Audit both directions
    console.log('🔄 Starting bidirectional audit...');
    console.log('');
    
    const l1ToSolanaResult = await auditL1ToSolana();
    console.log('');
    const solanaToL1Result = await auditSolanaToL1();
    
    // Combined summary
    console.log('📊 BIDIRECTIONAL AUDIT SUMMARY');
    console.log('==============================');
    console.log('');
    
    console.log('🔄 L1 → Solana:');
    console.log(`   ✅ Processed: ${l1ToSolanaResult.processed}`);
    console.log(`   ❌ Unprocessed: ${l1ToSolanaResult.unprocessed}`);
    console.log('');
    
    console.log('🔄 Solana → L1:');
    console.log(`   ✅ Processed: ${solanaToL1Result.processed}`);
    console.log(`   ❌ Unprocessed: ${solanaToL1Result.unprocessed}`);
    console.log('');
    
    console.log('🏁 Overall Health:');
    const totalProcessed = l1ToSolanaResult.processed + solanaToL1Result.processed;
    const totalUnprocessed = l1ToSolanaResult.unprocessed + solanaToL1Result.unprocessed;
    const totalTransactions = totalProcessed + totalUnprocessed;
    
    if (totalTransactions > 0) {
      const healthPercentage = (totalProcessed / totalTransactions * 100).toFixed(1);
      console.log(`   📊 Success Rate: ${healthPercentage}% (${totalProcessed}/${totalTransactions})`);
    }
    
    // Show unprocessed transactions
    if (l1ToSolanaResult.unprocessedTransactions.length > 0) {
      console.log('');
      console.log('❌ Unprocessed L1 → Solana Transactions:');
      l1ToSolanaResult.unprocessedTransactions.forEach(tx => {
        console.log(`   Bridge ID ${tx.bridgeId}: ${tx.amount} MARS`);
        console.log(`   Recipient: ${tx.recipient}`);
        console.log(`   L1 Tx: ${tx.l1TxHash}`);
        console.log(`   Reason: ${tx.reason}`);
        console.log('');
      });
    }
    
    if (solanaToL1Result.unprocessedTransactions.length > 0) {
      console.log('❌ Unprocessed Solana → L1 Transactions:');
      solanaToL1Result.unprocessedTransactions.forEach(tx => {
        console.log(`   Solana Tx: ${tx.solanaTxSignature}`);
        console.log(`   Amount: ${tx.amount} MARS`);
        console.log(`   Authority: ${tx.authority}`);
        console.log(`   Reason: ${tx.reason}`);
        console.log('');
      });
    }
    
    // Recommendations
    console.log('🔧 RECOMMENDATIONS:');
    if (l1ToSolanaResult.unprocessed > 0) {
      console.log('   For L1 → Solana issues: Run process-missed-bridge-ids.js');
    }
    if (solanaToL1Result.unprocessed > 0) {
      console.log('   For Solana → L1 issues: Check relayer Solana monitoring');
    }
    if (totalUnprocessed === 0) {
      console.log('   🎉 All bridge transactions are properly processed!');
    }
    
  } catch (error) {
    console.error('❌ Bidirectional audit failed:', error.message);
  }
}

// Run the audit
bidirectionalBridgeAudit().catch(console.error); 