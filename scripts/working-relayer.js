#!/usr/bin/env node

const { ethers } = require('ethers');
const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const { 
  mintTo, 
  getOrCreateAssociatedTokenAccount,
  getMint 
} = require('@solana/spl-token');

console.log('🌉 Mars Bridge Relayer (Working Version)');
console.log('=======================================');

// Configuration
const config = {
  l1RpcUrl: process.env.L1_RPC_URL || 'https://rpc.marscredit.xyz',
  l1PrivateKey: process.env.RELAYER_PRIVATE_KEY,
  bridgeContractAddress: process.env.BRIDGE_CONTRACT_ADDRESS || '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY ? 
    JSON.parse(process.env.SOLANA_PRIVATE_KEY) : 
    (() => { console.error('❌ SOLANA_PRIVATE_KEY environment variable is required'); process.exit(1); })(),
  marsMintAddress: process.env.MARS_MINT_ADDRESS || 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b',
  marsTokenAccount: process.env.MARS_TOKEN_ACCOUNT || '29zqmJEVmhXrqbDSW5TJYdGzPLvJQKLXzLwTWjqLf3J4'
};

// Initialize connections
const l1Provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
const l1Wallet = new ethers.Wallet(config.l1PrivateKey, l1Provider);
const solanaConnection = new Connection(config.solanaRpcUrl, 'confirmed');
const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));

// Bridge contract ABI
const bridgeABI = [
  'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
  'event TokensUnlocked(address indexed recipient, uint256 amount, bytes32 indexed solanaTxId, uint256 indexed bridgeId)',
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function isSolanaTxProcessed(bytes32 solanaTxId) external view returns (bool)'
];

const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Wallet);

// Track processed transactions
const processedTransactions = new Set();

async function testConnections() {
  console.log('🔧 Testing connections...');
  
  try {
    // Test L1 connection
    const l1Block = await l1Provider.getBlockNumber();
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
    
    // Test Solana mint
    const mintInfo = await getMint(solanaConnection, new PublicKey(config.marsMintAddress));
    console.log('✅ Solana mint OK');
    console.log('   Current Supply:', (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toFixed(6), 'MARS');
    console.log('   Mint Authority:', mintInfo.mintAuthority?.toString());
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function mintTokensOnSolana(recipientAddress, amount, bridgeId) {
  console.log(`🪙 Minting ${amount} MARS to ${recipientAddress} (Bridge ID: ${bridgeId})`);
  
  try {
    const mintPubkey = new PublicKey(config.marsMintAddress);
    const recipientPubkey = new PublicKey(recipientAddress);
    
    // Get or create associated token account for recipient
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      solanaConnection,
      solanaWallet,
      mintPubkey,
      recipientPubkey
    );
    
    console.log('   Recipient token account:', recipientTokenAccount.address.toString());
    
    // Convert amount to proper decimals (9 decimals for new MARS token)
    const amountWithDecimals = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, 9)));
    
    // Mint tokens
    const signature = await mintTo(
      solanaConnection,
      solanaWallet,
      mintPubkey,
      recipientTokenAccount.address,
      solanaWallet.publicKey,
      amountWithDecimals
    );
    
    console.log('✅ Minting successful!');
    console.log('   Transaction:', signature);
    console.log('   Amount:', amount, 'MARS');
    console.log('   Recipient:', recipientAddress);
    
    return signature;
  } catch (error) {
    console.error('❌ Minting failed:', error.message);
    throw error;
  }
}

async function processL1LockEvent(user, amount, solanaRecipient, bridgeId, txHash) {
  const transactionKey = `${bridgeId}-${txHash}`;
  
  if (processedTransactions.has(transactionKey)) {
    console.log(`⏭️  Already processed bridge ID ${bridgeId}, skipping...`);
    return;
  }
  
  console.log(`\n🔄 Processing L1 Lock Event:`);
  console.log(`   User: ${user}`);
  console.log(`   Amount: ${amount} MARS`);
  console.log(`   Solana Recipient: ${solanaRecipient}`);
  console.log(`   Bridge ID: ${bridgeId}`);
  console.log(`   TX Hash: ${txHash}`);
  
  try {
    // Mint tokens on Solana
    const solanaTxId = await mintTokensOnSolana(solanaRecipient, amount, bridgeId);
    
    // Mark as processed
    processedTransactions.add(transactionKey);
    
    console.log(`✅ Bridge transaction ${bridgeId} completed successfully!`);
    console.log(`   Solana TX: ${solanaTxId}`);
    
    return solanaTxId;
  } catch (error) {
    console.error(`❌ Failed to process bridge transaction ${bridgeId}:`, error.message);
    throw error;
  }
}

