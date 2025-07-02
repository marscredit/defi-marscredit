const Web3 = require('web3');

async function main() {
    console.log('\n💎 FUNDING STRATEGIC PARTNERS GRANT');
    console.log('===================================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Load deployment wallet
    const deployerPrivateKey = '0x702f0b3c12108a7341cc1c94ac83a4a4732df139fb75880d13568883244082ea';
    const account = web3.eth.accounts.privateKeyToAccount(deployerPrivateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('🔐 Deployer:', account.address);
    
    const balance = await web3.eth.getBalance(account.address);
    console.log('💰 Balance:', web3.utils.fromWei(balance, 'ether'), 'MARS');
    
    // Strategic Partners Grant contract
    const strategicGrantAddress = '0x66647478F2dEe1a26186851E1905f591C520494c';
    const fundingAmount = web3.utils.toWei('30000', 'ether'); // Fund with 30,000 MARS (3 users at 10k each)
    
    console.log('\n📋 FUNDING DETAILS:');
    console.log('Contract:', strategicGrantAddress);
    console.log('Amount:', web3.utils.fromWei(fundingAmount, 'ether'), 'MARS');
    console.log('Users supported:', '3 strategic partners at 10,000 MARS each');
    
    try {
        console.log('\n🚀 Sending funding transaction...');
        
        const fundingTx = await web3.eth.sendTransaction({
            from: account.address,
            to: strategicGrantAddress,
            value: fundingAmount,
            gas: 100000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('✅ FUNDING SUCCESSFUL!');
        console.log('📍 Transaction:', fundingTx.transactionHash);
        console.log('⛽ Gas used:', fundingTx.gasUsed.toLocaleString());
        
        // Verify funding by checking contract balance
        const contractBalance = await web3.eth.getBalance(strategicGrantAddress);
        console.log('💰 Contract balance:', web3.utils.fromWei(contractBalance, 'ether'), 'MARS');
        
        console.log('\n🚀 STRATEGIC GRANT IS NOW READY!');
        console.log('===============================');
        console.log('💎 Strategic Partners Grant');
        console.log('📍 Address:', strategicGrantAddress);
        console.log('💰 Total Pool: 30,000 MARS');
        console.log('🎁 Per Address: 10,000 MARS');
        console.log('👥 Max Users: 3');
        console.log('⚡ Gasless: YES');
        console.log('🔒 Whitelist: YES (Exclusive)');
        
    } catch (error) {
        console.error('\n❌ FUNDING FAILED:', error.message);
    }
}

main()
    .then(() => {
        console.log('\n🎊 STRATEGIC FUNDING COMPLETED!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }); 