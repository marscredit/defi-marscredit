# Enhanced Token Grants System

## Overview

The Enhanced Token Grants system provides flexible MARS token distribution with both **public** and **whitelist-only** modes. This allows you to create targeted grants for specific community contributors while maintaining the option for public redemptions.

## Changes Made

### ✅ Genesis Grant Removed
- **Genesis MARS Grant - 5000 Per User** has been **deactivated**
- Only the **Gasless Grant** remains active for public use

### ✅ Enhanced Smart Contract Created
- **EnhancedTokenGrant.sol** - Full-featured contract with whitelist capability
- Supports both public and whitelist-only modes
- Owner controls for managing grants, whitelists, and funding

### ✅ Management Tools Added
- Compilation script for Solidity contracts
- Deployment script with configuration
- Whitelist management utility for day-to-day operations

## Smart Contract Features

### Core Functionality
- **Dual Mode Operation**: Switch between public and whitelist-only redemption
- **Whitelist Management**: Add/remove addresses, batch operations
- **Pause/Unpause**: Emergency controls for grant management
- **Gas Allowance**: Automatic 0.01 MARS gas allowance per redemption
- **Owner Controls**: Complete administrative control over grant parameters

### Security Features
- **Reentrancy Protection**: Safe token transfers
- **Access Control**: Owner-only administrative functions
- **Input Validation**: Address and amount validation
- **Emergency Withdrawal**: Owner can recover funds if needed

## Usage Examples

### Example 1: Community Contributor Grant
**Scenario**: Reward 3 community contributors with 100,000 MARS each

```bash
# 1. Deploy contract (100K MARS per user, whitelist mode)
node scripts/deploy-enhanced-grant.js

# 2. Fund with 300,000 MARS
node scripts/manage-whitelist-grant.js fund <CONTRACT_ADDRESS> 300000

# 3. Add contributors to whitelist
node scripts/manage-whitelist-grant.js add <CONTRACT_ADDRESS> 0xAddr1,0xAddr2,0xAddr3

# 4. Verify setup
node scripts/manage-whitelist-grant.js status <CONTRACT_ADDRESS>
```

### Example 2: Public Grant
**Scenario**: Create a public grant where anyone can redeem

```bash
# 1. Deploy in whitelist mode first
node scripts/deploy-enhanced-grant.js

# 2. Fund the contract
node scripts/manage-whitelist-grant.js fund <CONTRACT_ADDRESS> 1000000

# 3. Switch to public mode
node scripts/manage-whitelist-grant.js mode <CONTRACT_ADDRESS> false
```

## File Structure

```
├── contracts/
│   └── EnhancedTokenGrant.sol          # Main contract with whitelist functionality
├── scripts/
│   ├── compile-contract.js             # Solidity compilation
│   ├── deploy-enhanced-grant.js        # Contract deployment
│   └── manage-whitelist-grant.js       # Whitelist management utility
├── src/lib/
│   └── grants-registry.ts              # Updated with enhanced contract support
└── build/contracts/
    └── EnhancedTokenGrant.json         # Compiled contract
```

## Contract Deployment Process

### 1. Compilation
```bash
# Compile the contract
node scripts/compile-contract.js EnhancedTokenGrant
```

### 2. Set Environment Variables
```bash
# Add to your .env file
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

### 3. Deploy Contract
```bash
# Deploy with default settings (100K MARS per user, whitelist mode)
node scripts/deploy-enhanced-grant.js
```

### 4. Update Registry
Add the deployed contract to your grants registry:

```typescript
{
  id: 'community-grant-001',
  name: 'Community Contributor Grant - 100K Per User',
  description: 'Whitelist-only grant for community contributors. 100,000 MARS tokens per approved address.',
  contractAddress: '0xYOUR_CONTRACT_ADDRESS',
  deployedAt: '2025-06-27T16:00:00.000Z',
  category: 'community',
  isActive: true,
  contractType: 'enhanced',
  isWhitelistOnly: true
}
```

## Management Commands

### Grant Status
```bash
node scripts/manage-whitelist-grant.js status <CONTRACT_ADDRESS>
```

### Whitelist Management
```bash
# Add single address
node scripts/manage-whitelist-grant.js add <CONTRACT_ADDRESS> 0x123...

