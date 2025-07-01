const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110,
  name: 'Mars Credit Network'
};

async function deployEnhancedGrant() {
  console.log('🚀 Deploying Enhanced Token Grant Contract...');
  console.log('📡 Network:', NETWORK_CONFIG.name);
  console.log('🔗 RPC:', NETWORK_CONFIG.rpcUrl);
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  
  // You'll need to provide your private key
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Please set DEPLOYER_PRIVATE_KEY in your .env file');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('👤 Deployer address:', wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Deployer balance:', ethers.formatEther(balance), 'MARS');
  
  if (balance < ethers.parseEther('1')) {
    console.warn('⚠️ Low balance! Make sure you have enough MARS for deployment.');
  }

  // Contract parameters
  const redemptionAmount = ethers.parseEther('100000'); // 100,000 MARS per user
  const isWhitelistMode = true; // Start in whitelist mode
  
  console.log('\n📋 Contract Parameters:');
  console.log('💎 Redemption amount per user:', ethers.formatEther(redemptionAmount), 'MARS');
  console.log('🔒 Whitelist mode:', isWhitelistMode ? 'ENABLED' : 'DISABLED');

  try {
    // Read the compiled contract
    const contractJson = require('../build/contracts/EnhancedTokenGrant.json');
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(
      contractJson.abi,
      contractJson.bytecode,
      wallet
    );

    console.log('\n🏗️ Deploying contract...');
    
    // Deploy the contract
    const contract = await contractFactory.deploy(redemptionAmount, isWhitelistMode);
    
    console.log('⏳ Waiting for deployment confirmation...');
    const deployTx = await contract.deploymentTransaction();
    console.log('📝 Deployment transaction:', deployTx.hash);
    
    // Wait for confirmation
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('📍 Contract address:', contractAddress);
    console.log('👤 Owner:', wallet.address);
    console.log('🔗 Transaction:', deployTx.hash);
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    const owner = await contract.owner();
    const redemptionAmountOnChain = await contract.redemptionAmountPerUser();
    const whitelistModeOnChain = await contract.isWhitelistMode();
    
    console.log('✅ Owner verified:', owner === wallet.address);
    console.log('✅ Redemption amount verified:', ethers.formatEther(redemptionAmountOnChain), 'MARS');
    console.log('✅ Whitelist mode verified:', whitelistModeOnChain);
    
    // Generate registry entry
    console.log('\n📋 ADD THIS TO YOUR GRANTS REGISTRY:');
    console.log('=====================================');
    console.log(`{
  id: 'enhanced-grant-${Date.now()}',
  name: 'Community Contributor Grant - 100K Per User',
  description: 'Whitelist-only grant for community contributors. 100,000 MARS tokens per approved address.',
  contractAddress: '${contractAddress}',
  deployedAt: '${new Date().toISOString()}',
  category: 'community',
  isActive: true
},`);
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Fund the contract with MARS tokens:');
    console.log(`   contract.fundGrant({ value: ethers.parseEther("300000") })`);
    console.log('2. Add addresses to whitelist:');
    console.log(`   contract.addMultipleToWhitelist([address1, address2, address3])`);
    console.log('3. Update grants registry with the contract address');
    console.log('4. Test redemption with whitelisted addresses');
    
    return {
      contractAddress,
      deploymentTx: deployTx.hash,
      owner: wallet.address
    };
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    process.exit(1);
  }
}

// Example usage functions
async function exampleUsage(contractAddress) {
  console.log('\n📖 EXAMPLE USAGE:');
  console.log('=================');
  
  console.log(`
// Fund the contract with 300,000 MARS (for 3 users × 100,000 each)
const contract = new ethers.Contract('${contractAddress}', abi, wallet);
await contract.fundGrant({ value: ethers.parseEther("300000") });

// Add 3 addresses to whitelist
const addresses = [
  "0x1234567890123456789012345678901234567890",
  "0x2345678901234567890123456789012345678901", 
  "0x3456789012345678901234567890123456789012"
];
await contract.addMultipleToWhitelist(addresses);

// Check if user can redeem
const canRedeem = await contract.canUserRedeem("0x1234567890123456789012345678901234567890");
console.log("Can redeem:", canRedeem);

// Switch to public mode (if needed)
await contract.setWhitelistMode(false);
  `);
}

// Run deployment if called directly
if (require.main === module) {
  deployEnhancedGrant()
    .then((result) => {
      exampleUsage(result.contractAddress);
      console.log('\n🎉 Deployment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { deployEnhancedGrant }; 