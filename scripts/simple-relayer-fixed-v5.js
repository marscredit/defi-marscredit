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
  marsMintAddress: process.env.MARS_MINT_ADDRESS,
  // Production timing configuration
  solanaMonitoringInterval: 5 * 60 * 1000, // 5 minutes
  confirmationCheckInterval: 60 * 1000, // 1 minute
  baseDelay: 3000, // 3 seconds base delay
  maxRetries: 3,
  backoffMultiplier: 2
};

// Debug: Show what environment variables are loaded (safely)
console.log('🔍 Environment Variables Check:');
console.log('   RELAYER_PRIVATE_KEY:', process.env.RELAYER_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('   BRIDGE_CONTRACT_ADDRESS:', process.env.BRIDGE_CONTRACT_ADDRESS || '❌ Missing');
console.log('   SOLANA_PRIVATE_KEY:', process.env.SOLANA_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('   MARS_MINT_ADDRESS:', process.env.MARS_MINT_ADDRESS || '❌ Missing');
console.log('   SOLANA_RPC_URL:', process.env.SOLANA_RPC_URL || '❌ Missing (will use default)');
console.log('   SOLANA_RPC_API_KEY:', process.env.SOLANA_RPC_API_KEY ? '✅ Set' : '❌ Missing');
console.log('');

// Debug: Show resolved config
console.log('📝 Resolved Configuration:');
console.log('   L1 RPC URL:', config.l1RpcUrl);
console.log('   Solana RPC URL:', config.solanaRpcUrl);
console.log('   Bridge Contract:', config.bridgeContractAddress);
console.log('   MARS Mint:', config.marsMintAddress);
console.log('   Solana Monitor Interval:', config.solanaMonitoringInterval / 1000, 'seconds');
console.log('   Confirmation Check Interval:', config.confirmationCheckInterval / 1000, 'seconds');
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

// Create Solana connection with proper API key handling
let solanaConnection;
const solanaApiKey = process.env.SOLANA_RPC_API_KEY;

if (solanaApiKey && config.solanaRpcUrl.includes('tatum.io')) {
  console.log('🔑 Using Tatum API key for Solana connection');
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
  console.log('🔑 Using Helius API key for Solana connection');
  solanaConnection = new Connection(config.solanaRpcUrl, {
    commitment: 'confirmed'
  });
} else {
  console.log('🔗 Using Solana RPC:', config.solanaRpcUrl);
  solanaConnection = new Connection(config.solanaRpcUrl, {
    commitment: 'confirmed'
  });
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

// Cache for mint transactions (updated periodically)
let mintTransactionCache = new Map(); // bridgeId -> solanaTxSignature

// Enhanced delay function with exponential backoff
async function delay(ms, attempt = 0) {
  const backoffDelay = ms * Math.pow(config.backoffMultiplier, attempt);
  const maxDelay = 30000; // Cap at 30 seconds
  const actualDelay = Math.min(backoffDelay, maxDelay);
  
  if (attempt > 0) {
    console.log(`   ⏳ Backoff delay: ${actualDelay}ms (attempt ${attempt + 1})`);
  }
  
  return new Promise(resolve => setTimeout(resolve, actualDelay));
}

// Enhanced retry function with exponential backoff
async function retryWithBackoff(fn, context = '', maxRetries = config.maxRetries) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limiting error
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        console.log(`   ⚠️  Rate limit hit for ${context} (attempt ${attempt + 1}/${maxRetries})`);
        
        if (attempt < maxRetries - 1) {
          await delay(config.baseDelay, attempt);
          continue;
        }
      }
      
      // For other errors, retry with normal backoff
      if (attempt < maxRetries - 1) {
        console.log(`   ⚠️  Error in ${context} (attempt ${attempt + 1}/${maxRetries}): ${error.message}`);
        await delay(config.baseDelay, attempt);
        continue;
      }
    }
  }
  
  throw lastError;
}

