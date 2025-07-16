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

// Check if a specific bridge transaction was processed on Solana
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

// Simple focused audit on recent bridge transactions
async function simpleBridgeAudit() {
  console.log('🔍 Simple Bridge Audit (Recent Transactions Only)');
  console.log('=================================================');
  console.log('');
  
  try {
    // Test connections
    console.log('🔧 Testing connections...');
    const l1Block = await l1Wallet.provider.getBlockNumber();
    const solanaSlot = await solanaConnection.getSlot();
    console.log(`✅ L1 block: ${l1Block}, Solana slot: ${solanaSlot}`);
    console.log('');
    
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
    let errors = 0;
    
    const unprocessedTransactions = [];
    
    for (const event of recentEvents) {
      const bridgeId = event.args.bridgeId.toString();
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      const recipient = event.args.solanaRecipient;
      const l1TxHash = event.transactionHash;
      
      console.log(`🔄 Checking Bridge ID ${bridgeId}:`);
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
    
    // Summary
    console.log('📊 Recent Bridge Transactions Audit Summary:');
    console.log('============================================');
    console.log(`✅ Processed on Solana: ${processed}`);
    console.log(`❌ NOT processed on Solana: ${unprocessed}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log('');
    
    if (unprocessedTransactions.length > 0) {
      console.log('❌ Unprocessed Transactions:');
      unprocessedTransactions.forEach(tx => {
        console.log(`   Bridge ID ${tx.bridgeId}: ${tx.amount} MARS`);
        console.log(`   Recipient: ${tx.recipient}`);
        console.log(`   L1 Tx: ${tx.l1TxHash}`);
        console.log(`   Reason: ${tx.reason}`);
        console.log('');
      });
      
      console.log('🔧 RECOMMENDATION:');
      console.log('   Run: node scripts/process-missed-bridge-ids.js');
      console.log('   This will process any unprocessed L1 → Solana transactions');
    } else {
      console.log('🎉 All recent bridge transactions have been processed!');
    }
    
    return unprocessedTransactions;
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    return [];
  }
}

// Run the audit
simpleBridgeAudit().catch(console.error); 