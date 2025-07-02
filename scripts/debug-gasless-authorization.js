const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('\n🔍 DEBUGGING GASLESS AUTHORIZATION');
    console.log('==================================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Contract addresses from frontend
    const testGrantAddress = '0xFde59B4b965b6B0A9817F050261244Fe5f99B911';
    const paymasterFromRegistry = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'; // From grants-registry.ts
    const paymasterDeployed = '0xd29d35EF4D539900631E2E7322d716Cbc2c0a5FF'; // Actually deployed
    
    console.log('🎯 Test Grant:', testGrantAddress);
    console.log('💰 Paymaster (Registry):', paymasterFromRegistry);
    console.log('💰 Paymaster (Deployed):', paymasterDeployed);
    console.log('');
    
    // Paymaster ABI
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
        // Test both paymaster addresses
        console.log('🧪 TESTING PAYMASTER FROM REGISTRY:');
        console.log('===================================');
        
        try {
            const registryPaymaster = new web3.eth.Contract(paymasterABI, paymasterFromRegistry);
            const registryAuthorized = await registryPaymaster.methods.authorizedContracts(testGrantAddress).call();
            const registryOwner = await registryPaymaster.methods.owner().call();
            const registryBalance = await registryPaymaster.methods.getBalance().call();
            
            console.log('✅ Contract exists and responds');
            console.log('📊 Grant authorized:', registryAuthorized);
            console.log('👤 Owner:', registryOwner);
            console.log('💰 Balance:', web3.utils.fromWei(registryBalance, 'ether'), 'MARS');
        } catch (registryError) {
            console.log('❌ Registry paymaster failed:', registryError.message);
        }
        
        console.log('\n🧪 TESTING DEPLOYED PAYMASTER:');
        console.log('==============================');
        
        try {
            const deployedPaymaster = new web3.eth.Contract(paymasterABI, paymasterDeployed);
            const deployedAuthorized = await deployedPaymaster.methods.authorizedContracts(testGrantAddress).call();
            const deployedOwner = await deployedPaymaster.methods.owner().call();
            const deployedBalance = await deployedPaymaster.methods.getBalance().call();
            
            console.log('✅ Contract exists and responds');
            console.log('📊 Grant authorized:', deployedAuthorized);
            console.log('👤 Owner:', deployedOwner);
            console.log('💰 Balance:', web3.utils.fromWei(deployedBalance, 'ether'), 'MARS');
        } catch (deployedError) {
            console.log('❌ Deployed paymaster failed:', deployedError.message);
        }
        
        console.log('\n🔍 CHECKING GRANTS REGISTRY CONFIGURATION:');
        console.log('==========================================');
        
        // Read the grants registry file
        const registryPath = path.join(__dirname, '..', 'src', 'lib', 'grants-registry.ts');
        const registryContent = fs.readFileSync(registryPath, 'utf8');
        
        // Find the paymaster contract address line
        const paymasterMatch = registryContent.match(/PAYMASTER_CONTRACT_ADDRESS.*?=.*?'(0x[a-fA-F0-9]{40})'/);
        if (paymasterMatch) {
            const registryPaymasterAddr = paymasterMatch[1];
            console.log('📋 Paymaster in grants-registry.ts:', registryPaymasterAddr);
            
            if (registryPaymasterAddr === paymasterFromRegistry) {
                console.log('✅ Registry address matches expected');
            } else {
                console.log('❌ Registry address mismatch!');
                console.log('   Expected:', paymasterFromRegistry);
                console.log('   Found:', registryPaymasterAddr);
            }
            
            if (registryPaymasterAddr === paymasterDeployed) {
                console.log('✅ Registry points to deployed paymaster');
            } else {
                console.log('❌ Registry does NOT point to deployed paymaster');
                console.log('   Registry:', registryPaymasterAddr);
                console.log('   Deployed:', paymasterDeployed);
                console.log('');
                console.log('🔧 SOLUTION: Update grants-registry.ts paymaster address!');
            }
        }
        
        console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
        console.log('==============================');
        
        if (paymasterFromRegistry !== paymasterDeployed) {
            console.log('🚨 ISSUE FOUND: Registry points to wrong paymaster!');
            console.log('');
            console.log('🔧 FIX NEEDED:');
            console.log('1. Update PAYMASTER_CONTRACT_ADDRESS in grants-registry.ts');
            console.log(`2. Change from: ${paymasterFromRegistry}`);
            console.log(`3. Change to:   ${paymasterDeployed}`);
            console.log('4. Restart the frontend development server');
            console.log('');
            console.log('This explains why gasless shows "not authorized" - the frontend');
            console.log('is checking the wrong paymaster contract!');
        } else {
            console.log('✅ Paymaster addresses match - investigating other issues...');
        }
        
    } catch (error) {
        console.error('❌ Debug script failed:', error);
    }
}

main()
    .then(() => {
        console.log('\n🎊 DEBUG SCRIPT COMPLETED!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }); 