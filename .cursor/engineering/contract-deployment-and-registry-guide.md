# Mars Credit Network - Contract Deployment & Registry Management Guide

**Date:** December 27, 2024  
**Version:** 1.0  
**Purpose:** Complete guide for deploying smart contracts and managing the grants registry  

## 📋 **Overview**

This guide covers the complete workflow for:
1. Deploying new TokenGrant contracts to Mars Credit Network
2. Adding contracts to the grants registry
3. Frontend integration with live blockchain data
4. Troubleshooting and maintenance

## 🔧 **Prerequisites**

### **Network Requirements**
- **Network:** Mars Credit Network
- **Chain ID:** 110110
- **RPC URL:** https://rpc.marscredit.xyz
- **Explorer:** https://blockscan.marscredit.xyz/
- **EVM Version:** 1.10.18 (requires Istanbul compatibility)

### **Development Environment**
- Node.js 16+ 
- Truffle installed globally
- Funded wallet with MARS tokens
- Project dependencies installed (`npm install`)

## 🚀 **Step 1: Contract Deployment**

### **1.1 Configure Environment**

Create or update `.env` file:
```env
# Mars Credit Network Deployment Configuration
RPC_URL=https://rpc.marscredit.xyz
PRIVATE_KEY=your_private_key_without_0x_prefix
CHAIN_ID=110110
DEPLOYER_ADDRESS=your_wallet_address
```

### **1.2 Configure Contract Parameters**

Edit `.cursor/engineering/2_deploy_token_grant.js`:

**For different reward amounts:**
```javascript
// 10 MARS per user
const redemptionAmountPerUser = web3.utils.toWei("10", "ether");

// 5000 MARS per user  
const redemptionAmountPerUser = web3.utils.toWei("5000", "ether");

// 1 MARS per user
const redemptionAmountPerUser = web3.utils.toWei("1", "ether");
```

### **1.3 Verify Compiler Settings**

Ensure `truffle-config.js` has EVM 1.10.18 compatible settings:

```javascript
compilers: {
  solc: {
    version: "0.8.17",    // Compatible with EVM 1.10.18
    settings: {
      optimizer: {
        enabled: false     // Disable for debugging
      },
      evmVersion: "istanbul" // Compatible with EVM 1.10.18
    }
  }
}
```

### **1.4 Deploy Contract**

**Compile contracts:**
```bash
npm run compile
```

**Deploy to Mars Credit Network:**
```bash
npm run migrate:marscredit
```

**Force redeploy (if needed):**
```bash
npm run migrate:marscredit -- --reset
```

### **1.5 Deployment Success Output**

Successful deployment will show:
```
✓ Compiled /SimpleTokenGrant in 1890ms
SimpleTokenGrant deployed at address: 0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174
Contract successfully deployed!
Deployment info saved to: ./src/contracts/deployment.json
```

**Save this contract address - you'll need it for the registry!**

## 📋 **Step 2: Add Contract to Registry**

### **2.1 Using the Helper Script**

Generate registry configuration:
```bash
npm run add-grant 0xYourContractAddress "Grant Name" "Description" category
```

**Example:**
```bash
npm run add-grant 0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174 "Genesis Mars Grant" "First deployed token grant on Mars Credit Network" genesis
```

**Categories:** `genesis`, `community`, `developer`, `special`

### **2.2 Manual Registry Addition**

Edit `src/lib/grants-registry.ts` and add to the `GRANTS_REGISTRY` array:

```typescript
export const GRANTS_REGISTRY: GrantConfig[] = [
  // Existing grants...
  
  // Add new grant here:
  {
    id: 'your-unique-grant-id',
    name: 'Your Grant Name',
    description: 'Detailed description of the grant purpose and eligibility',
    contractAddress: '0xYourDeployedContractAddress',
    deployedAt: '2025-06-27T03:27:30.862Z', // Use actual deployment timestamp
    category: 'genesis', // or 'community', 'developer', 'special'
    isActive: true
  }
]
```

### **2.3 Registry Configuration Examples**

**Genesis Grant (Initial Distribution):**
```typescript
{
  id: 'genesis-mars-001',
  name: 'Genesis Mars Grant',
  description: 'Initial token distribution for early Mars Credit Network adopters',
  contractAddress: '0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174',
  deployedAt: '2025-06-27T03:27:30.862Z',
  category: 'genesis',
  isActive: true
}
```

