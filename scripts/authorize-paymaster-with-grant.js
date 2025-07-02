const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('\n🔗 AUTHORIZING PAYMASTER WITH GRANT CONTRACT');
    console.log('============================================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Load deployment wallet
    const deployerPrivateKey = '0x702f0b3c12108a7341cc1c94ac83a4a4732df139fb75880d13568883244082ea';
    const account = web3.eth.accounts.privateKeyToAccount(deployerPrivateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('🔐 Deployer:', account.address);
    
    // Contract addresses
    const testGrantAddress = '0xFde59B4b965b6B0A9817F050261244Fe5f99B911';
    const paymasterAddress = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';
    
    console.log('🎯 Grant Contract:', testGrantAddress);
    console.log('💰 Paymaster Address:', paymasterAddress);
    
    // Load grant contract ABI
    const grantArtifactPath = path.join(__dirname, '..', 'build', 'contracts', 'EnhancedGaslessGrant.json');
    const grantArtifact = JSON.parse(fs.readFileSync(grantArtifactPath, 'utf8'));
    const grant = new web3.eth.Contract(grantArtifact.abi, testGrantAddress);
    
    try {
        // Check current authorization status
        console.log('\n🔍 Checking current authorization status...');
        
        const isPaymasterAuthorized = await grant.methods.authorizedPaymasters(paymasterAddress).call();
        console.log('📊 Paymaster authorized with grant:', isPaymasterAuthorized);
        
        if (isPaymasterAuthorized) {
            console.log('✅ Paymaster is already authorized with grant!');
            console.log('🎉 Two-way authorization should be complete.');
            return;
        }
        
        // Authorize the paymaster with grant contract
        console.log('\n🚀 Authorizing paymaster with grant contract...');
        
        const authorizeTx = await grant.methods.authorizePaymaster(paymasterAddress).send({
            from: account.address,
            gas: 100000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('✅ AUTHORIZATION SUCCESSFUL!');
        console.log('📍 Transaction:', authorizeTx.transactionHash);
        console.log('⛽ Gas used:', authorizeTx.gasUsed.toLocaleString());
        
        // Verify authorization
        const isNowAuthorized = await grant.methods.authorizedPaymasters(paymasterAddress).call();
        console.log('📊 Paymaster now authorized with grant:', isNowAuthorized);
        
        if (isNowAuthorized) {
            console.log('\n🎉 TWO-WAY AUTHORIZATION COMPLETE!');
            console.log('==================================');
            console.log('✅ Paymaster → Grant: AUTHORIZED');
            console.log('✅ Grant → Paymaster: AUTHORIZED');
            console.log('⚡ Gasless transactions should now work!');
            
            console.log('\n📝 FINAL TEST STEPS:');
            console.log('1. 🔄 Hard refresh the grant page (Cmd+Shift+R)');
            console.log('2. ✅ Gasless section should now show green "Available"');
            console.log('3. ⚡ Test redeeming 10 MARS with ZERO gas fees!');
        } else {
            console.log('❌ Authorization verification failed');
        }
        
    } catch (error) {
        console.error('\n❌ AUTHORIZATION FAILED:', error.message);
        
        // Check if it's an ownership issue
        if (error.message.includes('Ownable: caller is not the owner')) {
            console.log('\n🔧 TROUBLESHOOTING:');
            console.log('- This error suggests the deployer is not the owner of the grant contract');
            console.log('- Check who deployed the grant contract');
            console.log('- Only the grant owner can authorize paymasters');
            
            try {
                const owner = await grant.methods.owner().call();
                console.log('📊 Grant owner:', owner);
                console.log('📊 Current deployer:', account.address);
                console.log('📊 Owner match:', owner.toLowerCase() === account.address.toLowerCase());
            } catch (ownerError) {
                console.log('❌ Could not check grant owner:', ownerError.message);
            }
        }
        
        // Check if function exists
        if (error.message.includes('authorizePaymaster')) {
            console.log('\n🔧 POSSIBLE ISSUE: authorizePaymaster function may not exist on this contract');
            console.log('- Contract might be SimpleTestContract instead of EnhancedGaslessGrant');
            console.log('- Check what type of contract was actually deployed');
        }
    }
}

main()
    .then(() => {
        console.log('\n🎊 PAYMASTER AUTHORIZATION SCRIPT COMPLETED!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }); 