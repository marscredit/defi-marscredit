const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110,
  name: 'Mars Credit Network'
};

// Paymaster address
const PAYMASTER_ADDRESS = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';

// Enhanced Gasless Grant ABI
const ENHANCED_GASLESS_GRANT_ABI = [
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)',
  'function getRemainingTokens() view returns (uint256)',
  'function isWhitelistMode() view returns (bool)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function isWhitelisted(address) view returns (bool)',
  'function canUserRedeem(address) view returns (bool)',
  'function authorizedPaymasters(address) view returns (bool)',
  'function getGrantInfo() view returns (uint256, uint256, uint256, uint256, bool, bool)',
  'function redeemTokens() external',
  'function redeemForUser(address) external',
  'function addToWhitelist(address) external',
  'function addMultipleToWhitelist(address[]) external',
  'function removeFromWhitelist(address) external',
  'function setWhitelistMode(bool) external',
  'function authorizePaymaster(address) external',
  'function revokePaymaster(address) external',
  'function fundGrant() external payable',
  'function emergencyWithdraw() external',
  'function pause() external',
  'function unpause() external'
];

// Paymaster ABI
const PAYMASTER_ABI = [
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function authorizeContract(address) external',
  'function authorizedContracts(address) view returns (bool)',
  'function canUseSponsoredTransaction(address) view returns (bool)',
  'function sponsoredRedemption(address) external'
];

