const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110,
  name: 'Mars Credit Network'
};

// Enhanced Token Grant ABI (simplified for management)
const ENHANCED_GRANT_ABI = [
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)',
  'function getRemainingTokens() view returns (uint256)',
  'function isWhitelistMode() view returns (bool)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function isWhitelisted(address) view returns (bool)',
  'function canUserRedeem(address) view returns (bool)',
  'function getGrantInfo() view returns (uint256, uint256, uint256, uint256, bool, bool)',
  'function addToWhitelist(address) external',
  'function addMultipleToWhitelist(address[]) external',
  'function removeFromWhitelist(address) external',
  'function setWhitelistMode(bool) external',
  'function fundGrant() external payable',
  'function emergencyWithdraw() external',
  'function pause() external',
  'function unpause() external'
];

class WhitelistGrantManager {
  constructor(contractAddress, privateKey) {
    this.contractAddress = contractAddress;
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, ENHANCED_GRANT_ABI, this.wallet);
  }

  async init() {
    console.log('🚀 Initializing Whitelist Grant Manager...');
    console.log('📍 Contract:', this.contractAddress);
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
    console.log('\n📊 GRANT STATUS:');
    console.log('================');
    
    try {
      const [totalAvailable, redemptionAmount, redeemed, remaining, isWhitelistMode, isPaused] = 
        await this.contract.getGrantInfo();
      
      console.log(`💰 Total Pool: ${ethers.formatEther(totalAvailable)} MARS`);
      console.log(`🎁 Per Address: ${ethers.formatEther(redemptionAmount)} MARS`);
      console.log(`📤 Redeemed: ${ethers.formatEther(redeemed)} MARS`);
      console.log(`📦 Remaining: ${ethers.formatEther(remaining)} MARS`);
      console.log(`🔒 Whitelist Mode: ${isWhitelistMode ? 'ENABLED' : 'DISABLED'}`);
      console.log(`⏸️ Paused: ${isPaused ? 'YES' : 'NO'}`);
      
      const claimsLeft = Math.floor(Number(ethers.formatEther(remaining)) / Number(ethers.formatEther(redemptionAmount)));
      console.log(`👥 Claims Left: ${claimsLeft}`);
      
      return {
        totalAvailable: ethers.formatEther(totalAvailable),
        redemptionAmount: ethers.formatEther(redemptionAmount),
        remaining: ethers.formatEther(remaining),
        isWhitelistMode,
        isPaused,
        claimsLeft
      };
    } catch (error) {
      console.error('❌ Error getting status:', error.message);
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

  async removeFromWhitelist(address) {
    console.log(`\n🗑️ Removing ${address} from whitelist...`);
    
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address provided');
      }
      
      const tx = await this.contract.removeFromWhitelist(address);
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Address removed from whitelist! Gas used: ${receipt.gasUsed.toString()}`);
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error removing from whitelist:', error.message);
      throw error;
    }
  }

  async checkWhitelist(addresses) {
    console.log(`\n🔍 Checking whitelist status for ${addresses.length} address(es)...`);
    
    const results = [];
    for (const address of addresses) {
      try {
        const isWhitelisted = await this.contract.isWhitelisted(address);
        const hasRedeemed = await this.contract.hasAddressRedeemed(address);
        const canRedeem = await this.contract.canUserRedeem(address);
        
        results.push({
          address,
          isWhitelisted,
          hasRedeemed,
          canRedeem
        });
        
        console.log(`📋 ${address}:`);
        console.log(`   Whitelisted: ${isWhitelisted ? '✅' : '❌'}`);
        console.log(`   Has Redeemed: ${hasRedeemed ? '✅' : '❌'}`);
        console.log(`   Can Redeem: ${canRedeem ? '✅' : '❌'}`);
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

  async fundGrant(amountInMars) {
    console.log(`\n💰 Funding grant with ${amountInMars} MARS...`);
    
    try {
      const amount = ethers.parseEther(amountInMars.toString());
      const balance = await this.provider.getBalance(this.wallet.address);
      
      if (balance < amount) {
        throw new Error(`Insufficient balance. Need ${amountInMars} MARS, have ${ethers.formatEther(balance)} MARS`);
      }
      
      const tx = await this.contract.fundGrant({ value: amount });
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Grant funded! Gas used: ${receipt.gasUsed.toString()}`);
      
      // Show updated status
      await this.getStatus();
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error funding grant:', error.message);
      throw error;
    }
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

  async pause() {
    console.log('\n⏸️ Pausing contract...');
    
    try {
      const tx = await this.contract.pause();
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Contract paused! Gas used: ${receipt.gasUsed.toString()}`);
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error pausing contract:', error.message);
      throw error;
    }
  }

  async unpause() {
    console.log('\n▶️ Unpausing contract...');
    
    try {
      const tx = await this.contract.unpause();
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Contract unpaused! Gas used: ${receipt.gasUsed.toString()}`);
      
      return tx.hash;
    } catch (error) {
      console.error('❌ Error unpausing contract:', error.message);
      throw error;
    }
  }
}