// Get ALL mint transactions from the MARS mint (with pagination)
async function getAllMintTransactions() {
  console.log('🔍 Fetching all MARS mint transactions...');
  const mintPubkey = new PublicKey(config.marsMintAddress);
  const allSignatures = [];
  let before = null;
  let page = 0;
  
  try {
    while (true) {
      page++;
      const options = { limit: 1000 };
      if (before) options.before = before;
      
      const batch = await retryWithBackoff(
        () => solanaConnection.getSignaturesForAddress(mintPubkey, options),
        `fetching mint signatures page ${page}`
      );
      
      if (batch.length === 0) {
        break; // No more transactions
      }
      
      allSignatures.push(...batch);
      before = batch[batch.length - 1].signature;
      
      console.log(`   📄 Page ${page}: Found ${batch.length} transactions (total: ${allSignatures.length})`);
      
      // Add delay between pages to avoid rate limits
      await delay(1000);
    }
    
    console.log(`✅ Found ${allSignatures.length} total mint transactions`);
    return allSignatures;
    
  } catch (error) {
    console.error('❌ Error fetching mint transactions:', error.message);
    return allSignatures; // Return what we got
  }
}

// Parse mint transactions and build cache
async function buildMintTransactionCache(signatures) {
  console.log('🔨 Building mint transaction cache...');
  mintTransactionCache.clear();
  let processedCount = 0;
  let mintCount = 0;
  
  for (const sigInfo of signatures) {
    processedCount++;
    
    // Progress update every 100 transactions
    if (processedCount % 100 === 0) {
      console.log(`   Processing ${processedCount}/${signatures.length} transactions...`);
    }
    
    try {
      // Add small delay to avoid rate limiting
      if (processedCount % 10 === 0) {
        await delay(500);
      }
      
      const tx = await retryWithBackoff(
        () => solanaConnection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0
        }),
        `parsing tx ${sigInfo.signature.substring(0, 8)}`,
        2 // Fewer retries for individual transactions
      );
      
      if (!tx || !tx.transaction) continue;
      
      // Look for mintTo instruction
      let mintInfo = null;
      let bridgeIdFromMemo = null;
      
      for (const ix of tx.transaction.message.instructions) {
        // Check for mintTo
        if (ix.parsed && ix.parsed.type === 'mintTo') {
          mintInfo = {
            recipient: ix.parsed.info.account,
            amount: parseFloat(ix.parsed.info.amount) / 1e9, // Convert to MARS
            signature: sigInfo.signature,
            slot: sigInfo.slot,
            blockTime: sigInfo.blockTime
          };
        }
        
        // Check for memo with Bridge ID
        if (ix.programId && ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
          if (ix.data) {
            try {
              const memoText = Buffer.from(ix.data, 'base64').toString('utf-8');
              const bridgeIdMatch = memoText.match(/Bridge ID: (\d+)/);
              if (bridgeIdMatch) {
                bridgeIdFromMemo = bridgeIdMatch[1];
              }
            } catch (e) {
              // Invalid memo, skip
            }
          }
        }
      }
      
      if (mintInfo) {
        mintCount++;
        
        // If we have a Bridge ID from memo, use that as the key
        if (bridgeIdFromMemo) {
          mintTransactionCache.set(`bridge-${bridgeIdFromMemo}`, mintInfo);
          console.log(`   ✅ Found Bridge ID ${bridgeIdFromMemo}: ${mintInfo.amount} MARS to ${mintInfo.recipient.substring(0, 8)}...`);
        } else {
          // For historical transactions without Bridge ID, use amount-recipient as key
          const key = `legacy-${mintInfo.amount}-${mintInfo.recipient}`;
          mintTransactionCache.set(key, mintInfo);
        }
      }
      
    } catch (error) {
      // Skip problematic transactions
      continue;
    }
  }
  
  console.log(`✅ Cache built: ${mintCount} mint transactions found`);
  console.log(`   Bridge IDs with memos: ${Array.from(mintTransactionCache.keys()).filter(k => k.startsWith('bridge-')).length}`);
  console.log(`   Legacy mints (no Bridge ID): ${Array.from(mintTransactionCache.keys()).filter(k => k.startsWith('legacy-')).length}`);
}

