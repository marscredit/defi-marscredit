const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('\n🔗 AUTHORIZING GRANT WITH PAYMASTER');
    console.log('===================================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Load deployment wallet
    const deployerPrivateKey = '0x702f0b3c12108a7341cc1c94ac83a4a4732df139fb75880d13568883244082ea';
    const account = web3.eth.accounts.privateKeyToAccount(deployerPrivateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('🔐 Deployer:', account.address);
    
    // Contract addresses
    const paymasterAddress = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'; // Deployed paymaster
    const testGrantAddress = '0xFde59B4b965b6B0A9817F050261244Fe5f99B911'; // Enhanced Test Genesis Grant
    
    console.log('💰 Paymaster:', paymasterAddress);
    console.log('🎯 Grant:', testGrantAddress);
    
    // Paymaster ABI
    const paymasterABI = [
        {
            "inputs": [
                {"internalType": "address", "name": "grantContract", "type": "address"},
                {"internalType": "bool", "name": "authorized", "type": "bool"}
            ],
            "name": "authorizeContract",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
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
        }
    ];
    
    const paymaster = new web3.eth.Contract(paymasterABI, paymasterAddress);
    
    try {
        // Check current authorization status
        console.log('\n🔍 Checking current authorization status...');
        
        const isAuthorized = await paymaster.methods.authorizedContracts(testGrantAddress).call();
        console.log('📊 Grant authorized with paymaster:', isAuthorized);
        
        if (isAuthorized) {
            console.log('✅ Grant is already authorized with paymaster!');
            console.log('🎉 Gasless transactions should work now.');
            return;
        }
        
        // Authorize the grant contract with paymaster
        console.log('\n🚀 Authorizing grant contract with paymaster...');
        
        const authorizeTx = await paymaster.methods.authorizeContract(testGrantAddress, true).send({
            from: account.address,
            gas: 100000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('✅ AUTHORIZATION SUCCESSFUL!');
        console.log('📍 Transaction:', authorizeTx.transactionHash);
        console.log('⛽ Gas used:', authorizeTx.gasUsed.toLocaleString());
        
        // Verify authorization
        const isNowAuthorized = await paymaster.methods.authorizedContracts(testGrantAddress).call();
        console.log('📊 Grant now authorized:', isNowAuthorized);
        
        if (isNowAuthorized) {
            console.log('\n🎉 GASLESS TRANSACTIONS NOW ENABLED!');
            console.log('===================================');
            console.log('✅ Enhanced Test Genesis Grant is ready for gasless redemptions');
            console.log('⚡ Users can now redeem 10 MARS with ZERO gas fees');
            console.log('🔗 Test URL: http://localhost:3000/grants/0xFde59B4b965b6B0A9817F050261244Fe5f99B911');
            
            console.log('\n📝 NEXT STEPS:');
            console.log('1. 🔄 Refresh the grant detail page');
            console.log('2. ✅ Gasless Redemption button should now be green and active');
            console.log('3. ⚡ Test redeeming 10 MARS with zero gas fees!');
        } else {
            console.log('❌ Authorization verification failed');
        }
        
    } catch (error) {
        console.error('\n❌ AUTHORIZATION FAILED:', error.message);
        
        // Check if it's an ownership issue
        if (error.message.includes('Ownable: caller is not the owner')) {
            console.log('\n🔧 TROUBLESHOOTING:');
            console.log('- This error suggests the deployer is not the owner of the paymaster');
            console.log('- Check who deployed the paymaster contract');
            console.log('- Only the paymaster owner can authorize contracts');
            
            try {
                const owner = await paymaster.methods.owner().call();
                console.log('📊 Paymaster owner:', owner);
                console.log('📊 Current deployer:', account.address);
                console.log('📊 Owner match:', owner.toLowerCase() === account.address.toLowerCase());
            } catch (ownerError) {
                console.log('❌ Could not check paymaster owner:', ownerError.message);
            }
        }
    }
}

main()
    .then(() => {
        console.log('\n🎊 AUTHORIZATION SCRIPT COMPLETED!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }); 