# Add multiple addresses
node scripts/manage-whitelist-grant.js add <CONTRACT_ADDRESS> 0xAddr1,0xAddr2,0xAddr3

# Check whitelist status
node scripts/manage-whitelist-grant.js check <CONTRACT_ADDRESS> 0xAddr1,0xAddr2
```

### Grant Funding
```bash
# Fund with MARS tokens
node scripts/manage-whitelist-grant.js fund <CONTRACT_ADDRESS> 300000
```

### Mode Control
```bash
# Enable whitelist mode
node scripts/manage-whitelist-grant.js mode <CONTRACT_ADDRESS> true

# Enable public mode
node scripts/manage-whitelist-grant.js mode <CONTRACT_ADDRESS> false
```

### Emergency Controls
```bash
# Pause contract
node scripts/manage-whitelist-grant.js pause <CONTRACT_ADDRESS>

# Unpause contract
node scripts/manage-whitelist-grant.js unpause <CONTRACT_ADDRESS>
```

## Frontend Integration

The enhanced grants are automatically supported by your existing frontend:

### Grant Registry Updates
- Contracts marked with `contractType: 'enhanced'`
- Whitelist mode indicated by `isWhitelistOnly: true`
- Enhanced status checking with `canUserRedeem()`

### New Functions Available
```typescript
// Check if user is whitelisted
const isWhitelisted = await isUserWhitelisted(grantAddress, userAddress);

// Check if user can redeem (considers whitelist + redemption status)
const canRedeem = await canUserRedeem(grantAddress, userAddress);

// Enhanced redemption status checking
const hasRedeemed = await hasUserRedeemed(grantAddress, userAddress, 'enhanced');
```

## Contract Specifications

### Constructor Parameters
- `redemptionAmountPerUser`: Amount each user can redeem (in wei)
- `isWhitelistMode`: Start in whitelist mode (true) or public mode (false)

### Key Functions
- `redeemTokens()`: User redeems their allocation
- `addToWhitelist(address)`: Add single address to whitelist
- `addMultipleToWhitelist(address[])`: Batch add addresses
- `setWhitelistMode(bool)`: Switch between modes
- `fundGrant()`: Owner funds the contract
- `getGrantInfo()`: Get comprehensive grant status

### Events
- `GrantCreated`: Contract deployed
- `GrantFunded`: Contract receives funding
- `TokensRedeemed`: User redeems tokens
- `WhitelistUpdated`: Whitelist changes
- `ModeChanged`: Mode switched

## Best Practices

### For Community Grants
1. **Deploy in whitelist mode** for targeted distribution
2. **Fund before adding addresses** to ensure sufficient balance
3. **Batch add addresses** for gas efficiency
4. **Verify whitelist** before announcing the grant

### For Public Grants
1. **Start in whitelist mode** for initial setup
2. **Fund adequately** based on expected demand
3. **Switch to public mode** when ready to launch
4. **Monitor redemptions** and pause if needed

## Troubleshooting

### Common Issues

**"Address not whitelisted"**
- Ensure address is added to whitelist
- Check whitelist mode is enabled
- Use `check` command to verify status

**"Insufficient tokens remaining"**
- Fund the contract with more MARS
- Check remaining balance with `status` command

**"Transaction reverts"**
- User may have already redeemed
- Contract might be paused
- Check gas limits and network connection

### Debug Commands
```bash
# Check detailed status
node scripts/manage-whitelist-grant.js status <CONTRACT_ADDRESS>

# Verify specific addresses
node scripts/manage-whitelist-grant.js check <CONTRACT_ADDRESS> <ADDRESS>
```

## Security Notes

- **Private Key Security**: Never commit private keys to git
- **Owner Controls**: Only contract owner can manage whitelist and funding
- **Emergency Functions**: `pause()` and `emergencyWithdraw()` for crisis management
- **Input Validation**: All functions validate inputs before execution

## Next Steps

1. **Deploy your first enhanced grant** using the deployment script
2. **Set up a community contributor grant** with specific addresses
3. **Test the whitelist functionality** before going live
4. **Monitor grant usage** through the status commands
5. **Scale to multiple grants** as your community grows

---

The enhanced grant system gives you complete control over MARS token distribution while maintaining the simplicity and security your community needs. 