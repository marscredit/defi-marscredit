const { ethers } = require('ethers');

async function diagnoseBridge() {
  console.log('🔍 Diagnosing Bridge Contract...');
  
  // Setup provider
  const provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
  const wallet = new ethers.Wallet('0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318', provider);
  
  const contractAddress = '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba';
  
  try {
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    console.log('📋 Contract code length:', code.length);
    
    if (code === '0x' || code.length <= 2) {
      console.log('❌ Contract not deployed at address:', contractAddress);
      return;
    }
    
    console.log('✅ Contract exists at address:', contractAddress);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Relayer Balance:', ethers.formatEther(balance), 'MARS');
    
    // Try to call read-only functions one by one
    const bridgeABI = [
      'function totalLocked() external view returns (uint256)',
      'function bridgeCount() external view returns (uint256)',
      'function minBridgeAmount() external view returns (uint256)',
      'function maxBridgeAmount() external view returns (uint256)',
      'function bridgeFeePercentage() external view returns (uint256)',
      'function paused() external view returns (bool)',
      'function relayers(address) external view returns (bool)',
      'function owner() external view returns (address)'
    ];
    
    const contract = new ethers.Contract(contractAddress, bridgeABI, provider);
    
    console.log('\n📊 Contract State:');
    
    try {
      const totalLocked = await contract.totalLocked();
      console.log('  Total Locked:', ethers.formatEther(totalLocked), 'MARS');
    } catch (e) {
      console.log('  Total Locked: ERROR -', e.message);
    }
    
    try {
      const bridgeCount = await contract.bridgeCount();
      console.log('  Bridge Count:', bridgeCount.toString());
    } catch (e) {
      console.log('  Bridge Count: ERROR -', e.message);
    }
    
    try {
      const minAmount = await contract.minBridgeAmount();
      console.log('  Min Amount:', ethers.formatEther(minAmount), 'MARS');
    } catch (e) {
      console.log('  Min Amount: ERROR -', e.message);
    }
    
    try {
      const maxAmount = await contract.maxBridgeAmount();
      console.log('  Max Amount:', ethers.formatEther(maxAmount), 'MARS');
    } catch (e) {
      console.log('  Max Amount: ERROR -', e.message);
    }
    
    try {
      const feePercentage = await contract.bridgeFeePercentage();
      console.log('  Fee Percentage:', feePercentage.toString(), '%');
    } catch (e) {
      console.log('  Fee Percentage: ERROR -', e.message);
    }
    
    try {
      const isPaused = await contract.paused();
      console.log('  Paused:', isPaused);
    } catch (e) {
      console.log('  Paused: ERROR -', e.message);
    }
    
    try {
      const owner = await contract.owner();
      console.log('  Owner:', owner);
    } catch (e) {
      console.log('  Owner: ERROR -', e.message);
    }
    
    try {
      const isRelayerAuthorized = await contract.relayers(wallet.address);
      console.log('  Relayer Authorized:', isRelayerAuthorized);
    } catch (e) {
      console.log('  Relayer Authorized: ERROR -', e.message);
    }
    
    // Check network info
    console.log('\n🌐 Network Info:');
    const network = await provider.getNetwork();
    console.log('  Chain ID:', network.chainId.toString());
    console.log('  Network Name:', network.name);
    
    const blockNumber = await provider.getBlockNumber();
    console.log('  Latest Block:', blockNumber);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

diagnoseBridge().catch(console.error); 