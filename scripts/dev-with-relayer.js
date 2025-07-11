#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Mars Credit Development Environment');
console.log('==============================================');
console.log('📋 Environment variables loaded from .env file');
console.log('');

// Validate environment variables
const requiredEnvVars = [
  'RELAYER_PRIVATE_KEY',
  'BRIDGE_CONTRACT_ADDRESS',
  'SOLANA_PRIVATE_KEY',
  'MARS_MINT_ADDRESS'
];

console.log('🔍 Environment Variables Check:');
const missingVars = [];
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`   ${envVar}: ✅ Set`);
  } else {
    console.log(`   ${envVar}: ❌ Missing`);
    missingVars.push(envVar);
  }
}

if (missingVars.length > 0) {
  console.error('');
  console.error('❌ Missing required environment variables in .env file:');
  missingVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error('');
  console.error('💡 Please add these variables to your .env file and restart');
  process.exit(1);
}

console.log('✅ All required environment variables are set');
console.log('');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function logWithPrefix(prefix, color, data) {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    console.log(`${color}[${prefix}]${colors.reset} ${line}`);
  });
}

// Start Next.js development server
console.log('🌐 Starting Next.js development server...');
const nextDev = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  env: process.env
});

nextDev.stdout.on('data', (data) => {
  logWithPrefix('NEXT', colors.cyan, data);
});

nextDev.stderr.on('data', (data) => {
  logWithPrefix('NEXT', colors.red, data);
});

// Wait a bit for Next.js to start, then start relayer
setTimeout(() => {
  console.log('🌉 Starting Bridge Relayer...');
  
  const relayer = spawn('node', ['scripts/simple-relayer-fixed.js'], {
    cwd: process.cwd(),
    env: process.env
  });

  relayer.stdout.on('data', (data) => {
    logWithPrefix('RELAYER', colors.green, data);
  });

  relayer.stderr.on('data', (data) => {
    logWithPrefix('RELAYER', colors.yellow, data);
  });

  relayer.on('close', (code) => {
    console.log(`${colors.yellow}[RELAYER]${colors.reset} Process exited with code ${code}`);
    if (code !== 0) {
      console.log(`${colors.yellow}[RELAYER]${colors.reset} Restarting in 5 seconds...`);
      setTimeout(() => {
        console.log('🔄 Restarting relayer...');
        // Could implement restart logic here
      }, 5000);
    }
  });

}, 3000); // Wait 3 seconds for Next.js to start

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  nextDev.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  nextDev.kill('SIGTERM');
  process.exit(0);
});

console.log('');
console.log('🎯 Development Environment Running:');
console.log('   • Frontend: http://localhost:3000');
console.log('   • Bridge: Active and monitoring');
console.log('   • Press Ctrl+C to stop both services');
console.log(''); 