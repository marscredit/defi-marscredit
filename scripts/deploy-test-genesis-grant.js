const { ethers } = require('ethers');
const deploymentWallet = require('../deployment-wallet.json');

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110,
  name: 'Mars Credit Network'
};

async function deployTestGenesisGrant() {
  console.log('🚀 Deploying Test Genesis Grant Contract...');
  console.log('📡 Network:', NETWORK_CONFIG.name);
  console.log('🔗 RPC:', NETWORK_CONFIG.rpcUrl);
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(deploymentWallet.privateKey, provider);
  
  console.log('👤 Deployer address:', wallet.address);
  console.log('📋 From deployment wallet:', deploymentWallet.address);
  
  // Verify wallet addresses match
  if (wallet.address.toLowerCase() !== deploymentWallet.address.toLowerCase()) {
    console.error('❌ Wallet address mismatch!');
    process.exit(1);
  }
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Deployer balance:', ethers.formatEther(balance), 'MARS');
  
  if (balance < ethers.parseEther('1')) {
    console.warn('⚠️ Low balance! Make sure you have enough MARS for deployment.');
  }

  // Contract parameters
  const redemptionAmount = ethers.parseEther('2500'); // 2,500 MARS per user for testing
  
  console.log('\n📋 Contract Parameters:');
  console.log('💎 Redemption amount per user:', ethers.formatEther(redemptionAmount), 'MARS');
  console.log('⚡ Gas allowance per redemption: 0.01 MARS');
  console.log('📊 Total per user (including gas):', ethers.formatEther(redemptionAmount + ethers.parseEther('0.01')), 'MARS');

  try {
    // Read the compiled contract
    const contractJson = require('../build/contracts/TestGenesisGrant.json');
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(
      contractJson.abi,
      contractJson.bytecode,
      wallet
    );

    console.log('\n🏗️ Deploying contract...');
    
    // Deploy the contract
    const contract = await contractFactory.deploy(redemptionAmount);
    
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
    const isPaused = await contract.paused();
    
    console.log('✅ Owner verified:', owner === wallet.address);
    console.log('✅ Redemption amount verified:', ethers.formatEther(redemptionAmountOnChain), 'MARS');
    console.log('✅ Contract active (not paused):', !isPaused);
    
    // Fund the contract with test tokens
    console.log('\n💰 Funding contract with test tokens...');
    const fundingAmount = ethers.parseEther('25000'); // 25,000 MARS (enough for 10 users)
    
    try {
      const fundTx = await contract.fundGrant({ value: fundingAmount });
      console.log('⏳ Funding transaction:', fundTx.hash);
      await fundTx.wait();
      console.log('✅ Contract funded with', ethers.formatEther(fundingAmount), 'MARS');
      
      // Verify funding
      const contractBalance = await contract.getBalance();
      console.log('💰 Contract balance:', ethers.formatEther(contractBalance), 'MARS');
      
      const remainingRedemptions = await contract.getRemainingRedemptions();
      console.log('👥 Users who can redeem:', remainingRedemptions.toString());
      
    } catch (fundingError) {
      console.warn('⚠️ Could not fund contract automatically:', fundingError.message);
      console.log('📝 You can fund it manually with:');
      console.log(`   contract.fundGrant({ value: ethers.parseEther("25000") })`);
    }
    
    // Generate registry entry
    console.log('\n📋 ADD THIS TO YOUR GRANTS REGISTRY:');
    console.log('=====================================');
    const timestamp = Date.now();
    console.log(`{
  id: 'test-genesis-grant-${timestamp}',
  name: '🧪 Test Genesis Grant - 2500 Per User',
  description: 'Test genesis grant for development and testing. 2,500 MARS tokens per address.',
  contractAddress: '${contractAddress}',
  deployedAt: '${new Date().toISOString()}',
  category: 'genesis',
  isActive: true,
  contractType: 'simple',
  isWhitelistOnly: false
},`);
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Add contract to grants registry');
    console.log('2. Test redemption:');
    console.log(`   node scripts/test-simple-grant.js ${contractAddress}`);
    console.log('3. Monitor contract status:');
    console.log(`   node scripts/check-grant-status.js ${contractAddress}`);
    
    return {
      contractAddress,
      deploymentTx: deployTx.hash,
      owner: wallet.address,
      redemptionAmount: ethers.formatEther(redemptionAmount),
      fundingAmount: ethers.formatEther(fundingAmount)
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
  deployTestGenesisGrant()
    .then((result) => {
      console.log('\n🎉 Test Genesis Grant deployed successfully!');
      console.log('📍 Contract:', result.contractAddress);
      console.log('💎 Redemption Amount:', result.redemptionAmount, 'MARS per user');
      console.log('💰 Initial Funding:', result.fundingAmount, 'MARS');
      console.log('👥 Users Supported: ~10');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { deployTestGenesisGrant }; 