// Check if a bridge ID was already processed
async function isBridgeIdProcessed(bridgeId, recipient, amount) {
  // First check if we have this Bridge ID with memo
  if (mintTransactionCache.has(`bridge-${bridgeId}`)) {
    console.log(`   ✅ Bridge ID ${bridgeId} found in cache (has memo)`);
    return true;
  }
  
  // For historical bridges, check by amount-recipient
  const legacyKey = `legacy-${amount}-${recipient}`;
  if (mintTransactionCache.has(legacyKey)) {
    const mintInfo = mintTransactionCache.get(legacyKey);
    console.log(`   ⚠️  Bridge ID ${bridgeId}: Found potential legacy match (${amount} MARS to ${recipient.substring(0, 8)}...)`);
    
    // For legacy matches, we need to be more careful
    // Only consider it processed if it's relatively recent (within 3 months)
    const threeMonthsAgo = Date.now() / 1000 - (90 * 24 * 60 * 60);
    if (mintInfo.blockTime && mintInfo.blockTime > threeMonthsAgo) {
      console.log(`     ✅ Legacy mint is recent (within 3 months), considering as processed`);
      return true;
    } else {
      console.log(`     ❓ Legacy mint is old or no timestamp, will process as new`);
      return false;
    }
  }
  
  console.log(`   ❌ Bridge ID ${bridgeId} not found in mint history`);
  return false;
}

