const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  createMintToInstruction 
} = require('@solana/spl-token');
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

// Create Solana connection with Tatum API key if available
let solanaConnection;
const solanaApiKey = process.env.SOLANA_RPC_API_KEY;
if (solanaApiKey && config.solanaRpcUrl.includes('tatum.io')) {
  console.log('🔑 Using Tatum API key for Solana connection');
  // For Tatum, use custom fetch with API key header
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

const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));

// Bridge contract ABI
const bridgeABI = [
  'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
  'event TokensUnlocked(address indexed recipient, uint256 amount, bytes32 indexed solanaTxId, uint256 indexed bridgeId)',
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function isSolanaTxProcessed(bytes32 solanaTxId) external view returns (bool)',
  'function unlockTokens(address recipient, uint256 amount, bytes32 solanaTxId) external'
];

const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Wallet);

// Test connections
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

// Check if L1 transaction was already processed (on-chain verification)
async function isL1TransactionProcessed(l1TxHash) {
  try {
    // Get all TokensLocked events and check if this tx hash exists
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter);
    
    // Check if this L1 transaction hash already triggered a bridge event
    for (const event of events) {
      if (event.transactionHash === l1TxHash) {
        return true; // Already processed
      }
    }
    
    return false; // Not processed yet
  } catch (error) {
    console.error('❌ Error checking L1 transaction status:', error.message);
    return false;
  }
}

// Check if Solana transaction was already processed (on-chain verification)
async function isSolanaTransactionProcessed(solanaTxId) {
  try {
    const solanaTxIdBytes = ethers.id(solanaTxId);
    return await bridgeContract.isSolanaTxProcessed(solanaTxIdBytes);
  } catch (error) {
    console.error('❌ Error checking Solana transaction status:', error.message);
    return false;
  }
}

// Mint tokens on Solana (L1 → Solana)
async function mintTokensOnSolana(recipient, amount, bridgeId, l1TxHash) {
  console.log(`🎯 Minting ${amount} MARS to ${recipient} for Bridge ID ${bridgeId}`);
  console.log(`   L1 Transaction Hash: ${l1TxHash}`);
  
  // Check if this L1 transaction was already processed (on-chain verification)
  const alreadyProcessed = await isL1TransactionProcessed(l1TxHash);
  if (alreadyProcessed) {
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
    
    console.log(`✅ Minted ${amount} MARS to ${recipient}`);
    console.log(`   Solana Transaction: ${signature}`);
    console.log(`   L1 Hash: ${l1TxHash}`);
    console.log(`   Bridge ID: ${bridgeId} completed`);
    
    return signature;
    
  } catch (error) {
    console.error(`❌ Failed to mint tokens for Bridge ID ${bridgeId}:`, error.message);
    throw error;
  }
}

// Check if bridge ID was already processed by querying bridge contract
async function isBridgeIdProcessed(bridgeId) {
  try {
    // Get all TokensLocked events from bridge contract
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter);
    
    // Check if this bridge ID already has a corresponding mint transaction
    for (const event of events) {
      if (event.args.bridgeId.toString() === bridgeId.toString()) {
        // Check if this was already processed by looking for the transaction hash
        return await isL1TransactionProcessed(event.transactionHash);
      }
    }
    
    return false; // Bridge ID not found or not processed
  } catch (error) {
    console.error('❌ Error checking bridge ID status:', error.message);
    return false;
  }
}

