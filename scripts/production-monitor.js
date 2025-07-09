#!/usr/bin/env node

const fetch = require('node-fetch');

console.log('🔍 Mars Bridge Production Monitor');
console.log('=================================');

class ProductionMonitor {
  constructor() {
    this.baseUrl = process.env.BRIDGE_API_URL || 'http://localhost:3000';
  }

  async checkHealth() {
    try {
      console.log('\n💓 Checking service health...');
      
      const response = await fetch(`${this.baseUrl}/api/health`);
      const health = await response.json();
      
      if (health.status === 'healthy') {
        console.log('✅ Service is healthy');
        console.log(`⏱️  Response time: ${health.responseTime}`);
        console.log(`🔢 Node version: ${health.nodeVersion}`);
        console.log(`📦 App version: ${health.version}`);
        
        // Environment status
        console.log('\n🌐 Environment variables:');
        Object.entries(health.environment).forEach(([key, value]) => {
          console.log(`  ${key}: ${value ? '✅' : '❌'}`);
        });
        
        // Queue status
        console.log('\n📋 Queue status:');
        console.log(`  Status: ${health.queue.status === 'healthy' ? '✅' : '❌'} ${health.queue.status}`);
        if (health.queue.stats) {
          console.log(`  Total: ${health.queue.stats.total}`);
          console.log(`  Pending: ${health.queue.stats.pending}`);
          console.log(`  Completed: ${health.queue.stats.completed}`);
          console.log(`  Failed: ${health.queue.stats.failed}`);
        }
      } else {
        console.log('❌ Service is unhealthy');
        console.log(`Error: ${health.error}`);
      }
      
      return health;
    } catch (error) {
      console.log('❌ Failed to check health');
      console.error('Error:', error.message);
      return null;
    }
  }

  async checkBridgeMonitor() {
    try {
      console.log('\n🌉 Checking bridge monitor...');
      
      const response = await fetch(`${this.baseUrl}/api/bridge/monitor`);
      const monitor = await response.json();
      
      if (monitor.status === 'success') {
        console.log('✅ Bridge monitor is working');
        
        // Statistics
        console.log('\n📊 Bridge statistics:');
        console.log(`  Total transactions: ${monitor.statistics.total}`);
        console.log(`  Pending: ${monitor.statistics.pending}`);
        console.log(`  Completed: ${monitor.statistics.completed}`);
        console.log(`  Failed: ${monitor.statistics.failed}`);
        console.log(`  Processing: ${monitor.statistics.processing}`);
        
        // Relayer wallet
        if (monitor.relayerWallet) {
          console.log('\n💰 Relayer wallet:');
          console.log(`  Address: ${monitor.relayerWallet.address}`);
          console.log(`  SOL balance: ${monitor.relayerWallet.sol.toFixed(6)} SOL`);
          if (monitor.relayerWallet.sol < 0.01) {
            console.log('  ⚠️  WARNING: Low SOL balance!');
          }
        }
        
        // Alerts
        console.log('\n🚨 Alerts:');
        if (monitor.alerts.failedTransactions > 0) {
          console.log(`  ❌ ${monitor.alerts.failedTransactions} failed transactions`);
        }
        if (monitor.alerts.pendingRetries > 0) {
          console.log(`  ⏳ ${monitor.alerts.pendingRetries} pending retries`);
        }
        if (monitor.alerts.lowSOLBalance) {
          console.log(`  💸 Low SOL balance warning`);
        }
        if (monitor.alerts.failedTransactions === 0 && monitor.alerts.pendingRetries === 0 && !monitor.alerts.lowSOLBalance) {
          console.log('  ✅ No alerts');
        }
        
        // Queue info
        if (monitor.queue.nextRetryTime) {
          console.log(`\n⏰ Next retry: ${new Date(monitor.queue.nextRetryTime).toLocaleString()}`);
        }
        if (monitor.queue.oldestPending) {
          console.log(`🕐 Oldest pending: ${new Date(monitor.queue.oldestPending).toLocaleString()}`);
        }
        
        // Recent transactions
        if (monitor.recentTransactions.length > 0) {
          console.log('\n📋 Recent transactions:');
          monitor.recentTransactions.slice(0, 5).forEach(tx => {
            const status = tx.status === 'completed' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';
            console.log(`  ${status} ${tx.id} - ${tx.amount} MARS to ${tx.recipient.slice(0, 8)}...`);
          });
        }
      } else {
        console.log('❌ Bridge monitor error');
        console.log(`Error: ${monitor.error}`);
      }
      
      return monitor;
    } catch (error) {
      console.log('❌ Failed to check bridge monitor');
      console.error('Error:', error.message);
      return null;
    }
  }

  async runFullCheck() {
    console.log(`🔍 Monitoring bridge at: ${this.baseUrl}`);
    console.log(`📅 Check time: ${new Date().toLocaleString()}`);
    
    const health = await this.checkHealth();
    const monitor = await this.checkBridgeMonitor();
    
    console.log('\n' + '='.repeat(50));
    
    if (health && monitor) {
      console.log('✅ Full monitoring check completed successfully');
      
      // Overall status
      const hasIssues = 
        health.status !== 'healthy' ||
        monitor.alerts.failedTransactions > 0 ||
        monitor.alerts.lowSOLBalance;
      
      if (hasIssues) {
        console.log('⚠️  Issues detected - please review alerts above');
        process.exit(1);
      } else {
        console.log('🎉 All systems operational');
        process.exit(0);
      }
    } else {
      console.log('❌ Monitoring check failed');
      process.exit(1);
    }
  }

  async watchMode() {
    console.log('👁️  Starting watch mode (checks every 30 seconds)');
    console.log('Press Ctrl+C to stop...\n');
    
    const runCheck = async () => {
      await this.runFullCheck();
      console.log('\n' + '⏰ Next check in 30 seconds...\n');
    };
    
    // Run initial check
    await runCheck();
    
    // Set up interval
    setInterval(runCheck, 30000);
  }
}

// CLI interface
const args = process.argv.slice(2);
const monitor = new ProductionMonitor();

if (args.includes('--watch') || args.includes('-w')) {
  monitor.watchMode().catch(error => {
    console.error('❌ Watch mode failed:', error);
    process.exit(1);
  });
} else {
  monitor.runFullCheck().catch(error => {
    console.error('❌ Monitoring check failed:', error);
    process.exit(1);
  });
} 