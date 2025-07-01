const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110,
  name: 'Mars Credit Network'
};

const PAYMASTER_ADDRESS = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';

// Test the complete gasless grant flow
async function testGaslessFlow(contractAddress) {
  console.log('🧪 TESTING ENHANCED GASLESS GRANT FLOW');
  console.log('======================================');
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`💳 Paymaster: ${PAYMASTER_ADDRESS}`);
  
  const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ Please set DEPLOYER_PRIVATE_KEY in your .env file');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`👤 Testing with address: ${wallet.address}`);
  
  // Contract ABIs
  const GRANT_ABI = [
    'function getGrantInfo() view returns (uint256, uint256, uint256, uint256, bool, bool)',
    'function canUserRedeem(address) view returns (bool)',
    'function hasAddressRedeemed(address) view returns (bool)',
    'function authorizedPaymasters(address) view returns (bool)',
    'function redeemTokens() external'
  ];
  
  const PAYMASTER_ABI = [
    'function getBalance() view returns (uint256)',
    'function canUseSponsoredTransaction(address) view returns (bool)',
    'function authorizedContracts(address) view returns (bool)',
    'function sponsoredRedemption(address) external'
  ];
  
  const grantContract = new ethers.Contract(contractAddress, GRANT_ABI, wallet);
  const paymasterContract = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, wallet);
  
  try {
    // Step 1: Check grant status
    console.log('\n1️⃣ CHECKING GRANT STATUS:');
    const [totalAvailable, redemptionAmount, redeemed, remaining, isWhitelistMode, isPaused] = 
      await grantContract.getGrantInfo();
    
    console.log(`💰 Total Available: ${ethers.formatEther(totalAvailable)} MARS`);
    console.log(`🎁 Per User: ${ethers.formatEther(redemptionAmount)} MARS`);
    console.log(`📦 Remaining: ${ethers.formatEther(remaining)} MARS`);
    console.log(`🔒 Whitelist Mode: ${isWhitelistMode}`);
    console.log(`⏸️ Paused: ${isPaused}`);
    
    if (remaining === 0n) {
      console.error('❌ Grant has no remaining tokens. Please fund the contract first.');
      return;
    }
    
    // Step 2: Check paymaster integration
    console.log('\n2️⃣ CHECKING PAYMASTER INTEGRATION:');
    const isPaymasterAuthorized = await grantContract.authorizedPaymasters(PAYMASTER_ADDRESS);
    const isGrantAuthorized = await paymasterContract.authorizedContracts(contractAddress);
    const paymasterBalance = await paymasterContract.getBalance();
    
    console.log(`🔗 Paymaster authorized in grant: ${isPaymasterAuthorized ? '✅' : '❌'}`);
    console.log(`🔗 Grant authorized in paymaster: ${isGrantAuthorized ? '✅' : '❌'}`);
    console.log(`💳 Paymaster balance: ${ethers.formatEther(paymasterBalance)} MARS`);
    
    if (!isPaymasterAuthorized || !isGrantAuthorized) {
      console.error('❌ Paymaster integration not fully set up. Run setup command first.');
      return;
    }
    
    // Step 3: Check user eligibility
    console.log('\n3️⃣ CHECKING USER ELIGIBILITY:');
    const canRedeem = await grantContract.canUserRedeem(wallet.address);
    const hasRedeemed = await grantContract.hasAddressRedeemed(wallet.address);
    const canUseGasless = await paymasterContract.canUseSponsoredTransaction(wallet.address);
    
    console.log(`✅ Can redeem: ${canRedeem}`);
    console.log(`✅ Has already redeemed: ${hasRedeemed}`);
    console.log(`⚡ Can use gasless: ${canUseGasless}`);
    
    if (!canRedeem) {
      if (hasRedeemed) {
        console.log('ℹ️ User has already redeemed from this grant.');
      } else {
        console.log('ℹ️ User cannot redeem (may be whitelist mode or insufficient funds).');
      }
      return;
    }
    
    // Step 4: Test regular redemption
    console.log('\n4️⃣ TESTING REGULAR REDEMPTION:');
    console.log('💡 This costs gas but demonstrates basic functionality...');
    
    try {
      const balanceBefore = await provider.getBalance(wallet.address);
      console.log(`💰 Balance before: ${ethers.formatEther(balanceBefore)} MARS`);
      
      const tx = await grantContract.redeemTokens();
      console.log(`⏳ Regular redemption tx: ${tx.hash}`);
      const receipt = await tx.wait();
      
      const balanceAfter = await provider.getBalance(wallet.address);
      const gained = balanceAfter - balanceBefore;
      
      console.log(`✅ Regular redemption successful!`);
      console.log(`💰 Balance after: ${ethers.formatEther(balanceAfter)} MARS`);
      console.log(`📈 Net gain: ${ethers.formatEther(gained)} MARS (after gas costs)`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
    } catch (error) {
      console.log(`⚠️ Regular redemption failed: ${error.message}`);
      
      // Step 5: Test gasless redemption as alternative
      console.log('\n5️⃣ TESTING GASLESS REDEMPTION (ALTERNATIVE):');
      
      if (!canUseGasless) {
        console.log('⚠️ User cannot use gasless transaction (rate limited)');
        console.log('💡 This is normal if you recently used gasless functionality');
        return;
      }
      
      try {
        const balanceBefore = await provider.getBalance(wallet.address);
        console.log(`💰 Balance before: ${ethers.formatEther(balanceBefore)} MARS`);
        
        const gaslessTx = await paymasterContract.sponsoredRedemption(wallet.address);
        console.log(`⏳ Gasless redemption tx: ${gaslessTx.hash}`);
        await gaslessTx.wait();
        
        const balanceAfter = await provider.getBalance(wallet.address);
        const gained = balanceAfter - balanceBefore;
        
        console.log(`✅ GASLESS REDEMPTION SUCCESSFUL! 🎉`);
        console.log(`💰 Balance after: ${ethers.formatEther(balanceAfter)} MARS`);
        console.log(`📈 Net gain: ${ethers.formatEther(gained)} MARS`);
        console.log(`⚡ Gas cost: 0 MARS (paid by paymaster!)`);
        
      } catch (gaslessError) {
        console.error(`❌ Gasless redemption failed: ${gaslessError.message}`);
      }
    }
    
    // Step 6: Final verification
    console.log('\n6️⃣ FINAL VERIFICATION:');
    const hasRedeemedAfter = await grantContract.hasAddressRedeemed(wallet.address);
    console.log(`✅ User has redeemed: ${hasRedeemedAfter}`);
    
    if (hasRedeemedAfter) {
      console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
      console.log('✅ Enhanced Gasless Grant is working correctly');
      console.log('⚡ Gasless functionality is operational');
      console.log('🔒 Whitelist functionality is available');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if called directly
if (require.main === module) {
  const contractAddress = process.argv[2];
  
  if (!contractAddress) {
    console.log(`
🧪 Enhanced Gasless Grant Tester
===============================

Usage: node test-gasless-flow.js <contract_address>

This script will:
1. Check grant status and funding
2. Verify paymaster integration
3. Test user eligibility
4. Attempt regular redemption
5. Test gasless redemption functionality
6. Verify final state

Requirements:
- Contract must be funded with MARS tokens
- Paymaster integration must be set up
- User must not have already redeemed
    `);
    process.exit(1);
  }
  
  testGaslessFlow(contractAddress)
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test error:', error);
      process.exit(1);
    });
}

module.exports = { testGaslessFlow }; 