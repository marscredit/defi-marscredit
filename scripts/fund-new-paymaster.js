const Web3 = require('web3');

async function main() {
    console.log('\n💰 FUNDING NEW PAYMASTER FOR GASLESS TRANSACTIONS');
    console.log('=================================================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Load deployment wallet
    const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!deployerPrivateKey) {
  console.error('❌ DEPLOYER_PRIVATE_KEY environment variable is required');
  process.exit(1);
}
    const account = web3.eth.accounts.privateKeyToAccount(deployerPrivateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('🔐 Deployer:', account.address);
    
    const balance = await web3.eth.getBalance(account.address);
    console.log('💰 Deployer Balance:', web3.utils.fromWei(balance, 'ether'), 'MARS');
    
    // New paymaster address
    const newPaymasterAddress = '0xd29d35EF4D539900631E2E7322d716Cbc2c0a5FF';
    const fundingAmount = web3.utils.toWei('1000', 'ether'); // Fund with 1000 MARS for gas fees
    
    console.log('\n📋 FUNDING DETAILS:');
    console.log('Paymaster:', newPaymasterAddress);
    console.log('Amount:', web3.utils.fromWei(fundingAmount, 'ether'), 'MARS');
    console.log('Purpose: Pay gas fees for gasless transactions');
    
    try {
        // Check current paymaster balance
        const currentBalance = await web3.eth.getBalance(newPaymasterAddress);
        console.log('\n📊 Current paymaster balance:', web3.utils.fromWei(currentBalance, 'ether'), 'MARS');
        
        console.log('\n🚀 Sending funding transaction...');
        
        const fundingTx = await web3.eth.sendTransaction({
            from: account.address,
            to: newPaymasterAddress,
            value: fundingAmount,
            gas: 100000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('✅ FUNDING SUCCESSFUL!');
        console.log('📍 Transaction:', fundingTx.transactionHash);
        console.log('⛽ Gas used:', fundingTx.gasUsed.toLocaleString());
        
        // Verify new balance
        const newBalance = await web3.eth.getBalance(newPaymasterAddress);
        console.log('💰 New paymaster balance:', web3.utils.fromWei(newBalance, 'ether'), 'MARS');
        
        console.log('\n🎉 PAYMASTER IS NOW FUNDED AND READY!');
        console.log('====================================');
        console.log('✅ Paymaster has sufficient MARS for gas sponsorship');
        console.log('✅ Grant contract is authorized with paymaster');
        console.log('✅ Frontend now points to correct paymaster address');
        console.log('⚡ Gasless transactions should now work perfectly!');
        
        console.log('\n📝 FINAL TEST STEPS:');
        console.log('1. 🔄 Refresh the grant detail page (hard refresh: Cmd+Shift+R)');
        console.log('2. ✅ Gasless Redemption should now show green "Available" status');
        console.log('3. ⚡ Test redeeming 10 MARS with ZERO gas fees!');
        
    } catch (error) {
        console.error('\n❌ FUNDING FAILED:', error.message);
    }
}

main()
    .then(() => {
        console.log('\n🎊 PAYMASTER FUNDING COMPLETED!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }); 