async function monitorL1Events() {
  console.log('\n👁️ Monitoring L1 events...');
  
  bridgeContract.on('TokensLocked', async (user, amount, solanaRecipient, bridgeId, event) => {
    const amountFormatted = ethers.formatEther(amount);
    
    console.log(`\n🔒 L1 Lock Event Detected:`);
    console.log(`   User: ${user}`);
    console.log(`   Amount: ${amountFormatted} MARS`);
    console.log(`   Solana Recipient: ${solanaRecipient}`);
    console.log(`   Bridge ID: ${bridgeId.toString()}`);
    console.log(`   TX Hash: ${event.transactionHash}`);
    
    try {
      await processL1LockEvent(
        user,
        amountFormatted,
        solanaRecipient,
        bridgeId.toString(),
        event.transactionHash
      );
    } catch (error) {
      console.error('❌ Event processing failed:', error.message);
    }
  });
  
  bridgeContract.on('TokensUnlocked', (recipient, amount, solanaTxId, bridgeId, event) => {
    console.log(`\n🔓 L1 Unlock Event:`);
    console.log(`   Recipient: ${recipient}`);
    console.log(`   Amount: ${ethers.formatEther(amount)} MARS`);
    console.log(`   Solana TX ID: ${solanaTxId}`);
    console.log(`   Bridge ID: ${bridgeId.toString()}`);
    console.log(`   TX Hash: ${event.transactionHash}`);
  });
}

async function processPendingTransactions() {
  console.log('\n🔄 Checking for pending transactions...');
  
  try {
    // Get recent TokensLocked events
    const currentBlock = await l1Provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000); // Last 10000 blocks
    
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, fromBlock, currentBlock);
    
    console.log(`   Found ${events.length} lock events in recent blocks`);
    
    for (const event of events) {
      const bridgeId = event.args.bridgeId.toString();
      const txHash = event.transactionHash;
      const transactionKey = `${bridgeId}-${txHash}`;
      
      if (!processedTransactions.has(transactionKey)) {
        console.log(`\n🔄 Processing pending transaction ${bridgeId}...`);
        
        try {
          await processL1LockEvent(
            event.args.user,
            ethers.formatEther(event.args.amount),
            event.args.solanaRecipient,
            bridgeId,
            txHash
          );
        } catch (error) {
          console.error(`❌ Failed to process pending transaction ${bridgeId}:`, error.message);
        }
      }
    }
    
    console.log('✅ Pending transaction processing complete');
  } catch (error) {
    console.error('❌ Error processing pending transactions:', error.message);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

async function main() {
  console.log('🚀 Starting working relayer...');
  
  // Test all connections
  const connectionsOK = await testConnections();
  if (!connectionsOK) {
    console.error('❌ Failed to connect to services');
    process.exit(1);
  }
  
  // Process any pending transactions first
  await processPendingTransactions();
  
  // Start monitoring new events
  await monitorL1Events();
  
  console.log('\n✅ Working relayer started successfully!');
  console.log('   Monitoring L1 events and processing bridge transactions...');
  
  // Keep alive with periodic status updates
  setInterval(async () => {
    try {
      const stats = await bridgeContract.getBridgeStats();
      const mintInfo = await getMint(solanaConnection, new PublicKey(config.marsMintAddress));
      const l1Locked = parseFloat(ethers.formatEther(stats[0]));
      const solanaSupply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
      
      console.log(`\n💓 Bridge Status (${new Date().toISOString()}):`);
      console.log(`   L1 Locked: ${l1Locked.toFixed(6)} MARS`);
      console.log(`   Solana Supply: ${solanaSupply.toFixed(6)} MARS`);
      console.log(`   Difference: ${(l1Locked - solanaSupply).toFixed(6)} MARS`);
      console.log(`   Processed TXs: ${processedTransactions.size}`);
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
    }
  }, 60000); // Every minute
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 