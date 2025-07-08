#!/usr/bin/env node

const { MarsBridgeRelayer } = require('../src/services/mars-bridge-relayer.ts')
const path = require('path')
const fs = require('fs')

console.log('🌉 Mars Bridge Relayer Starting...')
console.log('=====================================')

// Load configuration from environment and deployment files
const loadConfig = () => {
  // Load bridge deployment info
  const bridgeDeploymentPath = path.join(__dirname, '..', 'src', 'contracts', 'bridge-deployment.json')
  let bridgeInfo = {}
  
  if (fs.existsSync(bridgeDeploymentPath)) {
    bridgeInfo = JSON.parse(fs.readFileSync(bridgeDeploymentPath, 'utf8'))
    console.log('✅ Loaded bridge deployment info')
  } else {
    console.warn('⚠️ Bridge deployment info not found')
  }

  const config = {
    // L1 Configuration
    l1RpcUrl: process.env.MARS_CREDIT_RPC_URL || 'https://rpc.marscredit.xyz',
    l1PrivateKey: process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY,
    bridgeContractAddress: process.env.BRIDGE_CONTRACT_ADDRESS || bridgeInfo.bridgeContract,
    
    // Solana Configuration
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || process.env.RELAYER_SOLANA_PRIVATE_KEY,
    marsMintAddress: process.env.MARS_MINT_ADDRESS,
    marsTokenAccount: process.env.MARS_TOKEN_ACCOUNT,
    
    // Relayer Settings
    pollIntervalMs: parseInt(process.env.RELAYER_POLL_INTERVAL || '10000'), // 10 seconds
    maxRetries: parseInt(process.env.RELAYER_MAX_RETRIES || '3'),
    gasLimitL1: parseInt(process.env.RELAYER_GAS_LIMIT || '300000'),
    priorityFee: parseInt(process.env.RELAYER_PRIORITY_FEE || '1000') // 0.001 SOL
  }

  // Validate required configuration
  const requiredFields = [
    'l1PrivateKey',
    'bridgeContractAddress',
    'solanaPrivateKey',
    'marsMintAddress',
    'marsTokenAccount'
  ]

  const missingFields = requiredFields.filter(field => !config[field])
  
  if (missingFields.length > 0) {
    console.error('❌ Missing required configuration:')
    missingFields.forEach(field => {
      console.error(`   - ${field}`)
    })
    console.error('\nPlease set the following environment variables:')
    console.error('   RELAYER_PRIVATE_KEY (L1 private key)')
    console.error('   BRIDGE_CONTRACT_ADDRESS (L1 bridge contract)')
    console.error('   SOLANA_PRIVATE_KEY (Solana private key array)')
    console.error('   MARS_MINT_ADDRESS (Solana MARS token mint)')
    console.error('   MARS_TOKEN_ACCOUNT (Solana MARS token account)')
    process.exit(1)
  }

  return config
}

const startRelayer = async () => {
  try {
    const config = loadConfig()
    
    console.log('🔧 Bridge Configuration:')
    console.log('  L1 RPC:', config.l1RpcUrl)
    console.log('  Bridge Contract:', config.bridgeContractAddress)
    console.log('  Solana RPC:', config.solanaRpcUrl)
    console.log('  MARS Mint:', config.marsMintAddress)
    console.log('  MARS Token Account:', config.marsTokenAccount)
    console.log('  Poll Interval:', config.pollIntervalMs + 'ms')
    console.log('')

    // Initialize and start relayer
    const relayer = new MarsBridgeRelayer(config)
    
    // Handle graceful shutdown
    const gracefulShutdown = async () => {
      console.log('\n🛑 Shutting down relayer...')
      await relayer.stop()
      process.exit(0)
    }

    process.on('SIGINT', gracefulShutdown)
    process.on('SIGTERM', gracefulShutdown)

    // Start the relayer
    await relayer.start()
    
    // Monitor bridge stats every minute
    setInterval(async () => {
      try {
        const stats = await relayer.getBridgeStats()
        console.log('\n📊 Bridge Stats Update:')
        console.log('  L1 Total Locked:', stats.l1.totalLocked, 'MARS')
        console.log('  L1 Bridge Count:', stats.l1.bridgeCount)
        console.log('  Solana Total Supply:', stats.solana.totalSupply, 'MARS')
        console.log('  Solana Mint Authority:', stats.solana.mintAuthority)
        console.log('  Solana Initialized:', stats.solana.isInitialized)
      } catch (error) {
        console.error('❌ Error fetching bridge stats:', error.message)
      }
    }, 60000) // Every minute

    console.log('✅ Mars Bridge Relayer is running!')
    console.log('   Press Ctrl+C to stop')

  } catch (error) {
    console.error('❌ Failed to start relayer:', error)
    process.exit(1)
  }
}

// Run if this script is executed directly
if (require.main === module) {
  startRelayer()
}

module.exports = { startRelayer } 