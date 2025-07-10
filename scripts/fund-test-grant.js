const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('\n💰 FUNDING ENHANCED TEST GENESIS GRANT');
    console.log('=====================================');
    
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
    console.log('💰 Balance:', web3.utils.fromWei(balance, 'ether'), 'MARS');
    
    // Enhanced Test Genesis Grant contract
    const testGrantAddress = '0xFde59B4b965b6B0A9817F050261244Fe5f99B911';
    const fundingAmount = web3.utils.toWei('100', 'ether'); // Fund with 100 MARS (10 users)
    
    console.log('\n📋 FUNDING DETAILS:');
    console.log('Contract:', testGrantAddress);
    console.log('Amount:', web3.utils.fromWei(fundingAmount, 'ether'), 'MARS');
    console.log('Users supported:', '10 users at 10 MARS each');
    
    try {
        console.log('\n🚀 Sending funding transaction...');
        
        const fundingTx = await web3.eth.sendTransaction({
            from: account.address,
            to: testGrantAddress,
            value: fundingAmount,
            gas: 100000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('✅ FUNDING SUCCESSFUL!');
        console.log('📍 Transaction:', fundingTx.transactionHash);
        console.log('⛽ Gas used:', fundingTx.gasUsed.toLocaleString());
        
        // Verify funding by checking contract balance
        const contractBalance = await web3.eth.getBalance(testGrantAddress);
        console.log('💰 Contract balance:', web3.utils.fromWei(contractBalance, 'ether'), 'MARS');
        
        console.log('\n🎉 TEST GRANT IS NOW READY!');
        console.log('===========================');
        console.log('🧪 Enhanced Test Genesis Grant');
        console.log('📍 Address:', testGrantAddress);
        console.log('💰 Total Pool: 100 MARS');
        console.log('🎁 Per Address: 10 MARS');
        console.log('👥 Max Users: 10');
        console.log('⚡ Gasless: YES');
        console.log('🔒 Whitelist: NO (Public)');
        
        console.log('\n🔗 Test URLs:');
        console.log(`💻 Grant Page: http://localhost:3000/grants/${testGrantAddress}`);
        console.log('📋 All Grants: http://localhost:3000/grants');
        
        console.log('\n📝 TEST INSTRUCTIONS:');
        console.log('1. 🔄 Refresh the grants page');
        console.log('2. ✅ Verify "Enhanced Test Genesis Grant" shows as Active');
        console.log('3. 🎯 Click "View Details" to test gasless redemption');
        console.log('4. ⚡ Try redeeming with ZERO gas fees!');
        
    } catch (error) {
        console.error('\n❌ FUNDING FAILED:', error.message);
        
        // Check if it's a network issue
        if (error.message.includes('CONNECTION ERROR')) {
            console.log('\n🔧 NETWORK TROUBLESHOOTING:');
            console.log('- Check if Mars Credit Network RPC is responding');
            console.log('- Try again in a few moments');
        }
    }
}

main()
    .then(() => {
        console.log('\n🎊 FUNDING SCRIPT COMPLETED!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }); 