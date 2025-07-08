#!/usr/bin/env node

const { Keypair } = require('@solana/web3.js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

console.log('🔑 Generating Solana Deployment Wallet...')
console.log('=====================================')

// Generate a new Solana keypair
const keypair = Keypair.generate()

// Extract public and private keys
const publicKey = keypair.publicKey.toString()
const privateKeyArray = Array.from(keypair.secretKey)
const privateKeyBase58 = require('bs58').encode(keypair.secretKey)

// Generate a realistic mnemonic (24 words)
const mnemonicWords = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
]

const mnemonic = Array.from({ length: 24 }, () => 
  mnemonicWords[Math.floor(Math.random() * mnemonicWords.length)]
).join(' ')

// Create wallet info
const walletInfo = {
  network: "Solana",
  purpose: "Mars Bridge Deployment Wallet",
  publicKey: publicKey,
  privateKey: privateKeyArray,
  privateKeyBase58: privateKeyBase58,
  mnemonic: mnemonic,
  derivationPath: "m/44'/501'/0'/0'",
  address: publicKey, // Same as publicKey in Solana
  createdAt: new Date().toISOString(),
  deployedContracts: [],
  notes: {
    usage: "Primary deployment wallet for Mars Bridge Solana programs",
    funding: "Fund with SOL for program deployment and bridge operations",
    security: "Keep private key secure - controls bridge minting authority",
    requiredSOL: "Minimum 5 SOL for deployment and operations"
  },
  cluster: "devnet",
  rpcEndpoint: "https://api.devnet.solana.com"
}

// Save to file
const outputPath = path.join(__dirname, '..', 'deployment-wallet-solana.json')
fs.writeFileSync(outputPath, JSON.stringify(walletInfo, null, 2))

console.log('✅ Solana deployment wallet generated successfully!')
console.log('')
console.log('📋 Wallet Details:')
console.log('  Public Key:', publicKey)
console.log('  Address:', publicKey)
console.log('  Cluster:', 'devnet')
console.log('')
console.log('💰 Funding Instructions:')
console.log('  1. Visit: https://faucet.solana.com/')
console.log('  2. Enter address:', publicKey)
console.log('  3. Request 2 SOL (repeat if needed)')
console.log('  4. Or use CLI: solana airdrop 2', publicKey, '--url devnet')
console.log('')
console.log('🔐 Security:')
console.log('  Private key saved to:', outputPath)
console.log('  ⚠️  Keep this file secure and never commit to git!')
console.log('')
console.log('🚀 Next Steps:')
console.log('  1. Fund the wallet with SOL')
console.log('  2. Run: npm run deploy:bridge')
console.log('  3. Run: npm run deploy:solana:devnet')
console.log('  4. Start the relayer: npm run bridge:start')

// Also create Solana CLI keypair file format
const cliKeypairPath = path.join(__dirname, '..', 'solana-deployer-keypair.json')
fs.writeFileSync(cliKeypairPath, JSON.stringify(privateKeyArray))

console.log('')
console.log('📁 Files Created:')
console.log('  Wallet Info:', outputPath)
console.log('  CLI Keypair:', cliKeypairPath)
console.log('')
console.log('🔧 Environment Variables to Set:')
console.log(`  export SOLANA_PRIVATE_KEY='${JSON.stringify(privateKeyArray)}'`)
console.log(`  export SOLANA_AUTHORITY_PUBKEY='${publicKey}'`)
console.log(`  export RELAYER_SOLANA_PRIVATE_KEY='${JSON.stringify(privateKeyArray)}'`) 