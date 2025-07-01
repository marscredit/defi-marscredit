const { ethers } = require('ethers');
const deploymentWallet = require('../deployment-wallet.json');

async function deploySimpleTest() {
  console.log('🚀 Deploying Test Genesis Grant (Simple)...');
  
  const provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
  const wallet = new ethers.Wallet(deploymentWallet.privateKey, provider);
  
  console.log('👤 Deployer:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'MARS');
  
  try {
    // Load compiled contract
    const contractJson = require('../build/contracts/TestGenesisGrant.json');
    
    // Create factory
    const factory = new ethers.ContractFactory(
      contractJson.abi,
      contractJson.bytecode,
      wallet
    );
    
    // Deploy with explicit gas settings
    const redemptionAmount = ethers.parseEther('2500');
    
    console.log('🏗️ Deploying with gas limit 3,000,000...');
    
    const contract = await factory.deploy(redemptionAmount, {
      gasLimit: 3000000,
      gasPrice: ethers.parseUnits('1.1', 'gwei')
    });
    
    console.log('⏳ Waiting for deployment...');
    const receipt = await contract.deploymentTransaction().wait();
    
    const contractAddress = await contract.getAddress();
    
    console.log('✅ Deployed successfully!');
    console.log('📍 Address:', contractAddress);
    console.log('⛽ Gas used:', receipt.gasUsed.toString());
    console.log('🔗 Tx hash:', receipt.hash);
    
    // Test basic functionality
    console.log('\n🔍 Testing contract...');
    const owner = await contract.owner();
    const redemptionAmt = await contract.redemptionAmountPerUser();
    
    console.log('👤 Owner:', owner);
    console.log('💎 Redemption amount:', ethers.formatEther(redemptionAmt), 'MARS');
    
    // Fund with 25,000 MARS
    console.log('\n💰 Funding contract...');
    const fundTx = await contract.fundGrant({ 
      value: ethers.parseEther('25000'),
      gasLimit: 100000
    });
    await fundTx.wait();
    
    const contractBalance = await contract.getBalance();
    const remainingRedemptions = await contract.getRemainingRedemptions();
    
    console.log('✅ Funded with:', ethers.formatEther(contractBalance), 'MARS');
    console.log('👥 Redemptions available:', remainingRedemptions.toString());
    
    // Generate timestamp for unique ID
    const timestamp = Date.now();
    
    console.log('\n📋 REGISTRY ENTRY:');
    console.log('==================');
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
    
    return {
      address: contractAddress,
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      registryEntry: {
        id: `test-genesis-grant-${timestamp}`,
        name: '🧪 Test Genesis Grant - 2500 Per User',
        description: 'Test genesis grant for development and testing. 2,500 MARS tokens per address.',
        contractAddress: contractAddress,
        deployedAt: new Date().toISOString(),
        category: 'genesis',
        isActive: true,
        contractType: 'simple',
        isWhitelistOnly: false
      }
    };
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    
    if (error.data) {
      console.error('Error data:', error.data);
    }
    
    // Try to get more details
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    
    throw error;
  }
}

if (require.main === module) {
  deploySimpleTest()
    .then((result) => {
      console.log('\n🎉 SUCCESS!');
      console.log('📍 Contract Address:', result.address);
      console.log('⛽ Gas Used:', result.gasUsed);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { deploySimpleTest }; 