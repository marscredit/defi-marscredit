const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110,
  name: 'Mars Credit Network'
};

// Existing paymaster address from your setup
const PAYMASTER_ADDRESS = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';

// Paymaster ABI for authorization
const PAYMASTER_ABI = [
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function authorizeContract(address) external',
  'function revokeContract(address) external',
  'function authorizedContracts(address) view returns (bool)',
  'function sponsoredRedemption(address) external'
];

async function deployEnhancedGaslessGrant() {
  console.log('🚀 Deploying Enhanced Gasless Grant Contract...');
  console.log('📡 Network:', NETWORK_CONFIG.name);
  console.log('🔗 RPC:', NETWORK_CONFIG.rpcUrl);
  console.log('💳 Paymaster:', PAYMASTER_ADDRESS);
  
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

  // Check paymaster status
  console.log('\n🔍 Checking paymaster status...');
  const paymaster = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, wallet);
  
  try {
    const paymasterBalance = await paymaster.getBalance();
    console.log('💳 Paymaster balance:', ethers.formatEther(paymasterBalance), 'MARS');
    
    const paymasterOwner = await paymaster.owner();
    console.log('👤 Paymaster owner:', paymasterOwner);
    
    if (paymasterOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.warn('⚠️ You are not the paymaster owner. Authorization may need to be done by the owner.');
    }
  } catch (error) {
    console.error('❌ Error checking paymaster:', error.message);
  }

  // Contract parameters
  const redemptionAmount = ethers.parseEther('10000'); // 10,000 MARS per user for testing
  const isWhitelistMode = false; // Start in public mode for testing
  
  console.log('\n📋 Contract Parameters:');
  console.log('💎 Redemption amount per user:', ethers.formatEther(redemptionAmount), 'MARS');
  console.log('🔒 Whitelist mode:', isWhitelistMode ? 'ENABLED' : 'DISABLED (PUBLIC)');
  console.log('⚡ Gasless redemption: ENABLED');

  try {
    // Read the compiled contract
    const contractJson = require('../build/contracts/EnhancedGaslessGrant.json');
    
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
    
    // Step 1: Authorize paymaster in the grant contract
    console.log('\n🔗 Setting up paymaster integration...');
    console.log('1️⃣ Authorizing paymaster in grant contract...');
    
    try {
      const authTx = await contract.authorizePaymaster(PAYMASTER_ADDRESS);
      console.log('⏳ Authorization transaction:', authTx.hash);
      await authTx.wait();
      console.log('✅ Paymaster authorized in grant contract');
      
      // Verify authorization
      const isAuthorized = await contract.authorizedPaymasters(PAYMASTER_ADDRESS);
      console.log('✅ Authorization verified:', isAuthorized);
    } catch (error) {
      console.error('❌ Error authorizing paymaster in grant:', error.message);
    }

    // Step 2: Authorize grant contract in paymaster (if we're the owner)
    console.log('2️⃣ Authorizing grant contract in paymaster...');
    
    try {
      const paymasterOwner = await paymaster.owner();
      if (paymasterOwner.toLowerCase() === wallet.address.toLowerCase()) {
        const authTx = await paymaster.authorizeContract(contractAddress);
        console.log('⏳ Paymaster authorization transaction:', authTx.hash);
        await authTx.wait();
        console.log('✅ Grant contract authorized in paymaster');
        
        // Verify authorization
        const isAuthorized = await paymaster.authorizedContracts(contractAddress);
        console.log('✅ Paymaster authorization verified:', isAuthorized);
      } else {
        console.log('⚠️ Skipping paymaster authorization - you are not the paymaster owner');
        console.log('📝 Manual step needed: Have the paymaster owner run:');
        console.log(`   paymaster.authorizeContract("${contractAddress}")`);
      }
    } catch (error) {
      console.error('❌ Error authorizing grant in paymaster:', error.message);
    }
    
    // Generate registry entry
    console.log('\n📋 ADD THIS TO YOUR GRANTS REGISTRY:');
    console.log('=====================================');
    console.log(`{
  id: 'enhanced-gasless-grant-${Date.now()}',
  name: '⚡ Enhanced Gasless Grant - 10K Per User',
  description: 'Testing enhanced gasless grant with whitelist capability. 10,000 MARS tokens per address with ZERO gas fees!',
  contractAddress: '${contractAddress}',
  deployedAt: '${new Date().toISOString()}',
  category: 'special',
  isActive: true,
  contractType: 'enhanced-gasless',
  isWhitelistOnly: false
},`);
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Fund the contract with MARS tokens:');
    console.log(`   node scripts/manage-enhanced-gasless-grant.js fund ${contractAddress} 100000`);
    console.log('2. Test gasless redemption:');
    console.log(`   node scripts/test-gasless-redemption.js ${contractAddress}`);
    console.log('3. Add to whitelist (optional):');
    console.log(`   node scripts/manage-enhanced-gasless-grant.js add ${contractAddress} 0xYourAddress`);
    console.log('4. Switch to whitelist mode (optional):');
    console.log(`   node scripts/manage-enhanced-gasless-grant.js mode ${contractAddress} true`);
    
    return {
      contractAddress,
      deploymentTx: deployTx.hash,
      owner: wallet.address,
      paymasterAddress: PAYMASTER_ADDRESS
    };
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployEnhancedGaslessGrant()
    .then((result) => {
      console.log('\n🎉 Enhanced Gasless Grant deployed successfully!');
      console.log('📍 Contract:', result.contractAddress);
      console.log('💳 Paymaster:', result.paymasterAddress);
      console.log('⚡ Ready for gasless redemptions!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { deployEnhancedGaslessGrant }; 