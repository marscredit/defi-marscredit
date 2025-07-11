#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🏭 Mars Credit Production Manager');
console.log('=================================');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('');

class ProductionManager {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
  }

  async start() {
    console.log('🚀 Starting all services...');
    
    try {
      // Start Next.js app in production mode
      await this.startNextJSApp();
      
      // Start bridge relayer
      await this.startBridgeRelayer();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('✅ All services started successfully!');
      console.log('');
      console.log('🌐 Services Running:');
      console.log('   • Web App: http://localhost:3000');
      console.log('   • Bridge Relayer: Active');
      console.log('   • Health Monitor: Active');
      console.log('');
      
      // Keep the process alive
      this.keepAlive();
      
    } catch (error) {
      console.error('❌ Failed to start services:', error);
      process.exit(1);
    }
  }

  async startNextJSApp() {
    return new Promise((resolve, reject) => {
      console.log('🌐 Starting Next.js application...');
      
      const nextApp = spawn('npm', ['start'], {
        env: { ...process.env, PORT: process.env.PORT || '3000' },
        stdio: ['inherit', 'pipe', 'pipe']
      });

      nextApp.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) console.log(`[NEXT] ${output}`);
        
        // Resolve when Next.js is ready
        if (output.includes('Ready') || output.includes('started server')) {
          console.log('✅ Next.js app started');
          resolve();
        }
      });

      nextApp.stderr.on('data', (data) => {
        console.log(`[NEXT] ${data.toString().trim()}`);
      });

      nextApp.on('exit', (code) => {
        console.error(`❌ Next.js app exited with code ${code}`);
        if (!this.isShuttingDown) {
          // Restart after 5 seconds
          setTimeout(() => this.startNextJSApp(), 5000);
        }
      });

      this.processes.set('nextjs', nextApp);
      
      // Timeout fallback
      setTimeout(() => {
        console.log('⚠️  Next.js startup timeout, assuming ready...');
        resolve();
      }, 10000);
    });
  }

  async startBridgeRelayer() {
    return new Promise((resolve) => {
      console.log('🌉 Starting bridge relayer...');
      
      const relayer = fork(path.join(__dirname, 'simple-relayer-fixed-v3.js'), {
        env: process.env,
        silent: false
      });

      relayer.on('message', (message) => {
        console.log(`[RELAYER] ${message}`);
      });

      relayer.on('exit', (code) => {
        console.error(`❌ Bridge relayer exited with code ${code}`);
        if (!this.isShuttingDown) {
          // Restart relayer after 10 seconds
          setTimeout(() => this.startBridgeRelayer(), 10000);
        }
      });

      this.processes.set('bridge-relayer', relayer);
      console.log('✅ Bridge relayer started');
      resolve();
    });
  }

  startHealthMonitoring() {
    console.log('💓 Starting health monitoring...');
    
    const healthCheck = setInterval(async () => {
      try {
        // Check if processes are still running
        let allHealthy = true;
        
        for (const [name, process] of this.processes) {
          if (process.killed || process.exitCode !== null) {
            console.warn(`⚠️  Process ${name} is not healthy`);
            allHealthy = false;
          }
        }

        // Optional: Add more health checks here
        // - Database connectivity
        // - External API connectivity
        // - Memory usage
        // - Disk space
        
        if (allHealthy) {
          console.log(`💓 Health check passed (${new Date().toISOString()})`);
        }
        
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000); // Every 30 seconds

    this.processes.set('health-monitor', { kill: () => clearInterval(healthCheck) });
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      this.isShuttingDown = true;

      // Stop all processes
      for (const [name, process] of this.processes) {
        console.log(`   Stopping ${name}...`);
        try {
          if (process.kill) {
            process.kill('SIGTERM');
          }
        } catch (error) {
          console.warn(`   Warning: Could not stop ${name}:`, error.message);
        }
      }

      // Wait a bit for graceful shutdown
      setTimeout(() => {
        console.log('✅ Shutdown complete');
        process.exit(0);
      }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
  }

  keepAlive() {
    // Keep the main process alive
    setInterval(() => {
      // This prevents the process from exiting
      // Health monitoring and other periodic tasks can go here
    }, 60000);
  }
}

// Environment validation
function validateEnvironment() {
  const required = [
    'RELAYER_PRIVATE_KEY',
    'BRIDGE_CONTRACT_ADDRESS',
    'SOLANA_PRIVATE_KEY',
    'MARS_MINT_ADDRESS'
  ];

  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   - ${env}`));
    console.error('\nPlease set these variables and restart.');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

// Main execution
async function main() {
  try {
    // Validate environment first
    validateEnvironment();
    
    // Start the production manager
    const manager = new ProductionManager();
    await manager.start();
    
  } catch (error) {
    console.error('❌ Production manager failed:', error);
    process.exit(1);
  }
}

// Auto-start if this file is run directly
if (require.main === module) {
  main();
}

module.exports = { ProductionManager }; 