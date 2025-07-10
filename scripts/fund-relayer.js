const { ethers } = require('ethers');

async function fundRelayer() {
  console.log('💰 Funding Relayer Wallet...');
  
  // Setup provider and deployment wallet (owner)
  const provider = new ethers.JsonRpcProvider('https://rpc.marscredit.xyz');
  const deploymentWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY || (() => { console.error('❌ DEPLOYER_PRIVATE_KEY required'); process.exit(1); })(), provider);
  
  const relayerAddress = '0x2c7536E3605D9C16a7a3D7b1898e529396a65c23';
  const solanaTestAddress = 'Ct51j1hoP52sjJNmL2dGwqLAS2pcSe8nJPeWd6JkS73b';
  
  try {
    // Check deployment wallet balance
    const deploymentBalance = await provider.getBalance(deploymentWallet.address);
    console.log('🏦 Deployment Wallet Balance:', ethers.formatEther(deploymentBalance), 'MARS');
    
    if (deploymentBalance < ethers.parseEther('1.0')) {
      console.log('❌ Deployment wallet has insufficient balance to fund relayer');
      return;
    }
    
    // Check current relayer balance
    const relayerBalance = await provider.getBalance(relayerAddress);
    console.log('🔧 Current Relayer Balance:', ethers.formatEther(relayerBalance), 'MARS');
    
    // Send 50 MARS to relayer
    const fundAmount = ethers.parseEther('50.0');
    console.log('💸 Sending', ethers.formatEther(fundAmount), 'MARS to relayer...');
    
    const tx = await deploymentWallet.sendTransaction({
      to: relayerAddress,
      value: fundAmount,
      gasLimit: 21000 // Standard transfer gas limit
    });
    
    console.log('📝 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    
    // Check new balance
    const newBalance = await provider.getBalance(relayerAddress);
    console.log('🎉 New Relayer Balance:', ethers.formatEther(newBalance), 'MARS');
    
    // Now test a small bridge transaction
    const bridgeContract = new ethers.Contract(
      '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba',
      ['function bridgeToSolana(string memory solanaAddress) external payable'],
      new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY || (() => { console.error('❌ DEPLOYER_PRIVATE_KEY required'); process.exit(1); })(), provider)
    );
    
    const testAmount = ethers.parseEther('15.0'); // Above minimum of 10 MARS
    console.log('\\n🌉 Testing bridge transaction...');
    console.log('Amount:', ethers.formatEther(testAmount), 'MARS');
    console.log('To:', solanaTestAddress);
    
    const bridgeTx = await bridgeContract.bridgeToSolana(solanaTestAddress, {
      value: testAmount,
      gasLimit: 200000
    });
    
    console.log('📝 Bridge transaction sent:', bridgeTx.hash);
    const bridgeReceipt = await bridgeTx.wait();
    console.log('✅ Bridge transaction confirmed!');
    console.log('🎊 Successfully bridged', ethers.formatEther(testAmount), 'MARS to Solana');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('💡 Reason:', error.reason);
    }
  }
}

fundRelayer().catch(console.error); 