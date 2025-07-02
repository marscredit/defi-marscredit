const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('\n🔍 DEBUGGING ABI MISMATCH FOR GASLESS TRANSACTIONS');
    console.log('==================================================');
    
    // Initialize Web3 connection
    const web3 = new Web3('https://rpc.marscredit.xyz:443');
    
    // Contract addresses
    const testGrantAddress = '0xFde59B4b965b6B0A9817F050261244Fe5f99B911';
    const paymasterAddress = '0xd29d35EF4D539900631E2E7322d716Cbc2c0a5FF';
    
    console.log('🎯 Grant Contract:', testGrantAddress);
    console.log('💰 Paymaster Contract:', paymasterAddress);
    console.log('');

    try {
        // 1. TEST PAYMASTER CONTRACT FUNCTIONS
        console.log('🧪 TESTING PAYMASTER CONTRACT FUNCTIONS:');
        console.log('=========================================');
        
        // Load actual deployed paymaster ABI
        const paymasterArtifactPath = path.join(__dirname, '..', 'build', 'contracts', 'MarsGrantPaymaster.json');
        const paymasterArtifact = JSON.parse(fs.readFileSync(paymasterArtifactPath, 'utf8'));
        console.log('📋 Loaded MarsGrantPaymaster ABI with', paymasterArtifact.abi.length, 'functions');
        
        const paymaster = new web3.eth.Contract(paymasterArtifact.abi, paymasterAddress);
        
        // Test all functions the frontend uses
        console.log('\n🔍 Testing paymaster functions...');
        
        try {
            const authorizedContracts = await paymaster.methods.authorizedContracts(testGrantAddress).call();
            console.log('✅ authorizedContracts():', authorizedContracts);
        } catch (error) {
            console.log('❌ authorizedContracts() failed:', error.message);
        }
        
        try {
            const canUse = await paymaster.methods.canUseSponsoredTransaction('0x06F0f6935dfe7Aef5947a12cCDa532346a815ccD').call();
            console.log('✅ canUseSponsoredTransaction():', canUse);
        } catch (error) {
            console.log('❌ canUseSponsoredTransaction() failed:', error.message);
        }
        
        try {
            const balance = await paymaster.methods.getBalance().call();
            console.log('✅ getBalance():', web3.utils.fromWei(balance, 'ether'), 'MARS');
        } catch (error) {
            console.log('❌ getBalance() failed:', error.message);
        }
        
        try {
            const totalSponsored = await paymaster.methods.totalGasSponsored().call();
            console.log('✅ totalGasSponsored():', web3.utils.fromWei(totalSponsored, 'ether'), 'MARS');
        } catch (error) {
            console.log('❌ totalGasSponsored() failed:', error.message);
        }

        // 2. TEST GRANT CONTRACT FUNCTIONS
        console.log('\n🧪 TESTING GRANT CONTRACT FUNCTIONS:');
        console.log('====================================');
        
        // Load grant contract ABI
        const grantArtifactPath = path.join(__dirname, '..', 'build', 'contracts', 'EnhancedGaslessGrant.json');
        if (fs.existsSync(grantArtifactPath)) {
            const grantArtifact = JSON.parse(fs.readFileSync(grantArtifactPath, 'utf8'));
            console.log('📋 Loaded EnhancedGaslessGrant ABI with', grantArtifact.abi.length, 'functions');
            
            const grant = new web3.eth.Contract(grantArtifact.abi, testGrantAddress);
            
            console.log('\n🔍 Testing grant functions...');
            
            try {
                const balance = await grant.methods.getBalance().call();
                console.log('✅ getBalance():', web3.utils.fromWei(balance, 'ether'), 'MARS');
            } catch (error) {
                console.log('❌ getBalance() failed:', error.message);
            }
            
            try {
                const rewardAmount = await grant.methods.redemptionAmountPerUser().call();
                console.log('✅ redemptionAmountPerUser():', web3.utils.fromWei(rewardAmount, 'ether'), 'MARS');
            } catch (error) {
                console.log('❌ redemptionAmountPerUser() failed:', error.message);
            }
            
            try {
                const isWhitelistMode = await grant.methods.isWhitelistMode().call();
                console.log('✅ isWhitelistMode():', isWhitelistMode);
            } catch (error) {
                console.log('❌ isWhitelistMode() failed:', error.message);
            }
            
            try {
                const paused = await grant.methods.paused().call();
                console.log('✅ paused():', paused);
            } catch (error) {
                console.log('❌ paused() failed:', error.message);
            }
            
            try {
                const authorizedPaymasters = await grant.methods.authorizedPaymasters(paymasterAddress).call();
                console.log('✅ authorizedPaymasters():', authorizedPaymasters);
            } catch (error) {
                console.log('❌ authorizedPaymasters() failed:', error.message);
            }
            
        } else {
            console.log('❌ EnhancedGaslessGrant.json not found, trying other contracts...');
            
            // Try with SimpleTestContract if EnhancedGaslessGrant not available
            try {
                const simpleArtifactPath = path.join(__dirname, '..', 'build', 'contracts', 'SimpleTestContract.json');
                if (fs.existsSync(simpleArtifactPath)) {
                    console.log('📋 Found SimpleTestContract, testing basic functions...');
                    const simpleArtifact = JSON.parse(fs.readFileSync(simpleArtifactPath, 'utf8'));
                    const simple = new web3.eth.Contract(simpleArtifact.abi, testGrantAddress);
                    
                    const owner = await simple.methods.owner().call();
                    console.log('✅ SimpleTestContract owner():', owner);
                }
            } catch (error) {
                console.log('❌ Simple contract test failed:', error.message);
            }
        }

        // 3. CHECK FRONTEND ABI vs DEPLOYED ABI
        console.log('\n🧪 COMPARING FRONTEND ABI vs DEPLOYED ABI:');
        console.log('===========================================');
        
        // Read grants-registry.ts to see what ABI it expects
        const registryPath = path.join(__dirname, '..', 'src', 'lib', 'grants-registry.ts');
        const registryContent = fs.readFileSync(registryPath, 'utf8');
        
        // Check if gaslessGrantABI is defined and what functions it has
        const gaslessABIMatch = registryContent.match(/gaslessGrantABI = parseAbi\(\[([\s\S]*?)\]\)/);
        if (gaslessABIMatch) {
            const gaslessABIContent = gaslessABIMatch[1];
            const functionMatches = gaslessABIContent.match(/'function [^']+'/g);
            if (functionMatches) {
                console.log('📋 Frontend expects these functions:');
                functionMatches.forEach(func => {
                    console.log('  -', func.replace(/'/g, ''));
                });
            }
        }
        
        // 4. CHECK DEPLOYED CONTRACT BYTECODE
        console.log('\n🧪 CHECKING DEPLOYED CONTRACT DETAILS:');
        console.log('======================================');
        
        const grantCode = await web3.eth.getCode(testGrantAddress);
        const paymasterCode = await web3.eth.getCode(paymasterAddress);
        
        console.log('📊 Grant contract bytecode length:', grantCode.length);
        console.log('📊 Paymaster contract bytecode length:', paymasterCode.length);
        
        if (grantCode === '0x') {
            console.log('❌ CRITICAL: Grant contract has no code! Contract not deployed or wrong address.');
        } else {
            console.log('✅ Grant contract has code - deployed correctly');
        }
        
        if (paymasterCode === '0x') {
            console.log('❌ CRITICAL: Paymaster contract has no code! Contract not deployed or wrong address.');
        } else {
            console.log('✅ Paymaster contract has code - deployed correctly');
        }

        // 5. DIRECT FUNCTION SIGNATURE TEST
        console.log('\n🧪 TESTING FUNCTION SIGNATURES:');
        console.log('===============================');
        
        // Test if the contract responds to specific function calls
        try {
            // Test direct call to authorizedContracts with raw call
            const authorizedContractsSelector = web3.utils.keccak256('authorizedContracts(address)').substring(0, 10);
            const authorizedContractsData = authorizedContractsSelector + 
                web3.eth.abi.encodeParameter('address', testGrantAddress).substring(2);
            
            const result = await web3.eth.call({
                to: paymasterAddress,
                data: authorizedContractsData
            });
            
            const isAuthorized = web3.eth.abi.decodeParameter('bool', result);
            console.log('✅ Direct call authorizedContracts():', isAuthorized);
            
        } catch (error) {
            console.log('❌ Direct function call failed:', error.message);
        }
        
        console.log('\n📋 RECOMMENDATIONS:');
        console.log('===================');
        
        if (grantCode === '0x' || paymasterCode === '0x') {
            console.log('🚨 CRITICAL ISSUE: One or both contracts not properly deployed');
        } else {
            console.log('🔧 POTENTIAL SOLUTIONS:');
            console.log('1. Check if contract type in grants-registry.ts is correct');
            console.log('2. Verify gaslessGrantABI matches deployed contract');
            console.log('3. Clear browser cache and hard refresh (Cmd+Shift+R)');
            console.log('4. Check if isGrantAuthorizedForGasless() function uses correct paymaster');
            console.log('5. Verify grant contract has authorizePaymaster() function');
        }
        
    } catch (error) {
        console.error('❌ Debug script failed:', error);
    }
}

main()
    .then(() => {
        console.log('\n🎊 ABI DEBUG COMPLETED!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    }); 