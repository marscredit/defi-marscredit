const { ethers } = require('ethers');

async function testBridgeFromDeployment() {
  console.log('🧪 Testing Bridge from Deployment Wallet...');
  
  // Setup provider and deployment wallet
  const provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
  const deploymentWallet = new ethers.Wallet('0x702f0b3c12108a7341cc1c94ac83a4a4732df139fb75880d13568883244082ea', provider);
  
  const contractAddress = '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba';
  const solanaTestAddress = 'Ct51j1hoP52sjJNmL2dGwqLAS2pcSe8nJPeWd6JkS73b';
  
  // Bridge contract
  const bridgeABI = [
    'function lockTokens(uint256 amount, string calldata solanaRecipient) external payable',
    'function totalLockedTokens() external view returns (uint256)',
    'function bridgeIdCounter() external view returns (uint256)',
    'function minBridgeAmount() external view returns (uint256)',
    'function maxBridgeAmount() external view returns (uint256)',
    'function bridgeFeePercentage() external view returns (uint256)',
    'function paused() external view returns (bool)',
    'function owner() external view returns (address)',
    'function authorizedRelayers(address) external view returns (bool)',
    'function addRelayer(address relayer) external',
    'function getBridgeStats() external view returns (uint256 totalLocked, uint256 contractBalance, uint256 bridgeCount, uint256 minAmount, uint256 maxAmount, uint256 feePercentage)',
    'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)'
  ];
  
  const bridgeContract = new ethers.Contract(contractAddress, bridgeABI, deploymentWallet);
  
  try {
    // Check wallet balance
    const balance = await provider.getBalance(deploymentWallet.address);
    console.log('💰 Deployment Wallet Balance:', ethers.formatEther(balance), 'MARS');
    
    // First authorize the relayer (as owner)
    const relayerAddress = '0x2c7536E3605D9C16a7a3D7b1898e529396a65c23';
    console.log('🔐 Authorizing relayer:', relayerAddress);
    
    try {
      const authTx = await bridgeContract.addRelayer(relayerAddress);
      console.log('📝 Authorization tx:', authTx.hash);
      await authTx.wait();
      console.log('✅ Relayer authorized successfully');
    } catch (authError) {
      console.log('⚠️ Authorization failed (might already be authorized):', authError.message);
    }
    
    // Test bridge transaction
    const testAmount = ethers.parseEther('20.0'); // 20 MARS (above minimum)
    console.log('\n🌉 Testing bridge transaction...');
    console.log('From:', deploymentWallet.address);
    console.log('Amount:', ethers.formatEther(testAmount), 'MARS');
    console.log('To Solana:', solanaTestAddress);
    
    // Get gas estimate
    const gasEstimate = await bridgeContract.lockTokens.estimateGas(testAmount, solanaTestAddress, { value: testAmount });
    console.log('⛽ Gas estimate:', gasEstimate.toString());
    
    // Send bridge transaction
    const bridgeTx = await bridgeContract.lockTokens(testAmount, solanaTestAddress, {
      value: testAmount,
      gasLimit: gasEstimate * 2n
    });
    
    console.log('📝 Bridge transaction sent:', bridgeTx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await bridgeTx.wait();
    console.log('✅ Bridge transaction confirmed!');
    console.log('📍 Block number:', receipt.blockNumber);
    console.log('💸 Gas used:', receipt.gasUsed.toString());
    
    // Parse events
    const events = receipt.logs.map(log => {
      try {
        return bridgeContract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(e => e !== null);
    
    console.log('\n📡 Events:');
    events.forEach(event => {
      if (event.name === 'TokensLocked') {
        console.log('  🌉 TokensLocked Event:');
        console.log('    User:', event.args.user);
        console.log('    Solana Recipient:', event.args.solanaRecipient);
        console.log('    Amount:', ethers.formatEther(event.args.amount), 'MARS');
        console.log('    Bridge ID:', event.args.bridgeId.toString());
      }
    });
    
    // Check new contract state
    console.log('\n📊 Updated Contract State:');
    try {
      const totalLocked = await bridgeContract.totalLockedTokens();
      console.log('  Total Locked:', ethers.formatEther(totalLocked), 'MARS');
    } catch (e) {
      console.log('  Total Locked: ERROR -', e.message);
    }
    
    try {
      const bridgeCounter = await bridgeContract.bridgeIdCounter();
      console.log('  Bridge Counter:', bridgeCounter.toString());
      console.log('  Bridge Count:', (bridgeCounter - 1n).toString());
    } catch (e) {
      console.log('  Bridge Count: ERROR -', e.message);
    }
    
    // Try the getBridgeStats function
    try {
      const stats = await bridgeContract.getBridgeStats();
      console.log('  Bridge Stats:');
      console.log('    Total Locked:', ethers.formatEther(stats.totalLocked), 'MARS');
      console.log('    Contract Balance:', ethers.formatEther(stats.contractBalance), 'MARS');
      console.log('    Bridge Count:', stats.bridgeCount.toString());
      console.log('    Min Amount:', ethers.formatEther(stats.minAmount), 'MARS');
      console.log('    Max Amount:', ethers.formatEther(stats.maxAmount), 'MARS');
      console.log('    Fee Percentage:', stats.feePercentage.toString(), 'basis points');
    } catch (e) {
      console.log('  Bridge Stats: ERROR -', e.message);
    }
    
    console.log('\n🎉 Bridge test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('💡 Reason:', error.reason);
    }
    if (error.code) {
      console.error('💡 Code:', error.code);
    }
  }
}

testBridgeFromDeployment().catch(console.error); 