**Community Rewards:**
```typescript
{
  id: 'community-rewards-001',
  name: 'Community Rewards Grant',
  description: 'Rewards for active community members and contributors',
  contractAddress: '0xYourContractAddress',
  deployedAt: '2025-06-27T04:00:00.000Z',
  category: 'community',
  isActive: true
}
```

**Developer Incentives:**
```typescript
{
  id: 'developer-incentive-001',
  name: 'Developer Incentive Grant',
  description: 'Special grant for developers building on Mars Credit Network',
  contractAddress: '0xYourContractAddress',
  deployedAt: '2025-06-27T05:00:00.000Z',
  category: 'developer',
  isActive: true
}
```

## 💰 **Step 3: Fund the Contract**

### **3.1 Funding Methods**

**Method 1: Direct Transfer**
Send MARS tokens directly to the contract address:
- **Contract Address:** Your deployed contract address
- **Amount:** However many MARS tokens you want to distribute
- **Note:** Contract needs tokens to distribute to users

**Method 2: Using fundGrant() Function**
Call the `fundGrant()` function from the contract owner address:
```solidity
// Send MARS tokens with the transaction
contractInstance.fundGrant({value: amountInWei})
```

### **3.2 Funding Calculations**

**Example funding scenarios:**
```
10 users × 10 MARS = 100 MARS needed
100 users × 10 MARS = 1,000 MARS needed  
1000 users × 5000 MARS = 5,000,000 MARS needed
```

**Convert to wei for funding:**
```javascript
// 1000 MARS in wei
const amount = web3.utils.toWei("1000", "ether")
// Result: "1000000000000000000000"
```

## 🔍 **Step 4: Verification & Testing**

### **4.1 Verify on Block Explorer**

Visit: https://blockscan.marscredit.xyz/address/YOUR_CONTRACT_ADDRESS

**Check for:**
- ✅ Contract creation transaction
- ✅ Contract verification (if needed)
- ✅ Funding transactions
- ✅ Current contract balance

### **4.2 Test Frontend Integration**

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Visit grants page:**
   ```
   http://localhost:3001/grants
   ```

3. **Verify live data loading:**
   - ✅ Contract appears in grants list
   - ✅ Live data from blockchain
   - ✅ Correct reward amounts
   - ✅ Progress tracking
   - ✅ Auto-refresh functionality

### **4.3 Test Contract Functions**

**Check contract state:**
```javascript
// In browser console or script
const publicClient = createPublicClient({
  chain: marsCreditNetwork,
  transport: http()
})

// Check total tokens available
const totalTokens = await publicClient.readContract({
  address: 'YOUR_CONTRACT_ADDRESS',
  abi: SIMPLE_TOKEN_GRANT_ABI,
  functionName: 'totalTokensAvailable'
})

// Check redemption amount  
const redemptionAmount = await publicClient.readContract({
  address: 'YOUR_CONTRACT_ADDRESS',
  abi: SIMPLE_TOKEN_GRANT_ABI,
  functionName: 'redemptionAmountPerUser'
})
```

## 🛠 **Step 5: Contract Management**

### **5.1 Update Grant Parameters**

**Change reward amount:**
```solidity
// Call updateGrant function (owner only)
contract.updateGrant(newRedemptionAmountInWei)

// Example: Update to 5000 MARS
contract.updateGrant("5000000000000000000000")
```

### **5.2 Pause/Unpause Contract**

**Pause redemptions:**
```solidity
contract.pause() // Owner only
```

**Resume redemptions:**
```solidity
contract.unpause() // Owner only
```

### **5.3 Emergency Functions**

**Withdraw remaining funds:**
```solidity
contract.emergencyWithdraw() // Owner only - withdraws all remaining MARS
```

**Check if address has redeemed:**
```solidity
contract.hasAddressRedeemed(userAddress) // Returns boolean
```

## 📊 **Step 6: Monitoring & Analytics**

### **6.1 Real-time Monitoring**

The frontend automatically displays:
- **Total Pool:** Total MARS tokens available
- **Per Address:** MARS tokens per redemption
- **Remaining:** MARS tokens left to claim
- **Claims Left:** Number of users who can still redeem
- **Progress:** Percentage of tokens distributed
- **Status:** Active/Paused/Completed

