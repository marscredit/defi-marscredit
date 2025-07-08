#!/usr/bin/env node

const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getMint } = require('@solana/spl-token');

console.log('🔍 Checking Bridge Transaction Status');
console.log('=====================================');

// Configuration
const config = {
  l1RpcUrl: 'https://rpc.marscredit.xyz',
  bridgeContractAddress: '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba',
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  marsMintAddress: 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b',
  marsTokenAccount: '2kG3G15oeJxAhUYFPs1CQs8TQZWGRzzPSoaAJCN4uEQN'
};

// Initialize connections
const l1Provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
const solanaConnection = new Connection(config.solanaRpcUrl, 'confirmed');

// Bridge contract ABI
const bridgeABI = [
  'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
];

const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Provider);

async function checkL1Bridge() {
  console.log('\n📊 L1 Bridge Status:');
  
  try {
    const stats = await bridgeContract.getBridgeStats();
    console.log('   Total Locked:', ethers.formatEther(stats[0]), 'MARS');
    console.log('   Total Unlocked:', ethers.formatEther(stats[1]), 'MARS');
    console.log('   Bridge Count:', stats[2].toString());
    console.log('   Processed Count:', stats[3].toString());
    console.log('   Fee Collected:', ethers.formatEther(stats[4]), 'MARS');
    console.log('   Contract Balance:', ethers.formatEther(stats[5]), 'MARS');
    
    return {
      totalLocked: ethers.formatEther(stats[0]),
      totalUnlocked: ethers.formatEther(stats[1]),
      bridgeCount: stats[2].toString(),
      processedCount: stats[3].toString()
    };
  } catch (error) {
    console.error('❌ Error checking L1 bridge:', error.message);
    return null;
  }
}

async function checkSolanaMint() {
  console.log('\n🌟 Solana Mint Status:');
  
  try {
    const mintInfo = await getMint(solanaConnection, new PublicKey(config.marsMintAddress));
    console.log('   Mint Address:', config.marsMintAddress);
    console.log('   Total Supply:', mintInfo.supply.toString());
    console.log('   Decimals:', mintInfo.decimals);
    console.log('   Mint Authority:', mintInfo.mintAuthority?.toString() || 'None');
    console.log('   Freeze Authority:', mintInfo.freezeAuthority?.toString() || 'None');
    
    return {
      totalSupply: mintInfo.supply.toString(),
      decimals: mintInfo.decimals,
      mintAuthority: mintInfo.mintAuthority?.toString()
    };
  } catch (error) {
    console.error('❌ Error checking Solana mint:', error.message);
    return null;
  }
}

async function checkRecentL1Events() {
  console.log('\n📋 Recent L1 Bridge Events:');
  
  try {
    // Get recent TokensLocked events
    const currentBlock = await l1Provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
    
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, fromBlock, currentBlock);
    
    console.log(`   Found ${events.length} events in last 1000 blocks:`);
    
    events.forEach((event, index) => {
      console.log(`   Event ${index + 1}:`);
      console.log(`     User: ${event.args.user}`);
      console.log(`     Amount: ${ethers.formatEther(event.args.amount)} MARS`);
      console.log(`     Solana Recipient: ${event.args.solanaRecipient}`);
      console.log(`     Bridge ID: ${event.args.bridgeId.toString()}`);
      console.log(`     Block: ${event.blockNumber}`);
      console.log(`     TX Hash: ${event.transactionHash}`);
      console.log('     ---');
    });
    
    return events;
  } catch (error) {
    console.error('❌ Error checking recent events:', error.message);
    return [];
  }
}

async function main() {
  console.log('🔍 Checking both sides of the bridge...\n');
  
  // Check L1 bridge
  const l1Stats = await checkL1Bridge();
  
  // Check Solana mint
  const solanaStats = await checkSolanaMint();
  
  // Check recent events
  const events = await checkRecentL1Events();
  
  // Analysis
  console.log('\n📈 Analysis:');
  if (l1Stats && solanaStats) {
    const l1Locked = parseFloat(l1Stats.totalLocked);
    const solanaSupply = parseFloat(solanaStats.totalSupply) / Math.pow(10, solanaStats.decimals || 9);
    
    console.log(`   L1 Total Locked: ${l1Locked} MARS`);
    console.log(`   Solana Total Supply: ${solanaSupply} MARS`);
    console.log(`   Difference: ${(l1Locked - solanaSupply).toFixed(6)} MARS`);
    
    if (Math.abs(l1Locked - solanaSupply) < 0.001) {
      console.log('   ✅ Bridge is balanced - all transactions processed');
    } else {
      console.log('   ⚠️  Bridge imbalance detected - some transactions may be pending');
    }
    
    // Check specific transaction
    const recentLarge = events.find(event => {
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      return amount > 400; // Looking for the ~495 MARS transaction
    });
    
    if (recentLarge) {
      console.log('\n🎯 Found Large Transaction:');
      console.log(`   Amount: ${ethers.formatEther(recentLarge.args.amount)} MARS`);
      console.log(`   Status: ${l1Locked === solanaSupply ? 'COMPLETED' : 'PENDING'}`);
    }
  }
}

main().catch(console.error); 