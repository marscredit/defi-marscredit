const Web3 = require('web3');

async function checkIntractGaslessStatus() {
    console.log('\n🔍 CHECKING INTRACT GRANT GASLESS STATUS');
    console.log('========================================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Contract addresses
    const intractGrantAddress = '0x43dCc37b47C3E4372227a5a75c46e9bAC459ba15';
    const paymasterAddress = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';
    
    console.log('🎯 Intract Grant:', intractGrantAddress);
    console.log('💰 Paymaster:', paymasterAddress);
    console.log('');
    
    // Enhanced Gasless Grant ABI - functions we need to check
    const grantABI = [
        {
            "inputs": [{"internalType": "address", "name": "", "type": "address"}],
            "name": "authorizedPaymasters",
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
        },
        {
            "inputs": [],
            "name": "totalTokensAvailable",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "redemptionAmountPerUser",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "isWhitelistMode",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];
    
    // Paymaster ABI - functions we need to check
    const paymasterABI = [
        {
            "inputs": [{"internalType": "address", "name": "", "type": "address"}],
            "name": "authorizedContracts",
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
        },
        {
            "inputs": [],
            "name": "getBalance",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    try {
        // Create contract instances
        const grantContract = new web3.eth.Contract(grantABI, intractGrantAddress);
        const paymasterContract = new web3.eth.Contract(paymasterABI, paymasterAddress);
        
        console.log('🔍 CHECKING GRANT CONTRACT STATUS:');
        console.log('==================================');
        
        // Check grant contract details
        const [
            grantOwner,
            totalTokens,
            redemptionAmount,
            isWhitelistMode,
            isPaymasterAuthorized
        ] = await Promise.all([
            grantContract.methods.owner().call(),
            grantContract.methods.totalTokensAvailable().call(),
            grantContract.methods.redemptionAmountPerUser().call(),
            grantContract.methods.isWhitelistMode().call(),
            grantContract.methods.authorizedPaymasters(paymasterAddress).call()
        ]);
        
        console.log('👤 Grant Owner:', grantOwner);
        console.log('💰 Total Tokens:', web3.utils.fromWei(totalTokens, 'ether'), 'MARS');
        console.log('🎁 Redemption Amount:', web3.utils.fromWei(redemptionAmount, 'ether'), 'MARS per user');
        console.log('🔒 Whitelist Mode:', isWhitelistMode ? 'ENABLED' : 'DISABLED');
        console.log('⚡ Paymaster Authorized in Grant:', isPaymasterAuthorized ? '✅ YES' : '❌ NO');
        
        console.log('\n🔍 CHECKING PAYMASTER CONTRACT STATUS:');
        console.log('=====================================');
        
        // Check paymaster contract details
        const [
            paymasterOwner,
            paymasterBalance,
            isGrantAuthorized
        ] = await Promise.all([
            paymasterContract.methods.owner().call(),
            paymasterContract.methods.getBalance().call(),
            paymasterContract.methods.authorizedContracts(intractGrantAddress).call()
        ]);
        
        console.log('👤 Paymaster Owner:', paymasterOwner);
        console.log('💰 Paymaster Balance:', web3.utils.fromWei(paymasterBalance, 'ether'), 'MARS');
        console.log('⚡ Grant Authorized in Paymaster:', isGrantAuthorized ? '✅ YES' : '❌ NO');
        
        console.log('\n📊 GASLESS STATUS SUMMARY:');
        console.log('==========================');
        
        const gaslessReady = isPaymasterAuthorized && isGrantAuthorized;
        
        console.log('1. Grant → Paymaster:', isPaymasterAuthorized ? '✅ AUTHORIZED' : '❌ NOT AUTHORIZED');
        console.log('2. Paymaster → Grant:', isGrantAuthorized ? '✅ AUTHORIZED' : '❌ NOT AUTHORIZED');
        console.log('3. Paymaster Balance:', parseFloat(web3.utils.fromWei(paymasterBalance, 'ether')) > 0 ? '✅ FUNDED' : '❌ EMPTY');
        
        if (gaslessReady) {
            console.log('\n🎉 GASLESS TRANSACTIONS: ✅ FULLY ENABLED');
            console.log('Users can redeem 500 MARS with ZERO gas fees!');
        } else {
            console.log('\n🚨 GASLESS TRANSACTIONS: ❌ NOT ENABLED');
            console.log('\n🔧 REQUIRED FIXES:');
            
            if (!isPaymasterAuthorized) {
                console.log('❌ Grant contract needs to authorize paymaster');
                console.log('   Run: grant.authorizePaymaster("' + paymasterAddress + '")');
            }
            
            if (!isGrantAuthorized) {
                console.log('❌ Paymaster needs to authorize grant contract');
                console.log('   Run: paymaster.authorizeContract("' + intractGrantAddress + '")');
            }
            
            if (parseFloat(web3.utils.fromWei(paymasterBalance, 'ether')) === 0) {
                console.log('❌ Paymaster needs funding to pay for gas fees');
            }
        }
        
        return {
            gaslessReady,
            grantToPaymaster: isPaymasterAuthorized,
            paymasterToGrant: isGrantAuthorized,
            paymasterBalance: web3.utils.fromWei(paymasterBalance, 'ether'),
            grantOwner,
            paymasterOwner
        };
        
    } catch (error) {
        console.error('\n❌ ERROR CHECKING GASLESS STATUS:', error.message);
        
        // Try to determine if it's a contract type issue
        if (error.message.includes('authorizedPaymasters')) {
            console.log('\n🔧 POSSIBLE ISSUE: Contract may not be EnhancedGaslessGrant type');
            console.log('Check if this is actually a different contract type');
        }
        
        return { error: error.message };
    }
}

// Run the check
if (require.main === module) {
    checkIntractGaslessStatus()
        .then(result => {
            if (result && !result.error) {
                process.exit(0);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = checkIntractGaslessStatus; 