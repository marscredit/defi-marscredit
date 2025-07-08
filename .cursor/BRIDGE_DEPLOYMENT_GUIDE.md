# 🌉 Mars Bridge - Same Day Deployment Guide

**Get the Mars ↔ Solana bridge running TODAY!**

## 🚀 Quick Start (20 minutes)

### Step 1: Deploy L1 Bridge Contract (5 minutes)

```bash
# Compile and deploy the bridge contract
npm run compile
npm run deploy:bridge

# Should output: Bridge deployed at: 0x...
# Save this address - you'll need it!
```

### Step 2: Setup Solana Environment (5 minutes)

```bash
# Install Rust and Anchor (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
npm install -g @coral-xyz/anchor-cli

# Generate Solana keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Get some SOL for deployment (devnet)
solana airdrop 2

# Build and deploy Solana program
npm run build:solana
npm run deploy:solana:devnet

# Create MARS mint on Solana
solana-keygen new --outfile mars-mint-keypair.json
spl-token create-token mars-mint-keypair.json --mint-authority ~/.config/solana/id.json
```

### Step 3: Configure Environment (2 minutes)

Create `.env` file:
```env
# L1 Configuration
MARS_CREDIT_RPC_URL=https://rpc.marscredit.xyz
BRIDGE_CONTRACT_ADDRESS=0x... # From Step 1
RELAYER_PRIVATE_KEY=your_l1_private_key

# Solana Configuration  
SOLANA_RPC_URL=https://api.devnet.solana.com
MARS_BRIDGE_PROGRAM_ID=MarsB1dg3K8GzRTaY3PdJwEYy2HjnxCEwUXXUyZvvQUz
MARS_MINT_ADDRESS=... # From Step 2
SOLANA_PRIVATE_KEY=[...] # Your Solana private key array
SOLANA_AUTHORITY_PUBKEY=... # Your Solana public key
```

### Step 4: Start Bridge Relayer (2 minutes)

```bash
# Start the relayer service
npm run bridge:start

# You should see:
# ✅ Mars Bridge Relayer is running!
```

### Step 5: Test the Bridge (5 minutes)

```bash
# Start the frontend
npm run dev

# Visit: http://localhost:3000/bridge
# Connect wallets and test bridging!
```

## 📋 Required Setup

### Prerequisites
- Node.js 18+
- Rust + Anchor CLI
- MetaMask wallet with MARS tokens
- Solana wallet (Phantom recommended)

### Wallets Needed
- **L1 Wallet**: For deploying contracts and relaying
- **Solana Wallet**: For deploying programs and relaying
- **Test Wallets**: For testing bridge functionality

## 🔧 Detailed Steps

### L1 Bridge Contract Deployment

1. **Deploy the contract:**
   ```bash
   npm run deploy:bridge
   ```

2. **Add relayer to bridge:**
   ```bash
   # Using truffle console or ethers script
   const bridge = await MarsBridge.deployed()
   await bridge.addRelayer('YOUR_RELAYER_ADDRESS')
   ```

3. **Fund the bridge for unlock operations:**
   ```bash
   # Send MARS tokens to the bridge contract
   # This is needed for Solana → L1 unlocks
   ```

### Solana Program Deployment

1. **Build the program:**
   ```bash
   anchor build
   ```

2. **Deploy to devnet:**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

3. **Initialize the bridge:**
   ```bash
   # Use anchor CLI or create initialization script
   anchor run initialize
   ```

4. **Create MARS mint:**
   ```bash
   spl-token create-token --mint-authority YOUR_AUTHORITY
   ```

### Frontend Integration

1. **Update contract addresses:**
   - Edit `src/components/bridge/MarsBridge.tsx`
   - Update `BRIDGE_CONTRACT_ADDRESS`
   - Update `MARS_MINT_ADDRESS`

2. **Add Solana wallet provider:**
   ```tsx
   // Already configured in the component
   // Just need to ensure wallets are installed
   ```

## 🔍 Testing Checklist

### L1 → Solana Bridge Test
- [ ] Connect MetaMask to Mars Credit Network
- [ ] Enter amount (min: 10 MARS)
- [ ] Enter Solana recipient address  
- [ ] Submit transaction
- [ ] Verify MARS locked on L1
- [ ] Wait for relayer to mint on Solana
- [ ] Check Solana wallet for MARS tokens

### Solana → L1 Bridge Test
- [ ] Connect Phantom wallet
- [ ] Enter amount to bridge back
- [ ] Enter L1 recipient address
- [ ] Submit burn transaction
- [ ] Wait for relayer to unlock on L1
- [ ] Check L1 wallet for MARS tokens

## 🛠️ Troubleshooting

### Common Issues

**Bridge contract deployment fails:**
```bash
# Check gas price and network
truffle console --network marscredit
web3.eth.getGasPrice()
```

**Solana program deployment fails:**
```bash
# Check SOL balance
solana balance
solana airdrop 2  # If on devnet
```

**Relayer fails to start:**
```bash
# Check environment variables
echo $BRIDGE_CONTRACT_ADDRESS
echo $MARS_MINT_ADDRESS
```

**Frontend shows "Not Connected":**
- Install MetaMask and add Mars Credit Network
- Install Phantom wallet for Solana
- Make sure wallets are unlocked

### Debug Commands

```bash
# Check L1 bridge stats
npm run bridge:monitor

# Test Solana connection
solana cluster-version

# Check contract deployment
truffle networks --clean
```

## 📊 Monitoring

### Bridge Statistics
- Visit: `http://localhost:3000/api/bridge/stats`
- Monitor relayer logs for real-time activity
- Check both L1 and Solana explorers

### Key Metrics to Watch
- **L1 Total Locked**: MARS tokens locked on L1
- **Solana Total Minted**: MARS tokens minted on Solana  
- **Bridge Count**: Number of successful bridges
- **Relayer Status**: Ensure relayer is running 24/7

## 🚨 Emergency Procedures

### Pause Bridge Operations
```bash
# L1 Bridge
bridge.pauseBridge()

# Solana Bridge  
program.pauseBridge()
```

### Emergency Withdrawals
```bash
# L1 Bridge (owner only)
bridge.emergencyWithdraw()
```

## 🎉 Success!

When everything is working:
- ✅ L1 bridge contract deployed and funded
- ✅ Solana program deployed and initialized  
- ✅ MARS mint created on Solana
- ✅ Relayer running and monitoring both chains
- ✅ Frontend accessible at localhost:3000/bridge
- ✅ Bridge transactions executing successfully

**Your Mars ↔ Solana bridge is now LIVE! 🚀**

## 📞 Quick Reference

```bash
# Deploy everything
npm run bridge:deploy:all

# Start relayer
npm run bridge:start

# Monitor bridge
npm run bridge:monitor

# Start frontend
npm run dev
```

---

**Time to completion: ~20 minutes**  
**Difficulty: Intermediate**  
**Result: Fully functional cross-chain bridge** 🌉 