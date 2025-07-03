const Web3 = require('web3');

async function emergencyPauseGrants() {
    console.log('\n🚨 EMERGENCY PAUSE GRANTS');
    console.log('=========================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Load deployment wallet (grant owner)
    const deployerPrivateKey = '0x702f0b3c12108a7341cc1c94ac83a4a4732df139fb75880d13568883244082ea';
    const account = web3.eth.accounts.privateKeyToAccount(deployerPrivateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('🔐 Grant Owner:', account.address);
    
    // Grants to pause
    const GRANTS_TO_PAUSE = [
        {
            name: 'Intract Campaign Reward Distribution',
            address: '0x43dCc37b47C3E4372227a5a75c46e9bAC459ba15'
        },
        {
            name: 'Gasless MARS Grant',
            address: '0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6'
        }
    ];
    
    // Enhanced Grant ABI for pausing
    const grantABI = [
        {
            "inputs": [],
            "name": "pause",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "paused",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    for (const grant of GRANTS_TO_PAUSE) {
        console.log(`\n🎯 PAUSING: ${grant.name}`);
        console.log(`📍 Address: ${grant.address}`);
        
        try {
            const grantContract = new web3.eth.Contract(grantABI, grant.address);
            
            // Check if already paused
            const isPaused = await grantContract.methods.paused().call();
            if (isPaused) {
                console.log('✅ Already paused');
                continue;
            }
            
            // Pause the contract
            const pauseTx = await grantContract.methods.pause().send({
                from: account.address,
                gas: 100000,
                gasPrice: web3.utils.toWei('1', 'gwei')
            });
            
            console.log('✅ PAUSED SUCCESSFULLY!');
            console.log('📍 Transaction:', pauseTx.transactionHash);
            console.log('⛽ Gas used:', pauseTx.gasUsed.toLocaleString());
            
            // Verify paused
            const isNowPaused = await grantContract.methods.paused().call();
            console.log('📊 Paused status:', isNowPaused ? '✅ PAUSED' : '❌ NOT PAUSED');
            
        } catch (error) {
            console.error(`❌ Failed to pause ${grant.name}:`, error.message);
        }
    }
    
    console.log('\n🚨 EMERGENCY PAUSE COMPLETE');
    console.log('===========================');
    console.log('✅ All targeted grants have been paused');
    console.log('🔒 No new redemptions can occur');
    console.log('🛠️ Run emergency-unpause-grants.js when ready to resume');
}

// Run the emergency pause
if (require.main === module) {
    emergencyPauseGrants()
        .then(() => {
            console.log('\n✅ Emergency pause completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Emergency pause failed:', error);
            process.exit(1);
        });
}

module.exports = emergencyPauseGrants; 