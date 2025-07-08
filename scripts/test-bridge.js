const { ethers } = require('ethers');

async function testBridge() {
  console.log('🔧 Testing Bridge Contract...');
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
  const wallet = new ethers.Wallet('0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318', provider);
  
  // Bridge contract
  const bridgeABI = [
    'function bridgeToSolana(string memory solanaAddress) external payable',
    'function totalLocked() external view returns (uint256)',
    'function bridgeCount() external view returns (uint256)',
    'function minBridgeAmount() external view returns (uint256)',
    'function maxBridgeAmount() external view returns (uint256)',
    'function bridgeFeePercentage() external view returns (uint256)',
    'function paused() external view returns (bool)',
    'function relayers(address) external view returns (bool)'
  ];
  
  const bridgeContract = new ethers.Contract('0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba', bridgeABI, wallet);
  
  try {
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Wallet Balance:', ethers.formatEther(balance), 'MARS');
    
    // Check bridge state
    const totalLocked = await bridgeContract.totalLocked();
    const bridgeCount = await bridgeContract.bridgeCount();
    const minAmount = await bridgeContract.minBridgeAmount();
    const maxAmount = await bridgeContract.maxBridgeAmount();
    const feePercentage = await bridgeContract.bridgeFeePercentage();
    const isPaused = await bridgeContract.paused();
    
    console.log('📊 Bridge Stats:');
    console.log('  Total Locked:', ethers.formatEther(totalLocked), 'MARS');
    console.log('  Bridge Count:', bridgeCount.toString());
    console.log('  Min Amount:', ethers.formatEther(minAmount), 'MARS');
    console.log('  Max Amount:', ethers.formatEther(maxAmount), 'MARS');
    console.log('  Fee:', feePercentage.toString() + '%');
    console.log('  Paused:', isPaused);
    
    // Check if relayer is authorized
    const isRelayerAuthorized = await bridgeContract.relayers(wallet.address);
    console.log('🔑 Relayer Authorized:', isRelayerAuthorized);
    
    // Test amount validation
    const testAmount = ethers.parseEther('0.1'); // 0.1 MARS
    console.log('\n✅ Validation Checks:');
    console.log('  Test Amount:', ethers.formatEther(testAmount), 'MARS');
    console.log('  >= Min Amount:', testAmount >= minAmount);
    console.log('  <= Max Amount:', testAmount <= maxAmount);
    console.log('  Wallet has balance:', balance >= testAmount);
    console.log('  Bridge not paused:', !isPaused);
    
    if (isPaused) {
      console.log('❌ Bridge is paused, cannot proceed');
      return;
    }
    
    if (testAmount < minAmount) {
      console.log('❌ Amount too small, minimum is:', ethers.formatEther(minAmount));
      return;
    }
    
    if (testAmount > maxAmount) {
      console.log('❌ Amount too large, maximum is:', ethers.formatEther(maxAmount));
      return;
    }
    
    if (balance < testAmount) {
      console.log('❌ Insufficient balance');
      return;
    }
    
    // Test small bridge transaction
    const solanaAddress = 'Ct51j1hoP52sjJNmL2dGwqLAS2pcSe8nJPeWd6JkS73b';
    
    console.log('\n🚀 Testing bridge transaction...');
    console.log('Amount:', ethers.formatEther(testAmount), 'MARS');
    console.log('To Solana:', solanaAddress);
    
    // Estimate gas first
    try {
      const gasEstimate = await bridgeContract.bridgeToSolana.estimateGas(solanaAddress, { value: testAmount });
      console.log('⛽ Gas Estimate:', gasEstimate.toString());
      
      // Send transaction
      const tx = await bridgeContract.bridgeToSolana(solanaAddress, { 
        value: testAmount,
        gasLimit: gasEstimate * 2n // Double the gas limit for safety
      });
      
      console.log('📝 Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
      console.log('💸 Gas used:', receipt.gasUsed.toString());
      
    } catch (gasError) {
      console.error('❌ Gas estimation failed:', gasError.message);
      
      // Try to get more specific error details
      if (gasError.reason) {
        console.error('💡 Reason:', gasError.reason);
      }
      
      if (gasError.code) {
        console.error('💡 Code:', gasError.code);
      }
      
      // Check for common revert reasons
      if (gasError.message.includes('execution reverted')) {
        console.log('\n🔍 Possible causes:');
        console.log('  - Bridge contract paused');
        console.log('  - Amount outside min/max range');
        console.log('  - Invalid Solana address format');
        console.log('  - Contract balance issues');
        console.log('  - Relayer authorization issues');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('💡 Reason:', error.reason);
    }
  }
}

testBridge().catch(console.error); 