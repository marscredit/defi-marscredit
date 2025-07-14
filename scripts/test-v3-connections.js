#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
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

console.log('🔍 V3 Relayer Connection Test');
console.log('=============================');
console.log('');

// Debug: Show what environment variables are loaded
console.log('📝 Environment Variables:');
console.log('   RELAYER_PRIVATE_KEY:', process.env.RELAYER_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('   BRIDGE_CONTRACT_ADDRESS:', process.env.BRIDGE_CONTRACT_ADDRESS || '❌ Missing');
console.log('   SOLANA_PRIVATE_KEY:', process.env.SOLANA_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('   MARS_MINT_ADDRESS:', process.env.MARS_MINT_ADDRESS || '❌ Missing');
console.log('   SOLANA_RPC_URL:', process.env.SOLANA_RPC_URL || '❌ Missing (will use default)');
console.log('   SOLANA_RPC_API_KEY:', process.env.SOLANA_RPC_API_KEY ? '✅ Set' : '❌ Missing');
console.log('');

// Debug: Show resolved config
console.log('📝 Resolved Configuration:');
console.log('   L1 RPC URL:', config.l1RpcUrl);
console.log('   Solana RPC URL:', config.solanaRpcUrl);
console.log('   Bridge Contract:', config.bridgeContractAddress);
console.log('   MARS Mint:', config.marsMintAddress);
console.log('');

// Validate Solana RPC URL
if (!config.solanaRpcUrl || (!config.solanaRpcUrl.startsWith('http://') && !config.solanaRpcUrl.startsWith('https://'))) {
  console.error('❌ Invalid Solana RPC URL:', config.solanaRpcUrl);
  console.error('💡 Please ensure SOLANA_RPC_URL is set to a valid HTTP/HTTPS URL');
  console.error('💡 Falling back to default Solana mainnet RPC');
  config.solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
}

async function testConnections() {
  console.log('🔧 Testing V3 Relayer Connections...');
  console.log('');
  
  try {
    // Test L1 connection
    console.log('1️⃣ Testing L1 Connection...');
    const l1Provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    const l1Block = await l1Provider.getBlockNumber();
    console.log('   ✅ L1 connection OK, block:', l1Block);
    
    // Test L1 wallet
    const l1Wallet = new ethers.Wallet(config.l1PrivateKey, l1Provider);
    console.log('   ✅ L1 Wallet OK:', l1Wallet.address);
    
    // Test Solana connection
    console.log('');
    console.log('2️⃣ Testing Solana Connection...');
    
    // Create Solana connection with Tatum API key if available
    let solanaConnection;
    const solanaApiKey = process.env.SOLANA_RPC_API_KEY;
    if (solanaApiKey && config.solanaRpcUrl.includes('tatum.io')) {
      console.log('   🔑 Using Tatum API key for Solana connection');
      console.log('   🔗 Tatum RPC URL:', config.solanaRpcUrl);
      // For Tatum, use custom fetch with API key header
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
      console.log('   🔗 Using public Solana RPC:', config.solanaRpcUrl);
      solanaConnection = new Connection(config.solanaRpcUrl);
    }
    
    const slot = await solanaConnection.getSlot();
    console.log('   ✅ Solana connection OK, slot:', slot);
    
    // Test Solana wallet
    const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));
    console.log('   ✅ Solana Wallet OK:', solanaWallet.publicKey.toString());
    
    // Test bridge contract
    console.log('');
    console.log('3️⃣ Testing Bridge Contract...');
    const bridgeABI = [
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Wallet);
    const stats = await bridgeContract.getBridgeStats();
    console.log('   ✅ Bridge contract OK');
    console.log('   📊 Total Locked:', ethers.formatEther(stats[0]), 'MARS');
    console.log('   📊 Bridge Count:', stats[2].toString());
    
    // Test MARS mint
    console.log('');
    console.log('4️⃣ Testing MARS Mint...');
    const mintPubkey = new PublicKey(config.marsMintAddress);
    const mintInfo = await solanaConnection.getTokenSupply(mintPubkey);
    console.log('   ✅ MARS mint OK');
    console.log('   📊 Total Supply:', mintInfo.value.uiAmount, 'MARS');
    
    console.log('');
    console.log('🎉 ALL CONNECTIONS SUCCESSFUL!');
    console.log('✅ V3 Relayer is ready to run');
    
    return true;
    
  } catch (error) {
    console.error('');
    console.error('❌ Connection test failed:', error.message);
    console.error('');
    console.error('💡 Debug info:');
    console.error('   Error type:', error.constructor.name);
    console.error('   Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testConnections().then(success => {
  if (success) {
    console.log('');
    console.log('🚀 Ready to run V3 relayer:');
    console.log('   node scripts/simple-relayer-fixed-v3.js');
    process.exit(0);
  } else {
    console.log('');
    console.log('❌ Fix the connection issues before running V3 relayer');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}); 