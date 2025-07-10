#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getMint, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createMintToInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

console.log('🌉 Mars Bridge Relayer (Fixed Version)');
console.log('======================================');
console.log('📋 Loading environment variables from .env file...');

// Configuration from environment variables
const config = {
  l1RpcUrl: 'https://rpc.marscredit.xyz',
  l1PrivateKey: process.env.RELAYER_PRIVATE_KEY,
  bridgeContractAddress: process.env.BRIDGE_CONTRACT_ADDRESS,
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ? JSON.parse(process.env.SOLANA_PRIVATE_KEY) : null,
  marsMintAddress: process.env.MARS_MINT_ADDRESS
};

// State files to track processed transactions
const stateFile = path.join(__dirname, 'relayer-state.json');
const l1TxHashFile = path.join(__dirname, 'processed-l1-hashes.json');

// Debug: Show what environment variables are loaded (safely)
console.log('🔍 Environment Variables Check:');
console.log('   RELAYER_PRIVATE_KEY:', process.env.RELAYER_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('   BRIDGE_CONTRACT_ADDRESS:', process.env.BRIDGE_CONTRACT_ADDRESS || '❌ Missing');
console.log('   SOLANA_PRIVATE_KEY:', process.env.SOLANA_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('   MARS_MINT_ADDRESS:', process.env.MARS_MINT_ADDRESS || '❌ Missing');
console.log('');

// Validate required environment variables
const requiredEnvVars = [
  'RELAYER_PRIVATE_KEY',
  'BRIDGE_CONTRACT_ADDRESS',
  'SOLANA_PRIVATE_KEY', 
  'MARS_MINT_ADDRESS'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error(`💡 Please add ${envVar} to your .env file`);
    process.exit(1);
  }
}

// Initialize connections
const l1Wallet = new ethers.Wallet(config.l1PrivateKey, new ethers.JsonRpcProvider(config.l1RpcUrl));
const solanaConnection = new Connection(config.solanaRpcUrl);
const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));

// Bridge contract ABI
const bridgeABI = [
  'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
  'event TokensUnlocked(address indexed recipient, uint256 amount, bytes32 indexed solanaTxId, uint256 indexed bridgeId)',
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function isSolanaTxProcessed(bytes32 solanaTxId) external view returns (bool)'
];

const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Wallet);

// Load/save state
function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('⚠️ Could not load state file, starting fresh');
  }
  return { processedBridgeIds: [], lastProcessedBlock: 0 };
}

function saveState(state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('❌ Could not save state:', error.message);
  }
}