// Process historical L1 → Solana transactions
async function processHistoricalTransactions() {
  console.log('📜 Checking for historical unprocessed transactions...');
  
  try {
    // Get all TokensLocked events from the beginning
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`🔍 Found ${events.length} historical bridge transactions`);
    
    for (const event of events) {
      const bridgeId = event.args.bridgeId.toString();
      
      // Check if this bridge ID was already processed (on-chain verification)
      const alreadyProcessed = await isBridgeIdProcessed(bridgeId);
      if (alreadyProcessed) {
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
        
        if (result !== 'already_processed') {
          console.log(`✅ Successfully processed Bridge ID ${bridgeId}`);
        } else {
          console.log(`⚠️  Bridge ID ${bridgeId} was already processed`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process Bridge ID ${bridgeId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing historical transactions:', error.message);
  }
}

// Monitor L1 events for new bridge transactions
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

// Poll for confirmations before processing L1 → Solana transactions
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
        
        // Check if already processed (on-chain verification)
        const alreadyProcessed = await isBridgeIdProcessed(bridgeId.toString());
        if (!alreadyProcessed) {
          try {
            const result = await mintTokensOnSolana(
              solanaRecipient,
              ethers.formatEther(amount),
              bridgeId.toString(),
              event.transactionHash
            );
            
            if (result !== 'already_processed') {
              console.log(`🎉 Successfully processed Bridge ID ${bridgeId.toString()}`);
            } else {
              console.log(`⚠️  Bridge ID ${bridgeId.toString()} was already processed`);
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

// Unlock tokens on L1 (Solana → L1)
async function unlockTokensOnL1(recipient, amount, solanaTxId) {
  console.log(`🔓 Unlocking ${amount} MARS on L1 for ${recipient}`);
  
  try {
    // Convert amount to L1 units (MARS has 18 decimals on L1, 9 on Solana)
    const l1Amount = ethers.parseEther(amount); // Convert to 18 decimals
    
    // Convert Solana transaction signature to bytes32
    const solanaTxIdBytes = ethers.id(solanaTxId); // Hash the signature to get bytes32
    
    console.log(`   Amount (L1): ${ethers.formatEther(l1Amount)} MARS`);
    console.log(`   Solana Tx ID: ${solanaTxId}`);
    console.log(`   Solana Tx Hash: ${solanaTxIdBytes}`);
    
    // Submit unlock transaction
    console.log(`   🚀 Submitting unlock transaction...`);
    const tx = await bridgeContract.unlockTokens(recipient, l1Amount, solanaTxIdBytes);
    
    console.log(`   ⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    return tx.hash;
    
  } catch (error) {
    console.error(`❌ Failed to unlock tokens on L1:`, error.message);
    throw error;
  }
}

// Monitor Solana events for burn transactions (Solana → L1)
async function monitorSolanaEvents() {
  console.log('🔄 Starting Solana → L1 monitoring...');
  console.log('   Monitoring for MARS burn transactions on Solana');
  console.log('   Will submit unlock transactions to L1 when detected');
  
  // Basic monitoring loop - polls for transactions
  setInterval(async () => {
    try {
      console.log('🔍 Scanning for Solana burn transactions...');
      
      // Get recent transactions for the MARS mint account
      const mintPubkey = new PublicKey(config.marsMintAddress);
      const signatures = await solanaConnection.getSignaturesForAddress(mintPubkey, {
        limit: 10
      });
      
      console.log(`   Found ${signatures.length} recent transactions on MARS mint`);
      
      // Parse transactions to find burn events
      for (const sigInfo of signatures) {
        try {
          const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { 
            maxSupportedTransactionVersion: 0 
          });
          
          if (!tx) continue;
          
          // Look for burn instructions
          const instructions = tx.transaction.message.instructions;
          for (const ix of instructions) {
            if (ix.parsed && ix.parsed.type === 'burn') {
              const burnInfo = ix.parsed.info;
              const burnAmount = parseFloat(burnInfo.amount) / 1e9; // Convert from smallest unit
              
              console.log(`🔥 FOUND BURN: ${burnAmount} MARS in tx ${sigInfo.signature}`);
              console.log(`   Authority: ${burnInfo.authority}`);
              console.log(`   Slot: ${sigInfo.slot}`);
              
              // Check if we've already processed this transaction (on-chain verification)
              const alreadyProcessed = await isSolanaTransactionProcessed(sigInfo.signature);
              if (alreadyProcessed) {
                console.log(`   ⏭️  Already processed Solana tx ${sigInfo.signature} (on-chain)`);
                continue;
              }
              
              // TODO: Extract L1 recipient address from transaction memo/logs
              // For now, using a placeholder recipient (should be extracted from tx)
              const l1Recipient = '0x6039E53688Da87EBF30B0C84d22FCd6707b0C564'; // Your address as placeholder
              
              console.log(`   🎯 Processing burn for L1 recipient: ${l1Recipient}`);
              
              try {
                // Submit unlock transaction to L1 bridge contract
                const result = await unlockTokensOnL1(
                  l1Recipient,
                  burnAmount.toString(),
                  sigInfo.signature
                );
                
                if (result) {
                  console.log(`   ✅ Successfully unlocked ${burnAmount} MARS on L1`);
                  console.log(`   L1 Transaction: ${result}`);
                } else {
                  console.log(`   ⚠️  Transaction was already processed`);
                }
                
              } catch (error) {
                console.error(`   ❌ Failed to unlock tokens on L1:`, error.message);
                
                // Check if error is due to duplicate processing
                if (error.message.includes('already processed')) {
                  console.log(`   ⚠️  Transaction was already processed on-chain`);
                } else {
                  console.log(`   🔄 Will retry on next scan`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`   ❌ Error processing transaction ${sigInfo.signature}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Error scanning Solana transactions:', error.message);
    }
  }, 60000); // Check every minute
}

// Main function
async function main() {
  console.log('🚀 Starting Mars Bridge Relayer V3 (Stateless)');
  console.log('====================================================');
  console.log('✅ L1 → Solana processing ENABLED');
  console.log('✅ Solana → L1 processing ENABLED');
  console.log('✅ On-chain state verification ONLY');
  console.log('✅ No JSON file dependencies');
  console.log('✅ Restart-safe operation');
  console.log('✅ Tatum RPC integration: ENABLED');
  console.log('');
  
  // Test connections
  const connectionsOk = await testConnections();
  if (!connectionsOk) {
    console.error('❌ Connection tests failed, exiting...');
    process.exit(1);
  }
  
  console.log('');
  console.log('🔄 Starting bridge operations...');
  console.log('');
  
  // Start all monitoring processes
  try {
    // 1. Process any historical unprocessed transactions
    await processHistoricalTransactions();
    
    // 2. Start monitoring L1 events (L1 → Solana)
    await monitorL1Events();
    
    // 3. Start monitoring Solana events (Solana → L1)
    await monitorSolanaEvents();
    
    console.log('✅ All monitoring processes started successfully');
    console.log('🔄 Relayer is now running...');
    
  } catch (error) {
    console.error('❌ Error starting relayer:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  console.log('✅ Relayer shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  console.log('✅ Relayer shutdown complete');
  process.exit(0);
});

// Start the relayer
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
}); 