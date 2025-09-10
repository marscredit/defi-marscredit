#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const config = {
  l1RpcUrl: 'https://rpc.marscredit.xyz',
  l1PrivateKey: process.env.RELAYER_PRIVATE_KEY,
  bridgeContractAddress: process.env.BRIDGE_CONTRACT_ADDRESS,
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ? 
    JSON.parse(process.env.SOLANA_PRIVATE_KEY) : null,
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
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function isSolanaTxProcessed(bytes32 solanaTxId) external view returns (bool)'
];

const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Wallet);

// Get all Solana mint transactions for a recipient
async function getSolanaMintTransactions(recipient) {
  try {
    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      recipientPubkey
    );
    
    const signatures = await solanaConnection.getSignaturesForAddress(associatedTokenAccount, {
      limit: 100
    });
    
    const mintTransactions = [];
    
    for (const sigInfo of signatures) {
      try {
        const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { 
          maxSupportedTransactionVersion: 0 
        });
        
        if (!tx) continue;
        
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if (ix.parsed && ix.parsed.type === 'mintTo') {
            const mintInfo = ix.parsed.info;
            const mintAmount = parseFloat(mintInfo.amount) / 1e9;
            
            mintTransactions.push({
              signature: sigInfo.signature,
              amount: mintAmount,
              slot: sigInfo.slot,
              blockTime: sigInfo.blockTime
            });
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return mintTransactions;
  } catch (error) {
    console.error(`Error getting Solana mints for ${recipient}:`, error.message);
    return [];
  }
}

// Get all Solana burn transactions
async function getSolanaBurnTransactions() {
  try {
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    const signatures = await solanaConnection.getSignaturesForAddress(mintPubkey, {
      limit: 200
    });
    
    const burnTransactions = [];
    
    for (const sigInfo of signatures) {
      try {
        const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { 
          maxSupportedTransactionVersion: 0 
        });
        
        if (!tx) continue;
        
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
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return burnTransactions;
  } catch (error) {
    console.error('Error getting Solana burns:', error.message);
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
    
    console.log(`📊 Found ${l1Events.length} L1 TokensLocked events`);
    
    let processed = 0;
    let unprocessed = 0;
    let errors = 0;
    
    const unprocessedTransactions = [];
    
    for (const event of l1Events) {
      const bridgeId = event.args.bridgeId.toString();
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      const recipient = event.args.solanaRecipient;
      const l1TxHash = event.transactionHash;
      
      // Check if transaction has enough confirmations
      const currentBlock = await l1Wallet.provider.getBlockNumber();
      const confirmations = currentBlock - event.blockNumber;
      
      if (confirmations < 30) {
        console.log(`⏳ Bridge ID ${bridgeId}: Only ${confirmations} confirmations, skipping`);
        continue;
      }
      
      try {
        // Get Solana mint transactions for this recipient
        const solanaMints = await getSolanaMintTransactions(recipient);
        
        // Look for matching mint transaction
        const matchingMint = solanaMints.find(mint => 
          Math.abs(mint.amount - amount) < 0.001
        );
        
        if (matchingMint) {
          console.log(`✅ Bridge ID ${bridgeId}: Found matching Solana mint (${matchingMint.amount} MARS)`);
          processed++;
        } else {
          console.log(`❌ Bridge ID ${bridgeId}: NO matching Solana mint found`);
          console.log(`   Expected: ${amount} MARS to ${recipient}`);
          console.log(`   L1 Tx: ${l1TxHash}`);
          
          unprocessedTransactions.push({
            bridgeId,
            amount,
            recipient,
            l1TxHash,
            confirmations
          });
          unprocessed++;
        }
      } catch (error) {
        console.log(`❌ Bridge ID ${bridgeId}: Error checking - ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n📊 L1 → Solana Audit Summary:');
    console.log(`✅ Processed: ${processed}`);
    console.log(`❌ Unprocessed: ${unprocessed}`);
    console.log(`⚠️  Errors: ${errors}`);
    
    return unprocessedTransactions;
    
  } catch (error) {
    console.error('Error auditing L1 → Solana:', error.message);
    return [];
  }
}

// Audit Solana → L1 transactions
async function auditSolanaToL1() {
  console.log('\n🔍 Auditing Solana → L1 Transactions');
  console.log('====================================');
  
  try {
    // Get all Solana burn transactions
    const solanaBurns = await getSolanaBurnTransactions();
    
    console.log(`📊 Found ${solanaBurns.length} Solana burn transactions`);
    
    // Get all L1 TokensUnlocked events
    const filter = bridgeContract.filters.TokensUnlocked();
    const l1UnlockEvents = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`📊 Found ${l1UnlockEvents.length} L1 TokensUnlocked events`);
    
    let processed = 0;
    let unprocessed = 0;
    let errors = 0;
    
    const unprocessedBurns = [];
    
    for (const burn of solanaBurns) {
      try {
        // Check if this burn was processed on L1
        const solanaTxIdBytes = ethers.id(burn.signature);
        const isProcessed = await bridgeContract.isSolanaTxProcessed(solanaTxIdBytes);
        
        if (isProcessed) {
          console.log(`✅ Solana burn ${burn.signature.substring(0, 8)}...: Processed on L1`);
          processed++;
        } else {
          console.log(`❌ Solana burn ${burn.signature.substring(0, 8)}...: NOT processed on L1`);
          console.log(`   Amount: ${burn.amount} MARS`);
          console.log(`   Authority: ${burn.authority}`);
          
          unprocessedBurns.push({
            signature: burn.signature,
            amount: burn.amount,
            authority: burn.authority,
            slot: burn.slot,
            blockTime: burn.blockTime
          });
          unprocessed++;
        }
      } catch (error) {
        console.log(`❌ Burn ${burn.signature.substring(0, 8)}...: Error checking - ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n📊 Solana → L1 Audit Summary:');
    console.log(`✅ Processed: ${processed}`);
    console.log(`❌ Unprocessed: ${unprocessed}`);
    console.log(`⚠️  Errors: ${errors}`);
    
    return unprocessedBurns;
    
  } catch (error) {
    console.error('Error auditing Solana → L1:', error.message);
    return [];
  }
}

// Main audit function
async function comprehensiveBridgeAudit() {
  console.log('🔍 Comprehensive Bridge Audit');
  console.log('=============================');
  console.log('');
  
  try {
    // Test connections first
    console.log('🔧 Testing connections...');
    const l1Block = await l1Wallet.provider.getBlockNumber();
    const solanaSlot = await solanaConnection.getSlot();
    console.log(`✅ L1 block: ${l1Block}, Solana slot: ${solanaSlot}`);
    console.log('');
    
    // Audit both directions
    const unprocessedL1ToSolana = await auditL1ToSolana();
    const unprocessedSolanaToL1 = await auditSolanaToL1();
    
    // Overall summary
    console.log('\n🎯 COMPREHENSIVE AUDIT RESULTS');
    console.log('==============================');
    console.log(`🔄 L1 → Solana unprocessed: ${unprocessedL1ToSolana.length} transactions`);
    console.log(`🔄 Solana → L1 unprocessed: ${unprocessedSolanaToL1.length} transactions`);
    
    if (unprocessedL1ToSolana.length > 0) {
      console.log('\n❌ Unprocessed L1 → Solana transactions:');
      unprocessedL1ToSolana.forEach(tx => {
        console.log(`   Bridge ID ${tx.bridgeId}: ${tx.amount} MARS to ${tx.recipient}`);
        console.log(`   L1 Tx: ${tx.l1TxHash}`);
      });
    }
    
    if (unprocessedSolanaToL1.length > 0) {
      console.log('\n❌ Unprocessed Solana → L1 transactions:');
      unprocessedSolanaToL1.forEach(tx => {
        console.log(`   Solana Tx: ${tx.signature}`);
        console.log(`   Amount: ${tx.amount} MARS, Authority: ${tx.authority}`);
      });
    }
    
    if (unprocessedL1ToSolana.length === 0 && unprocessedSolanaToL1.length === 0) {
      console.log('\n🎉 ALL BRIDGE TRANSACTIONS ARE PROCESSED!');
      console.log('✅ Bridge is fully synchronized');
    } else {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      if (unprocessedL1ToSolana.length > 0) {
        console.log(`1. Run: node scripts/process-missed-bridge-ids.js`);
      }
      if (unprocessedSolanaToL1.length > 0) {
        console.log(`2. Check Solana → L1 processing in relayer`);
      }
    }
    
    return {
      unprocessedL1ToSolana,
      unprocessedSolanaToL1
    };
    
  } catch (error) {
    console.error('❌ Comprehensive audit failed:', error.message);
    return null;
  }
}

// Run the audit
comprehensiveBridgeAudit().catch(console.error); 