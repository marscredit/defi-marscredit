const { Connection, PublicKey } = require('@solana/web3.js');
const { ethers } = require('ethers');

async function testSolanaMonitoring() {
  console.log('🔍 Testing V3 Relayer Solana→L1 Duplicate Prevention...');
  console.log('');
  
  // Same config as V3 relayer
  const solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
  const marsMintAddress = '5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs';
  const bridgeContractAddress = '0x483c7120e93651a0f2b0085Fa50FBB6217aA87ec';
  const l1RpcUrl = 'https://rpc.marscredit.xyz';
  
  const solanaConnection = new Connection(solanaRpcUrl);
  const l1Provider = new ethers.JsonRpcProvider(l1RpcUrl);
  
  const bridgeABI = [
    'function isSolanaTxProcessed(bytes32 solanaTxId) external view returns (bool)'
  ];
  const bridgeContract = new ethers.Contract(bridgeContractAddress, bridgeABI, l1Provider);
  
  try {
    console.log('📡 Fetching recent Solana transactions...');
    
    // Get recent transactions for the MARS mint account (same as V3 relayer)
    const mintPubkey = new PublicKey(marsMintAddress);
    const signatures = await solanaConnection.getSignaturesForAddress(mintPubkey, {
      limit: 10
    });
    
    console.log(`Found ${signatures.length} recent transactions on MARS mint`);
    console.log('');
    
    // Parse transactions to find burn events (same logic as V3 relayer)
    let burnTransactionsFound = 0;
    let alreadyProcessedCount = 0;
    
    for (const sigInfo of signatures) {
      try {
        const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { 
          maxSupportedTransactionVersion: 0 
        });
        
        if (!tx) continue;
        
        // Look for burn instructions
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if (ix.parsed && ix.parsed.type === 'burn') {
            const burnInfo = ix.parsed.info;
            const burnAmount = parseFloat(burnInfo.amount) / 1e9; // Convert from smallest unit
            
            burnTransactionsFound++;
            
            console.log('🔥 FOUND BURN TRANSACTION:');
            console.log(`   Signature: ${sigInfo.signature}`);
            console.log(`   Amount: ${burnAmount} MARS`);
            console.log(`   Authority: ${burnInfo.authority}`);
            
            // Check if already processed (same logic as V3 relayer)
            const solanaTxIdBytes = ethers.id(sigInfo.signature);
            const isProcessed = await bridgeContract.isSolanaTxProcessed(solanaTxIdBytes);
            
            console.log(`   Already Processed on L1: ${isProcessed ? 'YES' : 'NO'}`);
            
            if (isProcessed) {
              alreadyProcessedCount++;
              console.log('   ✅ V3 Relayer will SKIP this transaction (correct behavior)');
            } else {
              console.log('   🎯 V3 Relayer will PROCESS this transaction');
            }
            console.log('');
            
            // Special check for the 500 MARS transaction we discussed
            if (sigInfo.signature === '4nsSifteys88f9CYSe1EDyB8urhaKndS7zc6imm3oRQC3wXF2Ux1ex6zybzUSMJYqCSN7UUe4yzn5YWqMMSpFTtB') {
              console.log('🎯 THIS IS THE 500 MARS TRANSACTION WE DISCUSSED!');
              console.log(`   Status: ${isProcessed ? 'Already processed' : 'Pending processing'}`);
              console.log('');
            }
          }
        }
      } catch (error) {
        // Skip transactions that can't be parsed
      }
    }
    
    console.log('📊 SUMMARY:');
    console.log(`   Total burn transactions found: ${burnTransactionsFound}`);
    console.log(`   Already processed on L1: ${alreadyProcessedCount}`);
    console.log(`   Pending processing: ${burnTransactionsFound - alreadyProcessedCount}`);
    console.log('');
    
    if (alreadyProcessedCount === burnTransactionsFound && burnTransactionsFound > 0) {
      console.log('✅ PERFECT: All burn transactions already processed');
      console.log('✅ V3 Relayer will correctly skip ALL of them');
      console.log('✅ No duplicate processing will occur');
    } else if (burnTransactionsFound - alreadyProcessedCount > 0) {
      console.log(`🎯 V3 Relayer will process ${burnTransactionsFound - alreadyProcessedCount} pending transactions`);
    } else {
      console.log('ℹ️  No burn transactions found in recent activity');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSolanaMonitoring(); 