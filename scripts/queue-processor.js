#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

console.log('🔄 Mars Bridge Queue Processor');
console.log('==============================');

class QueueProcessor {
  constructor() {
    this.queueFile = path.join(__dirname, '../data/bridge-queue.json');
    this.isProcessing = false;
    this.processInterval = null;
    this.retryDelays = [5000, 30000, 300000, 1800000]; // 5s, 30s, 5m, 30m
  }

  async start() {
    console.log('🚀 Starting queue processor...');
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(this.queueFile), { recursive: true });
    
    // Start processing loop
    this.processInterval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('❌ Queue processing error:', error);
      });
    }, 10000); // Process every 10 seconds
    
    console.log('✅ Queue processor started');
    
    // Send ready message to parent
    if (process.send) {
      process.send('Queue processor ready');
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const queue = await this.loadQueue();
      const now = Date.now();
      
      // Find pending transactions ready for processing
      const pendingTransactions = queue.filter(item => 
        item.status === 'pending' && 
        item.nextAttempt <= now &&
        item.attempts < this.retryDelays.length
      );
      
      if (pendingTransactions.length === 0) {
        return;
      }
      
      console.log(`🔄 Processing ${pendingTransactions.length} pending transactions`);
      
      for (const transaction of pendingTransactions) {
        await this.processTransaction(transaction);
      }
      
      // Save updated queue
      await this.saveQueue(queue);
      
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processTransaction(transaction) {
    console.log(`🔄 Processing transaction ${transaction.id} (attempt ${transaction.attempts + 1})`);
    
    try {
      // Load environment variables
      const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
      const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const MARS_MINT = process.env.MARS_MINT_ADDRESS || 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b';
      
      if (!RELAYER_PRIVATE_KEY) {
        throw new Error('RELAYER_PRIVATE_KEY environment variable is required');
      }
      
      // Initialize Solana connection
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const relayerKeypair = Keypair.fromSecretKey(
        Buffer.from(RELAYER_PRIVATE_KEY.split(',').map(num => parseInt(num)))
      );
      
      const marsMint = new PublicKey(MARS_MINT);
      const recipientPubkey = new PublicKey(transaction.recipient);
      
      // Get or create associated token account
      const recipientATA = await getOrCreateAssociatedTokenAccount(
        connection,
        relayerKeypair,
        marsMint,
        recipientPubkey
      );
      
      // Mint tokens to recipient
      const signature = await mintTo(
        connection,
        relayerKeypair,
        marsMint,
        recipientATA.address,
        relayerKeypair,
        transaction.amount
      );
      
      // Update transaction status
      transaction.status = 'completed';
      transaction.solanaTransaction = signature;
      transaction.completedAt = new Date().toISOString();
      
      console.log(`✅ Transaction ${transaction.id} completed: ${signature}`);
      
      // Send completion message to parent
      if (process.send) {
        process.send(`Transaction ${transaction.id} completed: ${signature}`);
      }
      
    } catch (error) {
      console.error(`❌ Transaction ${transaction.id} failed:`, error);
      
      // Update attempt count and next attempt time
      transaction.attempts++;
      transaction.lastError = error.message;
      
      if (transaction.attempts >= this.retryDelays.length) {
        // Mark as failed after all retries
        transaction.status = 'failed';
        transaction.failedAt = new Date().toISOString();
        
        console.error(`💀 Transaction ${transaction.id} permanently failed after ${transaction.attempts} attempts`);
        
        // Send failure notification to parent
        if (process.send) {
          process.send(`Transaction ${transaction.id} permanently failed: ${error.message}`);
        }
      } else {
        // Schedule next retry
        const delay = this.retryDelays[transaction.attempts - 1];
        transaction.nextAttempt = Date.now() + delay;
        
        console.log(`⏳ Transaction ${transaction.id} will retry in ${delay / 1000}s`);
      }
    }
  }

  async loadQueue() {
    try {
      const data = await fs.readFile(this.queueFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async saveQueue(queue) {
    const data = JSON.stringify(queue, null, 2);
    await fs.writeFile(this.queueFile, data);
  }

  async stop() {
    console.log('🛑 Stopping queue processor...');
    
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    
    console.log('✅ Queue processor stopped');
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  if (global.queueProcessor) {
    await global.queueProcessor.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  if (global.queueProcessor) {
    await global.queueProcessor.stop();
  }
  process.exit(0);
});

// Start the queue processor
if (require.main === module) {
  const processor = new QueueProcessor();
  global.queueProcessor = processor;
  
  processor.start().catch(error => {
    console.error('❌ Failed to start queue processor:', error);
    process.exit(1);
  });
}

module.exports = { QueueProcessor }; 