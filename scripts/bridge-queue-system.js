#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

console.log('🔄 Mars Bridge Queue System');
console.log('===========================');

// Queue system for failed bridge transactions
class BridgeQueue {
  constructor() {
    this.queueFile = path.join(__dirname, 'bridge-queue.json');
    this.retryDelays = [5000, 30000, 300000, 1800000]; // 5s, 30s, 5min, 30min
  }

  // Add failed transaction to queue
  async addToQueue(transaction) {
    const queueItem = {
      id: `${transaction.l1TxHash}-${Date.now()}`,
      l1TxHash: transaction.l1TxHash,
      amount: transaction.amount,
      recipient: transaction.recipient,
      bridgeId: transaction.bridgeId,
      attempts: 0,
      lastAttempt: null,
      status: 'pending',
      failureReason: transaction.failureReason || 'Unknown',
      createdAt: new Date().toISOString(),
      nextRetry: new Date(Date.now() + this.retryDelays[0]).toISOString()
    };

    await this.saveQueueItem(queueItem);
    console.log('📝 Added to queue:', queueItem.id);
    return queueItem.id;
  }

  // Get all pending queue items
  async getPendingItems() {
    try {
      const files = await fs.readdir(__dirname);
      const queueFiles = files.filter(f => f.startsWith('queue-') && f.endsWith('.json'));
      
      const items = [];
      for (const file of queueFiles) {
        try {
          const content = await fs.readFile(path.join(__dirname, file), 'utf8');
          const item = JSON.parse(content);
          if (item.status === 'pending' && new Date(item.nextRetry) <= new Date()) {
            items.push(item);
          }
        } catch (error) {
          console.warn('⚠️ Corrupted queue file:', file);
        }
      }
      
      return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch (error) {
      console.error('❌ Error reading queue:', error.message);
      return [];
    }
  }

  // Save queue item to file
  async saveQueueItem(item) {
    const filename = `queue-${item.id}.json`;
    const filepath = path.join(__dirname, filename);
    await fs.writeFile(filepath, JSON.stringify(item, null, 2));
  }

  // Mark transaction as completed
  async markCompleted(itemId, txSignature) {
    const filename = `queue-${itemId}.json`;
    const filepath = path.join(__dirname, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const item = JSON.parse(content);
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      item.solanaTxSignature = txSignature;
      
      await this.saveQueueItem(item);
      console.log('✅ Marked completed:', itemId);
    } catch (error) {
      console.error('❌ Error marking completed:', error.message);
    }
  }

  // Mark transaction as failed (max retries reached)
  async markFailed(itemId, reason) {
    const filename = `queue-${itemId}.json`;
    const filepath = path.join(__dirname, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const item = JSON.parse(content);
      item.status = 'failed';
      item.failedAt = new Date().toISOString();
      item.finalFailureReason = reason;
      
      await this.saveQueueItem(item);
      console.log('❌ Marked failed:', itemId);
      
      // Alert system
      await this.alertAdmins(item);
    } catch (error) {
      console.error('❌ Error marking failed:', error.message);
    }
  }

  // Update retry attempt
  async updateRetryAttempt(itemId, attempt, failureReason) {
    const filename = `queue-${itemId}.json`;
    const filepath = path.join(__dirname, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const item = JSON.parse(content);
      item.attempts = attempt;
      item.lastAttempt = new Date().toISOString();
      item.failureReason = failureReason;
      
      if (attempt < this.retryDelays.length) {
        item.nextRetry = new Date(Date.now() + this.retryDelays[attempt]).toISOString();
      } else {
        await this.markFailed(itemId, 'Max retries exceeded');
        return;
      }
      
      await this.saveQueueItem(item);
      console.log(`🔄 Updated retry attempt ${attempt} for:`, itemId);
    } catch (error) {
      console.error('❌ Error updating retry:', error.message);
    }
  }

  // Alert administrators
  async alertAdmins(item) {
    console.log('🚨 ADMIN ALERT: Bridge transaction permanently failed!');
    console.log('================================================');
    console.log('📋 Transaction Details:');
    console.log('   L1 TX Hash:', item.l1TxHash);
    console.log('   Amount:', item.amount, 'MARS');
    console.log('   Recipient:', item.recipient);
    console.log('   Attempts:', item.attempts);
    console.log('   Failure Reason:', item.finalFailureReason);
    console.log('');
    console.log('🛠️ Manual intervention required!');
    console.log('   Use: node scripts/manual-bridge-complete.js --queue-id=' + item.id);
  }

  // Get queue statistics
  async getStats() {
    try {
      const files = await fs.readdir(__dirname);
      const queueFiles = files.filter(f => f.startsWith('queue-') && f.endsWith('.json'));
      
      const stats = {
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        retrying: 0
      };
      
      for (const file of queueFiles) {
        try {
          const content = await fs.readFile(path.join(__dirname, file), 'utf8');
          const item = JSON.parse(content);
          stats.total++;
          stats[item.status]++;
        } catch (error) {
          // Skip corrupted files
        }
      }
      
      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Example usage and monitoring
async function monitorQueue() {
  const queue = new BridgeQueue();
  
  console.log('📊 Queue Statistics:');
  const stats = await queue.getStats();
  console.log('   Total:', stats.total);
  console.log('   Pending:', stats.pending);
  console.log('   Completed:', stats.completed);
  console.log('   Failed:', stats.failed);
  console.log('');
  
  const pendingItems = await queue.getPendingItems();
  if (pendingItems.length > 0) {
    console.log('⏳ Pending Queue Items:');
    pendingItems.forEach(item => {
      console.log(`   ${item.id}: ${item.amount} MARS to ${item.recipient} (attempt ${item.attempts})`);
    });
  } else {
    console.log('✅ No pending queue items');
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'monitor') {
    monitorQueue();
  } else if (command === 'stats') {
    new BridgeQueue().getStats().then(stats => {
      console.log('📊 Bridge Queue Statistics:', stats);
    });
  } else {
    console.log('🔄 Mars Bridge Queue System');
    console.log('Usage:');
    console.log('  node bridge-queue-system.js monitor   # Monitor current queue');
    console.log('  node bridge-queue-system.js stats     # Show queue statistics');
  }
}

module.exports = { BridgeQueue }; 