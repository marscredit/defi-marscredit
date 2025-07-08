#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

console.log('🌉 Mars Bridge Relayer (Simple Version)');
console.log('=====================================');

// Configuration
const config = {
  l1RpcUrl: 'https://rpc.marscredit.xyz',
  l1PrivateKey: '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318',
  bridgeContractAddress: '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba',
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: [155,171,247,212,37,199,222,84,239,121,126,211,47,58,211,70,78,197,121,59,120,141,228,188,58,129,26,189,62,198,5,120,189,211,191,106,228,136,171,154,143,153,202,219,35,33,170,75,11,231,13,145,226,159,162,3,99,36,129,102,247,105,139,147],
  marsMintAddress: 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b',
  marsTokenAccount: '29zqmJEVmhXrqbDSW5TJYdGzPLvJQKLXzLwTWjqLf3J4'
};

// Initialize L1 provider
const l1Provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
const l1Wallet = new ethers.Wallet(config.l1PrivateKey, l1Provider);

// Initialize Solana connection
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
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function monitorL1Events() {
  console.log('👁️ Monitoring L1 events...');
  
  bridgeContract.on('TokensLocked', (user, amount, solanaRecipient, bridgeId, event) => {
    console.log('🔒 L1 Lock Event:', {
      user,
      amount: ethers.formatEther(amount),
      solanaRecipient,
      bridgeId: bridgeId.toString(),
      txHash: event.transactionHash
    });
  });
  
  bridgeContract.on('TokensUnlocked', (recipient, amount, solanaTxId, bridgeId, event) => {
    console.log('🔓 L1 Unlock Event:', {
      recipient,
      amount: ethers.formatEther(amount),
      solanaTxId,
      bridgeId: bridgeId.toString(),
      txHash: event.transactionHash
    });
  });
}

async function main() {
  console.log('🚀 Starting relayer...');
  
  // Test all connections
  const connectionsOK = await testConnections();
  if (!connectionsOK) {
    console.error('❌ Failed to connect to services');
    process.exit(1);
  }
  
  // Start monitoring
  await monitorL1Events();
  
  console.log('✅ Relayer started successfully!');
  console.log('   Press Ctrl+C to stop');
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
  });
}

main().catch(console.error); 