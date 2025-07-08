#!/usr/bin/env node

const { ethers } = require('ethers');
const { 
  Connection, 
  PublicKey, 
  Keypair
} = require('@solana/web3.js');
const { 
  mintTo, 
  getOrCreateAssociatedTokenAccount,
  getMint 
} = require('@solana/spl-token');

console.log('🔧 Manual Bridge Transaction Completion');
console.log('=======================================');

// Configuration
const config = {
  l1RpcUrl: 'https://rpc.marscredit.xyz',
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  bridgeContractAddress: '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba',
  marsMintAddress: 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b',
  solanaPrivateKey: [155,171,247,212,37,199,222,84,239,121,126,211,47,58,211,70,78,197,121,59,120,141,228,188,58,129,26,189,62,198,5,120,189,211,191,106,228,136,171,154,143,153,202,219,35,33,170,75,11,231,13,145,226,159,162,3,99,36,129,102,247,105,139,147]
};

// Pending transaction details - Updated to process the remaining transaction
const pendingTransaction = {
  user: '0x06F0f6935dfe7Aef5947a12cCDa532346a815ccD',
  amount: '19.98',
  solanaRecipient: 'Ct51j1hoP52sjJNmL2dGwqLAS2pcSe8nJPeWd6JkS73b',
  bridgeId: '1',
  txHash: '0xdd272243e6675fa4223e7a3acc2522a360f5db776987a3a7d2cd5d1e9e84b93d'
};

// Initialize connections
const l1Provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
const solanaConnection = new Connection(config.solanaRpcUrl, 'confirmed');
const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(config.solanaPrivateKey));

async function checkBridgeStatus() {
  console.log('📊 Current Bridge Status:');
  
  // Check L1 bridge contract
  const bridgeABI = ['function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'];
  const bridgeContract = new ethers.Contract(config.bridgeContractAddress, bridgeABI, l1Provider);
  const stats = await bridgeContract.getBridgeStats();
  
  console.log('   L1 Total Locked:', ethers.formatEther(stats[0]), 'MARS');
  
  // Check Solana mint
  const mintInfo = await getMint(solanaConnection, new PublicKey(config.marsMintAddress));
  const solanaSupply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
  
  console.log('   Solana Total Supply:', solanaSupply.toFixed(6), 'MARS');
  
  const difference = parseFloat(ethers.formatEther(stats[0])) - solanaSupply;
  console.log('   Difference (Pending):', difference.toFixed(6), 'MARS');
  
  return {
    l1Locked: parseFloat(ethers.formatEther(stats[0])),
    solanaSupply,
    difference
  };
}

async function validateSolanaAddress(address) {
  console.log(`🔍 Validating Solana address: ${address}`);
  
  try {
    const pubkey = new PublicKey(address);
    console.log('   ✅ Valid Solana address');
    
    // Check if it's a system account
    const accountInfo = await solanaConnection.getAccountInfo(pubkey);
    if (accountInfo) {
      console.log('   ✅ Address exists on Solana');
      console.log('   Owner:', accountInfo.owner.toString());
    } else {
      console.log('   ⚠️  Address does not exist yet (will be created)');
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Invalid Solana address:', error.message);
    return false;
  }
}

async function mintTokensManually(recipientAddress, amount, bridgeId) {
  console.log(`\n🪙 Manually minting ${amount} MARS to ${recipientAddress}`);
  console.log(`   Bridge ID: ${bridgeId}`);
  
  try {
    const mintPubkey = new PublicKey(config.marsMintAddress);
    const recipientPubkey = new PublicKey(recipientAddress);
    
    // Get or create associated token account for recipient
    console.log('   Creating/getting token account...');
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      solanaConnection,
      solanaWallet,
      mintPubkey,
      recipientPubkey
    );
    
    console.log('   Recipient token account:', recipientTokenAccount.address.toString());
    
         // Convert amount to proper decimals (9 decimals for new MARS token)
     const amountWithDecimals = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, 9)));
    console.log('   Amount with decimals:', amountWithDecimals.toString());
    
    // Check SOL balance
    const balance = await solanaConnection.getBalance(solanaWallet.publicKey);
    console.log('   SOL balance:', (balance / 1e9).toFixed(6), 'SOL');
    
    if (balance < 0.01 * 1e9) {
      throw new Error('Insufficient SOL balance for transaction');
    }
    
    // Mint tokens
    console.log('   Submitting mint transaction...');
    const signature = await mintTo(
      solanaConnection,
      solanaWallet,
      mintPubkey,
      recipientTokenAccount.address,
      solanaWallet.publicKey,
      amountWithDecimals
    );
    
    console.log('✅ Manual minting successful!');
    console.log('   Transaction signature:', signature);
    console.log('   Amount minted:', amount, 'MARS');
    console.log('   Recipient:', recipientAddress);
    
    return signature;
  } catch (error) {
    console.error('❌ Manual minting failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('💡 Need more SOL for transaction fees');
    } else if (error.message.includes('TokenAccountNotFoundError')) {
      console.log('💡 Token account creation failed');
    }
    
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting manual bridge completion...');
  console.log('\n📋 Pending Transaction Details:');
  console.log('   User:', pendingTransaction.user);
  console.log('   Amount:', pendingTransaction.amount, 'MARS');
  console.log('   Solana Recipient:', pendingTransaction.solanaRecipient);
  console.log('   Bridge ID:', pendingTransaction.bridgeId);
  console.log('   TX Hash:', pendingTransaction.txHash);
  
  // Check current bridge status
  const status = await checkBridgeStatus();
  
  // Validate recipient address
  const isValidAddress = await validateSolanaAddress(pendingTransaction.solanaRecipient);
  if (!isValidAddress) {
    console.error('❌ Invalid recipient address. Cannot proceed.');
    process.exit(1);
  }
  
  // Manual completion
  console.log('\n🔧 Proceeding with manual completion...');
  
  try {
    const signature = await mintTokensManually(
      pendingTransaction.solanaRecipient,
      pendingTransaction.amount,
      pendingTransaction.bridgeId
    );
    
    console.log('\n🎉 Manual bridge completion successful!');
    console.log('   Solana transaction:', signature);
    
    // Check final status
    console.log('\n📊 Final Bridge Status:');
    await checkBridgeStatus();
    
    console.log('\n✅ The 494.505 MARS transaction should now be complete!');
    console.log('   The recipient should see their MARS tokens in their Solana wallet.');
    
  } catch (error) {
    console.error('❌ Manual completion failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check SOL balance in relayer wallet');
    console.log('   2. Verify recipient address is valid');
    console.log('   3. Check if mint authority is correct');
    console.log('   4. Try again in a few minutes');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 