### **6.2 Manual Data Refresh**

- **Auto-refresh:** Every 30 seconds
- **Manual refresh:** Click refresh button on grants page
- **Force reload:** Refresh browser page

## 🚨 **Troubleshooting**

### **Common Deployment Issues**

**Issue: "insufficient funds for gas"**
```
Solution: Ensure deployment wallet has MARS tokens for gas fees
Check: wallet balance on https://blockscan.marscredit.xyz/
```

**Issue: "invalid opcode while deploying"**
```
Solution: Verify EVM compatibility settings in truffle-config.js
Required: Solidity 0.8.17, evmVersion: "istanbul"
```

**Issue: "Module not found: Can't resolve 'valtio/vanilla'"**
```
Solution: Install missing dependencies
Command: npm install --legacy-peer-deps
```

### **Registry Issues**

**Issue: Grant not appearing on frontend**
```
Solutions:
1. Check grant isActive: true
2. Verify contract address format (0x prefix)
3. Check for TypeScript errors in registry file
4. Restart development server
```

**Issue: "Failed to load grant data"**
```
Solutions:
1. Verify RPC connection to Mars Credit Network
2. Check contract address is correct
3. Ensure contract is deployed and funded
4. Check browser console for specific error messages
```

## 📁 **File Reference**

### **Smart Contracts**
- `contracts/SimpleTokenGrant.sol` - Main grant contract
- `contracts/TokenGrant.sol` - Advanced grant contract (with OpenZeppelin)
- `contracts/TestContract.sol` - Simple test contract

### **Deployment Scripts**
- `.cursor/engineering/2_deploy_token_grant.js` - Main deployment script
- `.cursor/engineering/3_deploy_test.js` - Test contract deployment

### **Configuration**
- `truffle-config.js` - Network and compiler configuration
- `.env` - Environment variables and wallet credentials
- `deployment-wallet.json` - Generated deployment wallet (DO NOT COMMIT)

### **Frontend Integration**
- `src/lib/grants-registry.ts` - Central registry for all grants
- `src/app/grants/page.tsx` - Grants listing page with live data
- `src/contracts/deployment.json` - Auto-generated deployment info

### **Helper Scripts**
- `scripts/add-grant.js` - Generate new grant configurations
- Package.json scripts for deployment and management

## 🔄 **Complete Workflow Summary**

### **For New Grant Deployment:**

1. **Configure:** Set reward amount in deployment script
2. **Deploy:** Run `npm run migrate:marscredit`
3. **Record:** Save contract address from deployment output
4. **Register:** Add contract to `src/lib/grants-registry.ts`
5. **Fund:** Send MARS tokens to contract address
6. **Verify:** Check on block explorer and frontend
7. **Test:** Connect wallet and test redemption flow

### **For Registry Management:**

1. **Add Grant:** Use helper script or manual addition to registry
2. **Configure:** Set name, description, category, and contract address
3. **Activate:** Ensure `isActive: true` in registry
4. **Monitor:** Use frontend to track real-time data
5. **Manage:** Use contract functions for pause/unpause/updates

## 🎯 **Best Practices**

### **Security:**
- ✅ Always test contracts on testnet first (if available)
- ✅ Verify contract addresses before adding to registry
- ✅ Keep deployment wallet private keys secure
- ✅ Use small amounts for initial testing

### **Gas Optimization:**
- ✅ Use 0.1 gwei gas price for Mars Credit Network
- ✅ Disable Solidity optimizer for debugging
- ✅ Use minimal deployment configuration

### **Registry Management:**
- ✅ Use descriptive grant names and IDs
- ✅ Include deployment timestamps
- ✅ Categorize grants appropriately
- ✅ Set `isActive: false` for completed grants

### **Frontend Integration:**
- ✅ Verify live data loading after registry updates
- ✅ Test all grant statuses (Active/Paused/Completed)
- ✅ Ensure error handling works properly
- ✅ Check mobile responsiveness

---

## 📞 **Quick Reference Commands**

```bash
# Compilation
npm run compile

# Deployment
npm run migrate:marscredit

# Add grant to registry (helper)
npm run add-grant 0xAddress "Name" "Description" category

# Development server
npm run dev

# Clean build
npm run clean && npm run compile
```

**This guide ensures repeatability and consistency for all future contract deployments and registry management on Mars Credit Network.** 🚀🔴 