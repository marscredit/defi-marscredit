#!/usr/bin/env node

require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const { ethers } = require('ethers');

console.log('🔍 Mars Bridge Audit & State Calculator');
console.log('======================================');

const BRIDGE_PROGRAM_ID_STR = 'MarsB1dg3K8GzRTaY3PdJwEYy2HjnxCEwUXXUyZvvQUz';
const MARS_MINT_STR = '5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs';

console.log('👛 Authority Wallet: [Loading...]');
console.log('🏛️ Bridge Program ID:', BRIDGE_PROGRAM_ID_STR);
console.log('🪙 Mars Mint:', MARS_MINT_STR);

async function getBridgeStateAddress() {
  try {
    // Create objects inside the function
    const { Keypair } = require('@solana/web3.js');
    const solanaPrivateKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
    const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(solanaPrivateKey));
    
    console.log('\n👛 Authority Wallet:', authorityKeypair.publicKey.toString());
    
    const BRIDGE_PROGRAM_ID = new PublicKey(BRIDGE_PROGRAM_ID_STR);
    
    // Calculate bridge state PDA using the correct method
    const seeds = [
      Buffer.from('bridge_state'),
      authorityKeypair.publicKey.toBuffer()
    ];
    
    const [bridgeStatePDA, bump] = PublicKey.findProgramAddressSync(
      seeds,
      BRIDGE_PROGRAM_ID
    );
    
    console.log('🎯 Bridge State PDA:', bridgeStatePDA.toString());
    console.log('📍 Bump:', bump);
    
    return bridgeStatePDA.toString();
  } catch (error) {
    console.error('❌ Error calculating bridge state:', error.message);
    return null;
  }
}

async function getL1LockedAmount() {
  console.log('\n💰 Getting L1 Locked Amount...');
  
  try {
    const l1Provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
    const l1Wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, l1Provider);
    
    const bridgeABI = [
      'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI, l1Wallet);
    
    // Get all TokensLocked events
    const filter = bridgeContract.filters.TokensLocked();
    const events = await bridgeContract.queryFilter(filter, 0);
    
    let totalLocked = 0;
    let doubleMintedAmount = 0;
    
    console.log(`📊 Found ${events.length} bridge transactions`);
    
    for (const event of events) {
      const bridgeId = parseInt(event.args.bridgeId.toString());
      const amount = parseFloat(ethers.formatEther(event.args.amount));
      
      totalLocked += amount;
      
      // Bridge IDs 6-15 were double-minted
      if (bridgeId >= 6 && bridgeId <= 15) {
        doubleMintedAmount += amount;
        console.log(`   🔄 Double-minted Bridge ID ${bridgeId}: ${amount} MARS`);
      }
    }
    
    console.log(`\n📈 L1 Total Locked: ${totalLocked.toFixed(2)} MARS`);
    console.log(`🔄 Double-minted Amount: ${doubleMintedAmount.toFixed(2)} MARS`);
    
    return { totalLocked, doubleMintedAmount };
  } catch (error) {
    console.error('❌ Error getting L1 data:', error.message);
    return null;
  }
}

async function getSolanaMintedAmount() {
  console.log('\n🪙 Getting Solana Minted Amount...');
  
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const MARS_MINT = new PublicKey(MARS_MINT_STR);
    
    // Get mint info
    const mintInfo = await connection.getTokenSupply(MARS_MINT);
    const totalSupply = mintInfo.value.uiAmount;
    
    console.log(`📊 Total MARS Supply on Solana: ${totalSupply} MARS`);
    
    return totalSupply;
  } catch (error) {
    console.error('❌ Error getting Solana mint data:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting bridge audit...\n');
  
  // Get bridge state address
  const bridgeStateAddress = await getBridgeStateAddress();
  
  if (bridgeStateAddress) {
    console.log('\n✅ Add these to your .env file:');
    console.log('BRIDGE_PROGRAM_ID=' + BRIDGE_PROGRAM_ID_STR);
    console.log('BRIDGE_STATE_ADDRESS=' + bridgeStateAddress);
  }
  
  // Get L1 and Solana amounts
  const l1Data = await getL1LockedAmount();
  const solanaMinted = await getSolanaMintedAmount();
  
  if (l1Data && solanaMinted) {
    console.log('\n📊 BRIDGE AUDIT RESULTS:');
    console.log('========================');
    console.log(`L1 Locked:          ${l1Data.totalLocked.toFixed(2)} MARS`);
    console.log(`Solana Minted:      ${solanaMinted.toFixed(2)} MARS`);
    console.log(`Expected Minted:    ${l1Data.totalLocked.toFixed(2)} MARS`);
    console.log(`Actual Discrepancy: ${(solanaMinted - l1Data.totalLocked).toFixed(2)} MARS`);
    console.log(`Double-mint Amount: ${l1Data.doubleMintedAmount.toFixed(2)} MARS`);
    
    if (solanaMinted > l1Data.totalLocked) {
      console.log(`\n🚨 EXCESS MARS ON SOLANA: ${(solanaMinted - l1Data.totalLocked).toFixed(2)} MARS`);
      console.log(`   You need to BURN this amount to balance the bridge!`);
    }
  }
}

main().catch(console.error); 