class EnhancedGaslessGrantManager {
  constructor(contractAddress, privateKey) {
    this.contractAddress = contractAddress;
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, ENHANCED_GASLESS_GRANT_ABI, this.wallet);
    this.paymaster = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, this.wallet);
  }

  async init() {
    console.log('🚀 Initializing Enhanced Gasless Grant Manager...');
    console.log('📍 Contract:', this.contractAddress);
    console.log('💳 Paymaster:', PAYMASTER_ADDRESS);
    console.log('👤 Manager address:', this.wallet.address);
    
    // Verify ownership
    const owner = await this.contract.owner();
    if (owner.toLowerCase() !== this.wallet.address.toLowerCase()) {
      throw new Error(`❌ You are not the owner of this contract. Owner: ${owner}`);
    }
    
    console.log('✅ Ownership verified');
    
    // Get current status
    await this.getStatus();
  }

  async getStatus() {
    console.log('\n📊 ENHANCED GASLESS GRANT STATUS:');
    console.log('==================================');
    
    try {
      const [totalAvailable, redemptionAmount, redeemed, remaining, isWhitelistMode, isPaused] = 
        await this.contract.getGrantInfo();
      
      console.log(`💰 Total Pool: ${ethers.formatEther(totalAvailable)} MARS`);
      console.log(`🎁 Per Address: ${ethers.formatEther(redemptionAmount)} MARS`);
      console.log(`📤 Redeemed: ${ethers.formatEther(redeemed)} MARS`);
      console.log(`📦 Remaining: ${ethers.formatEther(remaining)} MARS`);
      console.log(`🔒 Whitelist Mode: ${isWhitelistMode ? 'ENABLED' : 'DISABLED (PUBLIC)'}`);
      console.log(`⏸️ Paused: ${isPaused ? 'YES' : 'NO'}`);
      
      const claimsLeft = Math.floor(Number(ethers.formatEther(remaining)) / Number(ethers.formatEther(redemptionAmount)));
      console.log(`👥 Claims Left: ${claimsLeft}`);
      
      // Check paymaster integration
      console.log('\n⚡ GASLESS INTEGRATION:');
      const isPaymasterAuthorized = await this.contract.authorizedPaymasters(PAYMASTER_ADDRESS);
      console.log(`🔗 Paymaster authorized in grant: ${isPaymasterAuthorized ? '✅' : '❌'}`);
      
      try {
        const isGrantAuthorizedInPaymaster = await this.paymaster.authorizedContracts(this.contractAddress);
        console.log(`🔗 Grant authorized in paymaster: ${isGrantAuthorizedInPaymaster ? '✅' : '❌'}`);
        
        const paymasterBalance = await this.paymaster.getBalance();
        console.log(`💳 Paymaster balance: ${ethers.formatEther(paymasterBalance)} MARS`);
      } catch (error) {
        console.log(`🔗 Grant authorized in paymaster: ❓ (${error.message})`);
      }
      
      return {
        totalAvailable: ethers.formatEther(totalAvailable),
        redemptionAmount: ethers.formatEther(redemptionAmount),
        remaining: ethers.formatEther(remaining),
        isWhitelistMode,
        isPaused,
        claimsLeft,
        gaslessEnabled: isPaymasterAuthorized
      };
    } catch (error) {
      console.error('❌ Error getting status:', error.message);
      throw error;
    }
  }

  async fundGrant(amountInMars) {
    console.log(`\n💰 Funding gasless grant with ${amountInMars} MARS...`);
    
    try {
      const amount = ethers.parseEther(amountInMars.toString());
      const balance = await this.provider.getBalance(this.wallet.address);
      
      if (balance < amount) {
        throw new Error(`Insufficient balance. Need ${amountInMars} MARS, have ${ethers.formatEther(balance)} MARS`);
      }
      
      const tx = await this.contract.fundGrant({ value: amount });
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Gasless grant funded! Gas used: ${receipt.gasUsed.toString()}`);
      
      // Show updated status
      await this.getStatus();
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error funding grant:', error.message);
      throw error;
    }
  }

  async testGaslessRedemption(userAddress) {
    console.log(`\n⚡ Testing gasless redemption for ${userAddress}...`);
    
    try {
      // Check if user can redeem
      const canRedeem = await this.contract.canUserRedeem(userAddress);
      if (!canRedeem) {
        console.error('❌ User cannot redeem (already redeemed, not whitelisted, or insufficient funds)');
        return false;
      }
      
      // Check if user can use gasless transaction
      const canUseGasless = await this.paymaster.canUseSponsoredTransaction(userAddress);
      if (!canUseGasless) {
        console.warn('⚠️ User cannot use gasless transaction (rate limited or not eligible)');
      }
      
      // Execute gasless redemption via paymaster
      const tx = await this.paymaster.sponsoredRedemption(userAddress);
      console.log(`⏳ Gasless transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Gasless redemption successful! Gas used: ${receipt.gasUsed.toString()}`);
      
      // Verify redemption
      const hasRedeemed = await this.contract.hasAddressRedeemed(userAddress);
      console.log(`✅ Redemption verified: ${hasRedeemed}`);
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error testing gasless redemption:', error.message);
      throw error;
    }
  }

  async addToWhitelist(addresses) {
    console.log(`\n🔒 Adding ${addresses.length} address(es) to whitelist...`);
    
    try {
      // Validate addresses
      const validAddresses = addresses.filter(addr => ethers.isAddress(addr));
      if (validAddresses.length !== addresses.length) {
        console.warn('⚠️ Some invalid addresses were filtered out');
      }
      
      if (validAddresses.length === 0) {
        throw new Error('No valid addresses provided');
      }
      
      let tx;
      if (validAddresses.length === 1) {
        tx = await this.contract.addToWhitelist(validAddresses[0]);
        console.log(`📝 Adding single address: ${validAddresses[0]}`);
      } else {
        tx = await this.contract.addMultipleToWhitelist(validAddresses);
        console.log(`📝 Adding multiple addresses:`, validAddresses);
      }
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Addresses added to whitelist! Gas used: ${receipt.gasUsed.toString()}`);
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error adding to whitelist:', error.message);
      throw error;
    }
  }

  async checkAddresses(addresses) {
    console.log(`\n🔍 Checking status for ${addresses.length} address(es)...`);
    
    const results = [];
    for (const address of addresses) {
      try {
        const isWhitelisted = await this.contract.isWhitelisted(address);
        const hasRedeemed = await this.contract.hasAddressRedeemed(address);
        const canRedeem = await this.contract.canUserRedeem(address);
        const canUseGasless = await this.paymaster.canUseSponsoredTransaction(address);
        
        results.push({
          address,
          isWhitelisted,
          hasRedeemed,
          canRedeem,
          canUseGasless
        });
        
        console.log(`📋 ${address}:`);
        console.log(`   Whitelisted: ${isWhitelisted ? '✅' : '❌'}`);
        console.log(`   Has Redeemed: ${hasRedeemed ? '✅' : '❌'}`);
        console.log(`   Can Redeem: ${canRedeem ? '✅' : '❌'}`);
        console.log(`   Can Use Gasless: ${canUseGasless ? '⚡' : '⭕'}`);
      } catch (error) {
        console.error(`❌ Error checking ${address}:`, error.message);
        results.push({
          address,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async setMode(isWhitelistMode) {
    console.log(`\n🔄 Setting mode to: ${isWhitelistMode ? 'WHITELIST' : 'PUBLIC'}...`);
    
    try {
      const tx = await this.contract.setWhitelistMode(isWhitelistMode);
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Mode changed! Gas used: ${receipt.gasUsed.toString()}`);
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error changing mode:', error.message);
      throw error;
    }
  }

  async setupPaymasterIntegration() {
    console.log('\n🔗 Setting up complete paymaster integration...');
    
    try {
      // Step 1: Authorize paymaster in grant
      console.log('1️⃣ Authorizing paymaster in grant contract...');
      const authTx1 = await this.contract.authorizePaymaster(PAYMASTER_ADDRESS);
      await authTx1.wait();
      console.log('✅ Paymaster authorized in grant');
      
      // Step 2: Authorize grant in paymaster (if we're the owner)
      console.log('2️⃣ Authorizing grant in paymaster...');
      const paymasterOwner = await this.paymaster.owner();
      if (paymasterOwner.toLowerCase() === this.wallet.address.toLowerCase()) {
        const authTx2 = await this.paymaster.authorizeContract(this.contractAddress);
        await authTx2.wait();
        console.log('✅ Grant authorized in paymaster');
      } else {
        console.log('⚠️ Cannot authorize - not paymaster owner');
        console.log(`📝 Manual step: Have ${paymasterOwner} authorize contract ${this.contractAddress}`);
      }
      
      // Verify setup
      const isSetup = await this.contract.authorizedPaymasters(PAYMASTER_ADDRESS);
      console.log(`✅ Integration setup complete: ${isSetup}`);
      
    } catch (error) {
      console.error('❌ Error setting up paymaster integration:', error.message);
      throw error;
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
🔧 Enhanced Gasless Grant Manager
=================================

Usage: node manage-enhanced-gasless-grant.js <command> [options]

Commands:
  status <contract_address>                    - Get grant status
  fund <contract_address> <amount_in_mars>     - Fund grant with MARS
  add <contract_address> <address1,address2>   - Add addresses to whitelist
  check <contract_address> <address1,address2> - Check address status
  mode <contract_address> <true|false>         - Set whitelist mode
  test <contract_address> <user_address>       - Test gasless redemption
  setup <contract_address>                     - Setup paymaster integration

Environment variables needed:
  DEPLOYER_PRIVATE_KEY - Your private key (must be contract owner)
    `);
    process.exit(1);
  }
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Please set DEPLOYER_PRIVATE_KEY in your .env file');
    process.exit(1);
  }
  
  (async () => {
    try {
      switch (command) {
        case 'status':
          const manager = new EnhancedGaslessGrantManager(args[1], privateKey);
          await manager.init();
          break;
          
        case 'fund':
          const fundManager = new EnhancedGaslessGrantManager(args[1], privateKey);
          await fundManager.init();
          await fundManager.fundGrant(parseFloat(args[2]));
          break;
          
        case 'add':
          const addManager = new EnhancedGaslessGrantManager(args[1], privateKey);
          await addManager.init();
          const addresses = args[2].split(',');
          await addManager.addToWhitelist(addresses);
          break;
          
        case 'check':
          const checkManager = new EnhancedGaslessGrantManager(args[1], privateKey);
          await checkManager.init();
          const checkAddresses = args[2].split(',');
          await checkManager.checkAddresses(checkAddresses);
          break;
          
        case 'mode':
          const modeManager = new EnhancedGaslessGrantManager(args[1], privateKey);
          await modeManager.init();
          await modeManager.setMode(args[2] === 'true');
          break;
          
        case 'test':
          const testManager = new EnhancedGaslessGrantManager(args[1], privateKey);
          await testManager.init();
          await testManager.testGaslessRedemption(args[2]);
          break;
          
        case 'setup':
          const setupManager = new EnhancedGaslessGrantManager(args[1], privateKey);
          await setupManager.init();
          await setupManager.setupPaymasterIntegration();
          break;
          
        default:
          console.error('❌ Unknown command:', command);
          process.exit(1);
      }
    } catch (error) {
      console.error('💥 Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { EnhancedGaslessGrantManager }; 