// Load/save L1 transaction hashes (duplicate prevention)
function loadProcessedL1Hashes() {
  try {
    if (fs.existsSync(l1TxHashFile)) {
      const data = fs.readFileSync(l1TxHashFile, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (error) {
    console.log('⚠️ Could not load L1 hash file, starting fresh');
  }
  return new Set();
}

function saveProcessedL1Hashes(hashSet) {
  try {
    fs.writeFileSync(l1TxHashFile, JSON.stringify([...hashSet], null, 2));
  } catch (error) {
    console.error('❌ Could not save L1 hash file:', error.message);
  }
}

async function testConnections() {
  console.log('🔧 Testing connections...');
  
  try {
    // Test L1 connection
    const l1Block = await new ethers.JsonRpcProvider(config.l1RpcUrl).getBlockNumber();
    console.log('✅ L1 connection OK, block:', l1Block);
    
    // Test Solana connection
    const slot = await solanaConnection.getSlot();
    console.log('✅ Solana connection OK, slot:', slot);
    
    // Test wallet addresses
    console.log('👛 L1 Wallet:', l1Wallet.address);
    console.log('👛 Solana Wallet:', solanaWallet.publicKey.toString());
    
    // Test contract connection
    const stats = await bridgeContract.getBridgeStats();
    console.log('✅ Bridge contract OK');
    console.log('   Total Locked:', ethers.formatEther(stats[0]), 'MARS');
    console.log('   Bridge Count:', stats[2].toString());
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function mintTokensOnSolana(recipient, amount, bridgeId, l1TxHash) {
  console.log(`🎯 Minting ${amount} MARS to ${recipient} for Bridge ID ${bridgeId}`);
  console.log(`   L1 Transaction Hash: ${l1TxHash}`);
  
  // Check for L1 transaction hash duplicates
  const processedHashes = loadProcessedL1Hashes();
  if (processedHashes.has(l1TxHash)) {
    console.log(`⚠️  L1 Transaction ${l1TxHash} already processed, skipping mint`);
    return 'already_processed';
  }
  
  try {
    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    // Get associated token account
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      recipientPubkey
    );
    
    // Check if token account exists and create if needed
    const accountInfo = await solanaConnection.getAccountInfo(associatedTokenAccount);
    if (!accountInfo) {
      console.log('📝 Creating associated token account...');
      // Create the token account first in a separate transaction
      const createAccountTx = new (require('@solana/web3.js')).Transaction();
      createAccountTx.add(
        createAssociatedTokenAccountInstruction(
          solanaWallet.publicKey,
          associatedTokenAccount,
          recipientPubkey,
          mintPubkey
        )
      );
      
      const createAccountSignature = await solanaConnection.sendTransaction(createAccountTx, [solanaWallet]);
      await solanaConnection.confirmTransaction(createAccountSignature, 'confirmed');
      console.log('✅ Token account created:', createAccountSignature);
    }
    
    // Convert amount to smallest unit (MARS has 9 decimals)
    const amountInSmallestUnit = Math.floor(parseFloat(amount) * 1000000000);
    
    // Create mint transaction
    const mintTx = new (require('@solana/web3.js')).Transaction();
    mintTx.add(
      createMintToInstruction(
        mintPubkey,
        associatedTokenAccount,
        solanaWallet.publicKey,
        amountInSmallestUnit
      )
    );
    
    // Send transaction
    const signature = await solanaConnection.sendTransaction(mintTx, [solanaWallet]);
    await solanaConnection.confirmTransaction(signature, 'confirmed');
    
    // Save L1 transaction hash to prevent duplicates
    processedHashes.add(l1TxHash);
    saveProcessedL1Hashes(processedHashes);
    
    console.log(`✅ Minted ${amount} MARS to ${recipient}`);
    console.log(`   Solana Transaction: ${signature}`);
    console.log(`   L1 Hash Recorded: ${l1TxHash}`);
    console.log(`   Bridge ID: ${bridgeId} completed`);
    
    return signature;
    
  } catch (error) {
    console.error(`❌ Failed to mint tokens for Bridge ID ${bridgeId}:`, error.message);
    throw error;
  }
}

async function processHistoricalTransactions() {
  console.log('📜 Checking for historical unprocessed transactions...');
  
  const state = loadState();
  
  try {
    // Get all TokensLocked events from the beginning
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`🔍 Found ${events.length} historical bridge transactions`);
    
    for (const event of events) {
      const bridgeId = event.args.bridgeId.toString();
      
      if (state.processedBridgeIds.includes(bridgeId)) {
        console.log(`⏭️ Bridge ID ${bridgeId} already processed, skipping`);
        continue;
      }
      
      // Check if transaction has enough confirmations (30 blocks)
      const currentBlock = await l1Wallet.provider.getBlockNumber();
      const confirmations = currentBlock - event.blockNumber;
      
      if (confirmations < 30) {
        console.log(`⏳ Bridge ID ${bridgeId} has ${confirmations} confirmations, needs 30`);
        continue;
      }
      
      console.log(`🔄 Processing Bridge ID ${bridgeId}:`);
      console.log(`   User: ${event.args.user}`);
      console.log(`   Amount: ${ethers.formatEther(event.args.amount)} MARS`);
      console.log(`   Recipient: ${event.args.solanaRecipient}`);
      console.log(`   Confirmations: ${confirmations}`);
      
      try {
        const result = await mintTokensOnSolana(
          event.args.solanaRecipient,
          ethers.formatEther(event.args.amount),
          bridgeId,
          event.transactionHash
        );
        
        // Mark as processed only if not already processed
        if (result !== 'already_processed') {
          state.processedBridgeIds.push(bridgeId);
          saveState(state);
          console.log(`✅ Successfully processed Bridge ID ${bridgeId}`);
        } else {
          console.log(`⚠️  Bridge ID ${bridgeId} was already processed via L1 hash, updating local state`);
          state.processedBridgeIds.push(bridgeId);
          saveState(state);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process Bridge ID ${bridgeId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing historical transactions:', error.message);
  }
}

async function monitorL1Events() {
  console.log('👁️ Monitoring L1 events...');
  
  bridgeContract.on('TokensLocked', async (user, amount, solanaRecipient, bridgeId, event) => {
    console.log('🔒 New L1 Lock Event:', {
      user,
      amount: ethers.formatEther(amount),
      solanaRecipient,
      bridgeId: bridgeId.toString(),
      txHash: event.log?.transactionHash || event.transactionHash
    });
    
    // Try different ways to get the transaction hash
    const txHash = event.log?.transactionHash || event.transactionHash || event.log?.hash;
    
    if (!txHash) {
      console.log('❌ Could not get transaction hash from event, skipping polling');
      return;
    }
    
    // Create a modified event object with the correct transaction hash
    const eventWithTxHash = {
      ...event,
      transactionHash: txHash,
      blockNumber: event.log?.blockNumber || event.blockNumber
    };
    
    // Start confirmation polling
    pollForConfirmations(eventWithTxHash, user, amount, solanaRecipient, bridgeId);
  });
  
  bridgeContract.on('TokensUnlocked', (recipient, amount, solanaTxId, bridgeId, event) => {
    console.log('🔓 L1 Unlock Event:', {
      recipient,
      amount: ethers.formatEther(amount),
      solanaTxId,
      bridgeId: bridgeId.toString(),
      txHash: event.log?.transactionHash || event.transactionHash
    });
  });
}

async function pollForConfirmations(event, user, amount, solanaRecipient, bridgeId) {
  const startTime = Date.now();
  const maxWaitTime = 20 * 60 * 1000; // 20 minutes max wait
  
  console.log(`⏳ Starting confirmation polling for Bridge ID ${bridgeId.toString()}`);
  console.log(`   Transaction: ${event.transactionHash}`);
  
  // Get the block number from the transaction receipt
  let transactionBlock = null;
  try {
    const receipt = await l1Wallet.provider.getTransactionReceipt(event.transactionHash);
    if (receipt) {
      transactionBlock = receipt.blockNumber;
      console.log(`   Block: ${transactionBlock}, waiting for 30 confirmations...`);
    } else {
      console.log('   Transaction receipt not yet available, waiting...');
    }
  } catch (error) {
    console.log('   Could not get transaction receipt yet, will retry...');
  }
  
  const checkConfirmations = async () => {
    try {
      // If we don't have the block number yet, try to get it
      if (!transactionBlock) {
        try {
          const receipt = await l1Wallet.provider.getTransactionReceipt(event.transactionHash);
          if (receipt) {
            transactionBlock = receipt.blockNumber;
            console.log(`📍 Got transaction block: ${transactionBlock}`);
          } else {
            console.log(`⏳ Bridge ID ${bridgeId.toString()}: Transaction not yet mined, retrying...`);
            setTimeout(() => checkConfirmations(), 30000);
            return;
          }
        } catch (error) {
          console.log(`⏳ Bridge ID ${bridgeId.toString()}: Could not get receipt yet, retrying...`);
          setTimeout(() => checkConfirmations(), 30000);
          return;
        }
      }
      
      const currentBlock = await l1Wallet.provider.getBlockNumber();
      const confirmations = currentBlock - transactionBlock;
      
      console.log(`📊 Bridge ID ${bridgeId.toString()}: ${confirmations}/30 confirmations (block ${transactionBlock} -> ${currentBlock})`);
      
      if (confirmations >= 30) {
        console.log(`✅ Bridge ID ${bridgeId.toString()} has 30+ confirmations, processing...`);
        
        const state = loadState();
        if (!state.processedBridgeIds.includes(bridgeId.toString())) {
          try {
            const result = await mintTokensOnSolana(
              solanaRecipient,
              ethers.formatEther(amount),
              bridgeId.toString(),
              event.transactionHash
            );
            
            // Mark as processed only if not already processed
            if (result !== 'already_processed') {
              state.processedBridgeIds.push(bridgeId.toString());
              saveState(state);
              console.log(`🎉 Successfully processed Bridge ID ${bridgeId.toString()}`);
            } else {
              console.log(`⚠️  Bridge ID ${bridgeId.toString()} was already processed via L1 hash, updating local state`);
              state.processedBridgeIds.push(bridgeId.toString());
              saveState(state);
            }
            
          } catch (error) {
            console.error(`❌ Failed to mint for Bridge ID ${bridgeId.toString()}:`, error.message);
            // Retry in 30 seconds
            setTimeout(() => checkConfirmations(), 30000);
          }
        } else {
          console.log(`⏭️ Bridge ID ${bridgeId.toString()} already processed`);
        }
        return;
      }
      
      // Check if we've been waiting too long
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > maxWaitTime) {
        console.error(`⚠️ Bridge ID ${bridgeId.toString()} timeout after 20 minutes`);
        return;
      }
      
      // Wait 30 seconds and check again
      setTimeout(() => checkConfirmations(), 30000);
      
    } catch (error) {
      console.error(`❌ Error checking confirmations for Bridge ID ${bridgeId.toString()}:`, error.message);
      // Retry in 30 seconds
      setTimeout(() => checkConfirmations(), 30000);
    }
  };
  
  // Start checking
  checkConfirmations();
}

async function main() {
  console.log('🚀 Starting relayer...');
  
  // Test all connections
  const connectionsOK = await testConnections();
  if (!connectionsOK) {
    console.error('❌ Failed to connect to services');
    process.exit(1);
  }
  
  // Process any existing unprocessed transactions
  await processHistoricalTransactions();
  
  // Start monitoring for new events
  await monitorL1Events();
  
  console.log('✅ Relayer started successfully!');
  console.log('   Press Ctrl+C to stop');
  console.log('');
  console.log('🔒 Duplicate Prevention: Using L1 transaction hash tracking');
  console.log('📁 State files:');
  console.log('   Bridge IDs:', stateFile);
  console.log('   L1 Hashes:', l1TxHashFile);
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
  });
}

main().catch(console.error); 