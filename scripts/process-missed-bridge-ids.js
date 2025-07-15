#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  createMintToInstruction 
} = require('@solana/spl-token');
const dotenv = require('dotenv');

dotenv.config();

// Configuration (same as V3 relayer)
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
  console.error('❌ Invalid Solana RPC URL:', config.solanaRpcUrl);
  console.error('💡 Falling back to default Solana mainnet RPC');
  config.solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
}

// Initialize connections
const l1Wallet = new ethers.Wallet(config.l1PrivateKey, new ethers.JsonRpcProvider(config.l1RpcUrl));

// Create Solana connection
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
} else {
  solanaConnection = new Connection(config.solanaRpcUrl);
}

const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));

// Bridge contract ABI
const bridgeABI = [
  'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
];

const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Wallet);

// Check if a bridge ID was actually processed on Solana
async function isBridgeIdProcessedOnSolana(bridgeEvent) {
  const recipient = bridgeEvent.args.solanaRecipient;
  const amount = ethers.formatEther(bridgeEvent.args.amount);
  
  try {
    const recipientPubkey = new PublicKey(recipient);
    const mintPubkey = new PublicKey(config.marsMintAddress);
    
    // Get associated token account
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      recipientPubkey
    );
    
    // Get recent transactions for this token account
    const signatures = await solanaConnection.getSignaturesForAddress(associatedTokenAccount, {
      limit: 50
    });
    
    // Look for mint transactions that match the expected amount
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
            const mintAmount = parseFloat(mintInfo.amount) / 1e9; // Convert from smallest unit
            
            // Check if this mint matches our expected amount (within 0.001 MARS tolerance)
            if (Math.abs(mintAmount - parseFloat(amount)) < 0.001) {
              return true; // Found matching mint transaction
            }
          }
        }
      } catch (error) {
        // Skip problematic transactions
        continue;
      }
    }
    
    return false; // No matching mint found
    
  } catch (error) {
    console.log(`   ⚠️  Could not verify Solana minting: ${error.message}`);
    return false; // Assume not processed if we can't verify
  }
}

// Mint tokens on Solana
async function mintTokensOnSolana(recipient, amount, bridgeId, l1TxHash) {
  console.log(`🎯 Minting ${amount} MARS to ${recipient} for Bridge ID ${bridgeId}`);
  
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
      console.log('   📝 Creating associated token account...');
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
      console.log('   ✅ Token account created:', createAccountSignature);
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
    
    console.log(`   ✅ Successfully minted ${amount} MARS to ${recipient}`);
    console.log(`   📝 Solana Transaction: ${signature}`);
    console.log(`   📝 L1 Transaction: ${l1TxHash}`);
    
    return signature;
    
  } catch (error) {
    console.error(`   ❌ Failed to mint tokens for Bridge ID ${bridgeId}:`, error.message);
    throw error;
  }
}

// Process missed bridge IDs
async function processMissedBridgeIds() {
  console.log('🔍 Processing Missed Bridge IDs');
  console.log('===============================');
  console.log('');
  
  try {
    // Get all TokensLocked events
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    console.log(`📊 Found ${events.length} total bridge transactions`);
    
    // Focus on recent transactions (Bridge IDs >= 29)
    const recentEvents = events.filter(event => {
      const bridgeId = parseInt(event.args.bridgeId.toString());
      return bridgeId >= 29; // Transactions that might have been missed
    });
    
    console.log(`🎯 Found ${recentEvents.length} recent bridge transactions (ID >= 29)`);
    console.log('');
    
    let processedCount = 0;
    let alreadyProcessedCount = 0;
    let errorCount = 0;
    
    for (const event of recentEvents) {
      const bridgeId = event.args.bridgeId.toString();
      const amount = ethers.formatEther(event.args.amount);
      const recipient = event.args.solanaRecipient;
      
      console.log(`🔄 Checking Bridge ID ${bridgeId}:`);
      console.log(`   Amount: ${amount} MARS`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   L1 Tx: ${event.transactionHash}`);
      
      // Check if transaction has enough confirmations (30 blocks)
      const currentBlock = await l1Wallet.provider.getBlockNumber();
      const confirmations = currentBlock - event.blockNumber;
      
      if (confirmations < 30) {
        console.log(`   ⏳ Only ${confirmations} confirmations, needs 30. Skipping for now.`);
        continue;
      }
      
      // Check if already processed on Solana
      const alreadyProcessed = await isBridgeIdProcessedOnSolana(event);
      
      if (alreadyProcessed) {
        console.log(`   ✅ Already processed on Solana, skipping`);
        alreadyProcessedCount++;
      } else {
        console.log(`   🚨 NOT processed on Solana, processing now...`);
        
        try {
          await mintTokensOnSolana(
            recipient,
            amount,
            bridgeId,
            event.transactionHash
          );
          processedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to process Bridge ID ${bridgeId}: ${error.message}`);
          errorCount++;
        }
      }
      
      console.log('');
    }
    
    console.log('📊 Processing Summary:');
    console.log('=====================');
    console.log(`✅ Successfully processed: ${processedCount}`);
    console.log(`⏭️  Already processed: ${alreadyProcessedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total checked: ${recentEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error processing missed bridge IDs:', error.message);
  }
}

// Run the processing
processMissedBridgeIds().catch(console.error); 