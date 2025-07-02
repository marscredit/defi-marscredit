const ethers = require('ethers');

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110
};

// Contract addresses
const grantAddress = '0xFde59B4b965b6B0A9817F050261244Fe5f99B911'; // Enhanced Test Genesis Grant
const backendWallet = '0x06F0f6935dfe7Aef5947a12cCDa532346a815ccD'; // Backend wallet from API
const deployerPrivateKey = '0x702f0b3c12108a7341cc1c94ac83a4a4732df139fb75880d13568883244082ea';

// Enhanced Gasless Grant ABI
const GRANT_ABI = [
  'function owner() view returns (address)',
  'function authorizedPaymasters(address) view returns (bool)',
  'function authorizePaymaster(address) external',
  'function revokePaymaster(address) external'
];

async function authorizeBackendAsPaymaster() {
  console.log('🔗 AUTHORIZING BACKEND WALLET AS PAYMASTER');
  console.log('==========================================');
  console.log('🎯 Grant Contract:', grantAddress);
  console.log('💳 Backend Wallet:', backendWallet);
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);
  
  console.log('👤 Deployer (Grant Owner):', deployerWallet.address);
  
  // Check deployer balance
  const balance = await provider.getBalance(deployerWallet.address);
  console.log('💰 Deployer balance:', ethers.formatEther(balance), 'MARS');
  
  // Create grant contract instance
  const grant = new ethers.Contract(grantAddress, GRANT_ABI, deployerWallet);
  
  try {
    // Check current authorization status
    console.log('\n🔍 Checking current authorization status...');
    const isCurrentlyAuthorized = await grant.authorizedPaymasters(backendWallet);
    console.log('📊 Backend wallet authorized:', isCurrentlyAuthorized);
    
    if (isCurrentlyAuthorized) {
      console.log('✅ Backend wallet is already authorized as paymaster!');
      console.log('🎉 No action needed - gasless redemptions should work.');
      return;
    }
    
    // Check if deployer is the owner
    const owner = await grant.owner();
    console.log('👑 Grant owner:', owner);
    
    if (owner.toLowerCase() !== deployerWallet.address.toLowerCase()) {
      console.error('❌ Deployer wallet is not the grant owner!');
      console.error('Only the grant owner can authorize paymasters.');
      return;
    }
    
    // Authorize backend wallet as paymaster
    console.log('\n🚀 Authorizing backend wallet as paymaster...');
    const tx = await grant.authorizePaymaster(backendWallet);
    console.log('📝 Transaction submitted:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('⛽ Gas used:', receipt.gasUsed.toString());
    
    // Verify authorization
    const isNowAuthorized = await grant.authorizedPaymasters(backendWallet);
    console.log('📊 Backend wallet now authorized:', isNowAuthorized);
    
    if (isNowAuthorized) {
      console.log('\n🎉 SUCCESS! Backend wallet authorized as paymaster');
      console.log('✅ Gasless redemptions should now work through the API');
      console.log('⚡ Users can redeem tokens with zero gas fees');
      
      console.log('\n📝 NEXT STEPS:');
      console.log('1. 🔄 Restart your Next.js dev server');
      console.log('2. 🌐 Test the gasless redemption API');
      console.log('3. ✅ Frontend should now show green gasless button');
    } else {
      console.error('❌ Authorization failed - please check transaction status');
    }
    
  } catch (error) {
    console.error('❌ Error authorizing backend wallet:', error.message);
    console.error('Details:', error);
  }
}

// Run the script
authorizeBackendAsPaymaster()
  .then(() => {
    console.log('\n🎊 AUTHORIZATION SCRIPT COMPLETED!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ SCRIPT FAILED:', error);
    process.exit(1);
  }); 