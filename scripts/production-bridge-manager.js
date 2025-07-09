#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

console.log('🚀 Mars Bridge Production Manager');
console.log('==================================');

class ProductionBridgeManager {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
    this.healthCheckInterval = null;
  }

  async start() {
    console.log('🏗️ Starting production bridge services...');
    
    // Start Next.js app
    await this.startNextJSApp();
    
    // Start bridge queue processor
    await this.startQueueProcessor();
    
    // Start bridge relayer
    await this.startBridgeRelayer();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
    
    console.log('✅ All bridge services started successfully!');
  }

  async startNextJSApp() {
    console.log('🌐 Starting Next.js application...');
    
    const nextApp = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3000'
      },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    nextApp.stdout.on('data', (data) => {
      console.log(`[NEXT] ${data.toString().trim()}`);
    });

    nextApp.stderr.on('data', (data) => {
      console.error(`[NEXT] ${data.toString().trim()}`);
    });

    nextApp.on('exit', (code) => {
      console.error(`❌ Next.js app exited with code ${code}`);
      if (!this.isShuttingDown) {
        process.exit(1);
      }
    });

    this.processes.set('nextjs', nextApp);
    
    // Wait for Next.js to be ready
    await this.waitForService('http://localhost:' + (process.env.PORT || '3000'), 30000);
    console.log('✅ Next.js app is ready');
  }

  async startQueueProcessor() {
    console.log('🔄 Starting bridge queue processor...');
    
    const queueProcessor = fork(path.join(__dirname, 'queue-processor.js'), {
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
      silent: false
    });

    queueProcessor.on('message', (message) => {
      console.log(`[QUEUE] ${message}`);
    });

    queueProcessor.on('exit', (code) => {
      console.error(`❌ Queue processor exited with code ${code}`);
      if (!this.isShuttingDown) {
        // Restart queue processor after 5 seconds
        setTimeout(() => this.startQueueProcessor(), 5000);
      }
    });

    this.processes.set('queue-processor', queueProcessor);
    console.log('✅ Queue processor started');
  }

  async startBridgeRelayer() {
    console.log('🌉 Starting bridge relayer...');
    
    const relayer = fork(path.join(__dirname, 'production-relayer.js'), {
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
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
  }

  startHealthMonitoring() {
    console.log('💓 Starting health monitoring...');
    
    this.healthCheckInterval = setInterval(async () => {
      const status = await this.getServiceStatus();
      
      // Log health status
      console.log(`💓 Health Check - Next.js: ${status.nextjs ? '✅' : '❌'}, Queue: ${status.queue ? '✅' : '❌'}, Relayer: ${status.relayer ? '✅' : '❌'}`);
      
      // Restart failed services
      if (!status.queue && !this.isShuttingDown) {
        console.log('🔄 Restarting queue processor...');
        await this.restartService('queue-processor');
      }
      
      if (!status.relayer && !this.isShuttingDown) {
        console.log('🔄 Restarting bridge relayer...');
        await this.restartService('bridge-relayer');
      }
      
    }, 30000); // Check every 30 seconds
  }

  async getServiceStatus() {
    const status = {
      nextjs: false,
      queue: false,
      relayer: false,
      timestamp: new Date().toISOString()
    };

    // Check Next.js
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || '3000'}/api/health`);
      status.nextjs = response.ok;
    } catch (error) {
      status.nextjs = false;
    }

    // Check processes
    const nextjsProcess = this.processes.get('nextjs');
    const queueProcess = this.processes.get('queue-processor');
    const relayerProcess = this.processes.get('bridge-relayer');

    status.queue = queueProcess && !queueProcess.killed;
    status.relayer = relayerProcess && !relayerProcess.killed;

    return status;
  }

  async restartService(serviceName) {
    const process = this.processes.get(serviceName);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(serviceName);
    }

    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (serviceName === 'queue-processor') {
      await this.startQueueProcessor();
    } else if (serviceName === 'bridge-relayer') {
      await this.startBridgeRelayer();
    }
  }

  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        await this.shutdown();
      });
    });
  }

  async shutdown() {
    this.isShuttingDown = true;
    
    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log('🛑 Stopping all services...');
    
    // Stop all processes
    for (const [name, process] of this.processes.entries()) {
      console.log(`📴 Stopping ${name}...`);
      process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          process.kill('SIGKILL');
          resolve();
        }, 5000);
        
        process.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    
    console.log('✅ All services stopped');
    process.exit(0);
  }

  async waitForService(url, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Service at ${url} did not become ready within ${timeout}ms`);
  }
}

// Start the production manager
if (require.main === module) {
  const manager = new ProductionBridgeManager();
  manager.start().catch(error => {
    console.error('❌ Failed to start production bridge manager:', error);
    process.exit(1);
  });
}

module.exports = { ProductionBridgeManager }; 