// Test connections
async function testConnections() {
  console.log('🔧 Testing connections...');
  
  try {
    // Test L1 connection
    const l1Block = await new ethers.JsonRpcProvider(config.l1RpcUrl).getBlockNumber();
    console.log('✅ L1 connection OK, block:', l1Block);
    
    // Test Solana connection
    const slot = await retryWithBackoff(
      () => solanaConnection.getSlot(),
      'Solana connection test'
    );
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

// Mint tokens on Solana (L1 → Solana)
async function mintTokensOnSolana(recipient, amount, bridgeId, l1TxHash) {
  console.log(`🎯 Minting ${amount} MARS to ${recipient} for Bridge ID ${bridgeId}`);
  console.log(`   L1 Transaction Hash: ${l1TxHash}`);
  
  try {
    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    // Get associated token account
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      recipientPubkey
    );
    
    // Check if token account exists and create if needed
    const accountInfo = await retryWithBackoff(
      () => solanaConnection.getAccountInfo(associatedTokenAccount),
      `getting account info for ${recipient.substring(0, 8)}...`
    );
    
    if (!accountInfo) {
      console.log('📝 Creating associated token account...');
      const createAccountTx = new (require('@solana/web3.js')).Transaction();
      createAccountTx.add(
        createAssociatedTokenAccountInstruction(
          solanaWallet.publicKey,
          associatedTokenAccount,
          recipientPubkey,
          mintPubkey
        )
      );
      
      const createAccountSignature = await retryWithBackoff(
        () => solanaConnection.sendTransaction(createAccountTx, [solanaWallet]),
        `creating token account for ${recipient.substring(0, 8)}...`
      );
      
      await retryWithBackoff(
        () => solanaConnection.confirmTransaction(createAccountSignature, 'confirmed'),
        `confirming token account creation`
      );
      
      console.log('✅ Token account created:', createAccountSignature);
    }
    
    // Convert amount to smallest unit (MARS has 9 decimals)
    const amountInSmallestUnit = Math.floor(parseFloat(amount) * 1000000000);
    
    // Create mint transaction WITH Bridge ID memo
    const { Transaction, TransactionInstruction } = require('@solana/web3.js');
    const mintTx = new Transaction();
    
    // CRITICAL: Add memo instruction with Bridge ID for future tracking
    const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    const memoData = Buffer.from(`Bridge ID: ${bridgeId}`, 'utf-8');
    mintTx.add(
      new TransactionInstruction({
        keys: [],
        programId: memoProgram,
        data: memoData
      })
    );
    
    // Add mint instruction
    mintTx.add(
      createMintToInstruction(
        mintPubkey,
        associatedTokenAccount,
        solanaWallet.publicKey,
        amountInSmallestUnit
      )
    );
    
    // Send transaction
    const signature = await retryWithBackoff(
      () => solanaConnection.sendTransaction(mintTx, [solanaWallet]),
      `minting ${amount} MARS`
    );
    
    await retryWithBackoff(
      () => solanaConnection.confirmTransaction(signature, 'confirmed'),
      `confirming mint transaction`
    );
    
    console.log(`✅ Minted ${amount} MARS to ${recipient}`);
    console.log(`   Solana Transaction: ${signature}`);
    console.log(`   Bridge ID: ${bridgeId} completed`);
    
    // Update cache with new mint
    mintTransactionCache.set(`bridge-${bridgeId}`, {
      recipient: associatedTokenAccount.toString(),
      amount: parseFloat(amount),
      signature: signature,
      slot: null,
      blockTime: Date.now() / 1000
    });
    
    return signature;
    
  } catch (error) {
    console.error(`❌ Failed to mint tokens for Bridge ID ${bridgeId}:`, error.message);
    throw error;
  }
}

// Process historical L1 → Solana transactions
async function processHistoricalTransactions() {
  console.log('📜 Checking for historical unprocessed transactions...');
  
  try {
    // Build the mint transaction cache first
    const allMintTxs = await getAllMintTransactions();
    await buildMintTransactionCache(allMintTxs);
    
    // Get all TokensLocked events from the beginning
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`🔍 Found ${events.length} historical bridge transactions`);
    
    for (const event of events) {
      const bridgeId = event.args.bridgeId.toString();
      const recipient = event.args.solanaRecipient;
      const amount = ethers.formatEther(event.args.amount);
      
      // Check if this bridge ID was already processed
      const alreadyProcessed = await isBridgeIdProcessed(bridgeId, recipient, parseFloat(amount));
      if (alreadyProcessed) {
        console.log(`⏭️  Bridge ID ${bridgeId} already processed, skipping`);
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
      console.log(`   Amount: ${amount} MARS`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   Confirmations: ${confirmations}`);
      
      try {
        await mintTokensOnSolana(
          recipient,
          amount,
          bridgeId,
          event.transactionHash
        );
        
        console.log(`✅ Successfully processed Bridge ID ${bridgeId}`);
        
        // Add delay between processing
        await delay(config.baseDelay);
        
      } catch (error) {
        console.error(`❌ Failed to process Bridge ID ${bridgeId}:`, error.message);
        // Continue processing other transactions
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
    
    const txHash = event.log?.transactionHash || event.transactionHash || event.log?.hash;
    
    if (!txHash) {
      console.log('❌ Could not get transaction hash from event');
      return;
    }
    
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
      bridgeId: bridgeId.toString()
    });
  });
}

// Poll for confirmations before processing L1 → Solana transactions
async function pollForConfirmations(event, user, amount, solanaRecipient, bridgeId) {
  const startTime = Date.now();
  const maxWaitTime = 20 * 60 * 1000; // 20 minutes max wait
  
  console.log(`⏳ Starting confirmation polling for Bridge ID ${bridgeId.toString()}`);
  
  let transactionBlock = null;
  try {
    const receipt = await l1Wallet.provider.getTransactionReceipt(event.transactionHash);
    if (receipt) {
      transactionBlock = receipt.blockNumber;
      console.log(`   Block: ${transactionBlock}, waiting for 30 confirmations...`);
    }
  } catch (error) {
    console.log('   Transaction receipt not yet available');
  }
  
  const checkConfirmations = async () => {
    try {
      if (!transactionBlock) {
        try {
          const receipt = await l1Wallet.provider.getTransactionReceipt(event.transactionHash);
          if (receipt) {
            transactionBlock = receipt.blockNumber;
            console.log(`📍 Got transaction block: ${transactionBlock}`);
          } else {
            console.log(`⏳ Bridge ID ${bridgeId.toString()}: Transaction not yet mined`);
            setTimeout(() => checkConfirmations(), config.confirmationCheckInterval);
            return;
          }
        } catch (error) {
          console.log(`⏳ Bridge ID ${bridgeId.toString()}: Could not get receipt yet`);
          setTimeout(() => checkConfirmations(), config.confirmationCheckInterval);
          return;
        }
      }
      
      const currentBlock = await l1Wallet.provider.getBlockNumber();
      const confirmations = currentBlock - transactionBlock;
      
      console.log(`📊 Bridge ID ${bridgeId.toString()}: ${confirmations}/30 confirmations`);
      
      if (confirmations >= 30) {
        console.log(`✅ Bridge ID ${bridgeId.toString()} has 30+ confirmations, processing...`);
        
        // Check if already processed
        const alreadyProcessed = await isBridgeIdProcessed(
          bridgeId.toString(),
          solanaRecipient,
          parseFloat(ethers.formatEther(amount))
        );
        
        if (!alreadyProcessed) {
          try {
            await mintTokensOnSolana(
              solanaRecipient,
              ethers.formatEther(amount),
              bridgeId.toString(),
              event.transactionHash
            );
            
            console.log(`🎉 Successfully processed Bridge ID ${bridgeId.toString()}`);
            
          } catch (error) {
            console.error(`❌ Failed to mint for Bridge ID ${bridgeId.toString()}:`, error.message);
            setTimeout(() => checkConfirmations(), config.confirmationCheckInterval);
          }
        } else {
          console.log(`⏭️  Bridge ID ${bridgeId.toString()} already processed`);
        }
        return;
      }
      
      // Check timeout
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > maxWaitTime) {
        console.error(`⚠️ Bridge ID ${bridgeId.toString()} timeout after 20 minutes`);
        return;
      }
      
      setTimeout(() => checkConfirmations(), config.confirmationCheckInterval);
      
    } catch (error) {
      console.error(`❌ Error checking confirmations for Bridge ID ${bridgeId.toString()}:`, error.message);
      setTimeout(() => checkConfirmations(), config.confirmationCheckInterval);
    }
  };
  
  checkConfirmations();
}

// Check if Solana transaction was already processed (for Solana → L1)
async function isSolanaTransactionProcessed(solanaTxId) {
  try {
    const solanaTxIdBytes = ethers.id(solanaTxId);
    return await bridgeContract.isSolanaTxProcessed(solanaTxIdBytes);
  } catch (error) {
    console.error('❌ Error checking Solana transaction status:', error.message);
    return false;
  }
}

// Unlock tokens on L1 (Solana → L1)
async function unlockTokensOnL1(recipient, amount, solanaTxId) {
  console.log(`🔓 Unlocking ${amount} MARS on L1 for ${recipient}`);
  
  try {
    const l1Amount = ethers.parseEther(amount);
    const solanaTxIdBytes = ethers.id(solanaTxId);
    
    console.log(`   Amount (L1): ${ethers.formatEther(l1Amount)} MARS`);
    console.log(`   Solana Tx ID: ${solanaTxId}`);
    
    const tx = await bridgeContract.unlockTokens(recipient, l1Amount, solanaTxIdBytes);
    console.log(`   ⏳ Waiting for confirmation...`);
    await tx.wait();
    
    return tx.hash;
    
  } catch (error) {
    console.error(`❌ Failed to unlock tokens on L1:`, error.message);
    throw error;
  }
}

// Monitor Solana events for burn transactions (Solana → L1)
async function monitorSolanaEvents() {
  console.log('🔄 Starting Solana → L1 monitoring...');
  console.log(`   Checking every ${config.solanaMonitoringInterval / 1000} seconds`);
  
  // Periodically refresh mint cache and check for burns
  setInterval(async () => {
    try {
      console.log('🔍 Refreshing mint cache and checking for burns...');
      
      // Get recent transactions (last 100 for burn detection)
      const mintPubkey = new PublicKey(config.marsMintAddress);
      const signatures = await retryWithBackoff(
        () => solanaConnection.getSignaturesForAddress(mintPubkey, { limit: 100 }),
        'getting recent MARS mint signatures'
      );
      
      console.log(`   Found ${signatures.length} recent transactions`);
      
      // Check for burns
      for (const sigInfo of signatures) {
        try {
          await delay(config.baseDelay / 3); // Small delay
          
          const tx = await retryWithBackoff(
            () => solanaConnection.getParsedTransaction(sigInfo.signature, { 
              maxSupportedTransactionVersion: 0 
            }),
            `parsing transaction`,
            2
          );
          
          if (!tx) continue;
          
          // Look for burn instructions
          for (const ix of tx.transaction.message.instructions) {
            if (ix.parsed && ix.parsed.type === 'burn') {
              const burnInfo = ix.parsed.info;
              const burnAmount = parseFloat(burnInfo.amount) / 1e9;
              
              console.log(`🔥 FOUND BURN: ${burnAmount} MARS in tx ${sigInfo.signature}`);
              console.log(`   Authority: ${burnInfo.authority}`);
              
              // Check if already processed on L1
              const alreadyProcessed = await isSolanaTransactionProcessed(sigInfo.signature);
              if (alreadyProcessed) {
                console.log(`   ⏭️  Already processed on L1`);
                continue;
              }
              
              // TODO: Extract L1 recipient from memo/instruction data
              // For now, using placeholder
              const l1Recipient = '0x6039E53688Da87EBF30B0C84d22FCd6707b0C564';
              
              console.log(`   🎯 Processing burn for L1 recipient: ${l1Recipient}`);
              
              try {
                const result = await unlockTokensOnL1(
                  l1Recipient,
                  burnAmount.toString(),
                  sigInfo.signature
                );
                
                if (result) {
                  console.log(`   ✅ Successfully unlocked ${burnAmount} MARS on L1`);
                  console.log(`   L1 Transaction: ${result}`);
                }
                
              } catch (error) {
                console.error(`   ❌ Failed to unlock:`, error.message);
                if (error.message.includes('already processed')) {
                  console.log(`   ⚠️  Transaction was already processed on-chain`);
                }
              }
            }
          }
        } catch (error) {
          // Skip problematic transactions
          continue;
        }
      }
      
    } catch (error) {
      console.error('❌ Error in Solana monitoring:', error.message);
    }
  }, config.solanaMonitoringInterval);
}

// Refresh cache periodically (every 30 minutes)
async function startCacheRefresh() {
  setInterval(async () => {
    console.log('🔄 Refreshing mint transaction cache...');
    const allMintTxs = await getAllMintTransactions();
    await buildMintTransactionCache(allMintTxs);
  }, 30 * 60 * 1000); // 30 minutes
}

// Main function
async function main() {
  console.log('🚀 Starting Mars Bridge Relayer V5 (Proper Architecture)');
  console.log('====================================================');
  console.log('✅ Queries ALL mint transactions from MARS mint');
  console.log('✅ Bridge ID tracking via memos (future-proof)');
  console.log('✅ No arbitrary transaction limits');
  console.log('✅ Handles historical bridges intelligently');
  console.log('✅ L1 → Solana: Check mint history for duplicates');
  console.log('✅ Solana → L1: Contract prevents duplicates');
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
  
  try {
    // 1. Process any historical unprocessed transactions
    await processHistoricalTransactions();
    
    // 2. Start monitoring L1 events (L1 → Solana)
    await monitorL1Events();
    
    // 3. Start monitoring Solana events (Solana → L1)
    await monitorSolanaEvents();
    
    // 4. Start periodic cache refresh
    await startCacheRefresh();
    
    console.log('✅ All monitoring processes started successfully');
    console.log('🔄 Relayer is now running with proper architecture...');
    console.log(`   📊 Mint cache refreshes every 30 minutes`);
    console.log(`   📊 Solana burn checks every ${config.solanaMonitoringInterval / 1000} seconds`);
    console.log(`   📊 L1 confirmations every ${config.confirmationCheckInterval / 1000} seconds`);
    
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