// Example usage for community contributor grant
async function createCommunityGrant() {
  console.log('🎯 EXAMPLE: Creating Community Contributor Grant');
  console.log('===============================================');
  
  const EXAMPLE_CONFIG = {
    contractAddress: '0x1234567890123456789012345678901234567890', // Replace with actual address
    privateKey: process.env.DEPLOYER_PRIVATE_KEY,
    fundingAmount: 300000, // 300,000 MARS for 3 users
    contributorAddresses: [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333'
    ]
  };
  
  try {
    const manager = new WhitelistGrantManager(EXAMPLE_CONFIG.contractAddress, EXAMPLE_CONFIG.privateKey);
    await manager.init();
    
    // Fund the grant
    await manager.fundGrant(EXAMPLE_CONFIG.fundingAmount);
    
    // Add contributors to whitelist
    await manager.addToWhitelist(EXAMPLE_CONFIG.contributorAddresses);
    
    // Verify whitelist
    await manager.checkWhitelist(EXAMPLE_CONFIG.contributorAddresses);
    
    console.log('\n🎉 Community grant setup complete!');
    console.log('✅ Contract funded with 300,000 MARS');
    console.log('✅ 3 contributors added to whitelist');
    console.log('✅ Each can redeem 100,000 MARS');
    
  } catch (error) {
    console.error('💥 Error setting up community grant:', error.message);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
🔧 Whitelist Grant Manager
=========================

Usage: node manage-whitelist-grant.js <command> [options]

Commands:
  status <contract_address>                    - Get grant status
  add <contract_address> <address1,address2>   - Add addresses to whitelist
  remove <contract_address> <address>          - Remove address from whitelist
  check <contract_address> <address1,address2> - Check whitelist status
  fund <contract_address> <amount_in_mars>     - Fund grant with MARS
  mode <contract_address> <true|false>         - Set whitelist mode
  pause <contract_address>                     - Pause contract
  unpause <contract_address>                   - Unpause contract
  example                                      - Run example setup

Environment variables needed:
  DEPLOYER_PRIVATE_KEY - Your private key (must be contract owner)
    `);
    process.exit(1);
  }
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey && command !== 'example') {
    console.error('❌ Please set DEPLOYER_PRIVATE_KEY in your .env file');
    process.exit(1);
  }
  
  (async () => {
    try {
      switch (command) {
        case 'status':
          const manager = new WhitelistGrantManager(args[1], privateKey);
          await manager.init();
          break;
          
        case 'add':
          const addManager = new WhitelistGrantManager(args[1], privateKey);
          await addManager.init();
          const addresses = args[2].split(',');
          await addManager.addToWhitelist(addresses);
          break;
          
        case 'fund':
          const fundManager = new WhitelistGrantManager(args[1], privateKey);
          await fundManager.init();
          await fundManager.fundGrant(parseFloat(args[2]));
          break;
          
        case 'example':
          await createCommunityGrant();
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

module.exports = { WhitelistGrantManager }; 