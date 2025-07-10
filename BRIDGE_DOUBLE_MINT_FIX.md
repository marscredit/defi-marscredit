# 🚨 Mars Bridge Double-Minting Fix Guide

## Problem Analysis

Your Mars bridge relayer experienced double-minting when it restarted because it was **bypassing the Solana bridge program's duplicate prevention logic**. 

**What was happening:**
- Relayer called SPL token program directly → `createMintToInstruction`
- This bypassed your bridge program's `mint_mars` function 
- No L1 transaction hash tracking on-chain
- Local state file was out of sync with on-chain state

**Root cause:** Bridge IDs 6-15 were minted but not recorded in `relayer-state.json`, causing re-processing on restart.

## ✅ Solution Implemented

I've updated your relayer to:

1. **Call bridge program correctly:** Now uses `bridgeProgram.methods.mintMars()` instead of bypassing it
2. **Pass L1 transaction hash:** Prevents duplicate processing using your bridge program's built-in protection
3. **Handle duplicates gracefully:** Detects "already processed" errors and updates local state
4. **Added proper error handling:** Distinguishes between duplicate errors and real failures

## 🔧 Required Environment Variables

Add these to your `.env` file:

```bash
# Existing variables (you already have these)
RELAYER_PRIVATE_KEY=your_private_key
BRIDGE_CONTRACT_ADDRESS=your_bridge_contract_address
SOLANA_PRIVATE_KEY=[your,solana,private,key,array]
MARS_MINT_ADDRESS=your_mars_mint_address

# NEW REQUIRED VARIABLES
BRIDGE_PROGRAM_ID=your_bridge_program_id
BRIDGE_STATE_ADDRESS=your_bridge_state_address
```

## 🔍 Step 1: Find Your Bridge Program Details

You need to locate your deployed bridge program:

```bash
# Check your Anchor.toml for program ID
cat Anchor.toml | grep mars-bridge

# Or check your deployment logs/files
ls -la target/deploy/
```

## 🔍 Step 2: Find Your Bridge State Address

The bridge state is a PDA (Program Derived Address). You can find it by:

```bash
# Check your bridge program initialization logs
# OR calculate it using your authority key
```

## 🛠️ Step 3: Update Your Relayer

Your relayer code has been updated. Now you need to:

1. **Add the missing environment variables**
2. **Restart your relayer**
3. **Monitor for duplicate prevention**

## 🔍 Step 4: Verify Current Bridge State

Before restarting, check what Bridge IDs are actually processed on-chain:

```bash
# Check your bridge state account
solana account <BRIDGE_STATE_ADDRESS> --output json

# Or write a quick script to query processed transactions
```

## 📊 Step 5: Audit the Double-Minting

You mentioned Bridge IDs 6-15 were double-minted. You need to:

1. **Check Solana transactions** for these Bridge IDs
2. **Verify total minted amount** matches locked amount on L1
3. **Update your local state file** to reflect reality

### Update State File

Edit `scripts/relayer-state.json` to include ALL processed Bridge IDs:

```json
{
  "processedBridgeIds": [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", 
    "11", "12", "13", "14", "15", "16", "17"
  ],
  "lastProcessedBlock": 0
}
```

## 🚀 Step 6: Restart Relayer

Once you have the environment variables set:

```bash
cd scripts
node simple-relayer.js
```

## 🔒 Step 7: Test Duplicate Prevention

The updated relayer will now:
- ✅ Call your bridge program's `mint_mars` function
- ✅ Pass the L1 transaction hash as `l1_tx_id`
- ✅ Bridge program checks `processed_l1_txs` array
- ✅ Reject duplicates with "TransactionAlreadyProcessed" error
- ✅ Update local state when duplicates are detected

## 🎯 Next Steps

1. **Set the missing environment variables**
2. **Verify bridge program deployment**
3. **Update the state file with all processed Bridge IDs**
4. **Restart the relayer**
5. **Monitor for proper duplicate prevention**

## 🔍 Monitoring

Watch for these logs:
- `🔗 Calling bridge program mint_mars instruction...` (good)
- `⚠️ Bridge ID X was already processed on-chain, this is expected behavior` (duplicate detected)
- `❌ Failed to mint tokens for Bridge ID X: TransactionAlreadyProcessed` (duplicate prevented)

## 📋 Emergency Recovery

If you need to pause the bridge:
1. Set `BRIDGE_PROGRAM_ID=disabled` in `.env`
2. The relayer will fail to start (preventing further minting)
3. Investigate and fix the issue
4. Re-enable with correct program ID

---

**Key Point:** The double-minting happened because your relayer was not using your bridge program's duplicate prevention. Now it will properly check for duplicates on-chain. 