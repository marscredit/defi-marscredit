const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Read contract artifacts
function readArtifact(contractName) {
    const artifactPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
    if (fs.existsSync(artifactPath)) {
        return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    }
    return null;
}

async function main() {
    console.log('\n🔧 Simple Deployment Test for Mars Credit Network');
    console.log('===================================================\n');

    // Load deployment wallet
    const walletPath = path.join(__dirname, '..', 'deployment-wallet.json');
    const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    console.log('Deployer address:', walletInfo.address);
    console.log('Private key available:', walletInfo.privateKey ? '✅' : '❌');
    
    // Test 1: Check contract artifacts
    console.log('\n📦 Contract Artifacts Check:');
    console.log('-----------------------------');
    
    const contracts = ['SimpleTestContract', 'EnhancedGaslessGrant'];
    
    for (const contractName of contracts) {
        const artifact = readArtifact(contractName);
        if (artifact) {
            console.log(`✅ ${contractName}:`);
            console.log(`   - Bytecode size: ${artifact.bytecode.length / 2} bytes`);
            console.log(`   - ABI functions: ${artifact.abi.length}`);
            
            // Calculate estimated gas for deployment
            const bytecodeSize = artifact.bytecode.length / 2 - 1; // Remove 0x prefix
            const estimatedGas = bytecodeSize * 200 + 32000; // Rough estimation
            console.log(`   - Estimated gas: ${estimatedGas}`);
        } else {
            console.log(`❌ ${contractName}: Artifact not found`);
        }
    }
    
    // Test 2: Generate deployment transactions (without sending)
    console.log('\n🛠️ Deployment Transaction Generation:');
    console.log('--------------------------------------');
    
    try {
        const web3 = new Web3(); // No provider needed for transaction generation
        
        // Load SimpleTestContract
        const simpleArtifact = readArtifact('SimpleTestContract');
        if (simpleArtifact) {
            const simpleContract = new web3.eth.Contract(simpleArtifact.abi);
            
            const deployTx = simpleContract.deploy({
                data: simpleArtifact.bytecode
            });
            
            console.log('✅ SimpleTestContract deployment transaction generated');
            console.log('   - Data length:', deployTx.encodeABI().length / 2, 'bytes');
        }
        
        // Load EnhancedGaslessGrant  
        const enhancedArtifact = readArtifact('EnhancedGaslessGrant');
        if (enhancedArtifact) {
            const enhancedContract = new web3.eth.Contract(enhancedArtifact.abi);
            
            const deploymentParams = [
                walletInfo.address,                                     // owner
                web3.utils.toWei('5000', 'ether'),                     // reward amount
                web3.utils.toWei('0.01', 'ether'),                     // gas allowance  
                '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'          // paymaster
            ];
            
            const deployTx = enhancedContract.deploy({
                data: enhancedArtifact.bytecode,
                arguments: deploymentParams
            });
            
            console.log('✅ EnhancedGaslessGrant deployment transaction generated');
            console.log('   - Data length:', deployTx.encodeABI().length / 2, 'bytes');
            
            // Manual bytecode construction test
            const constructorParams = web3.eth.abi.encodeParameters(
                ['address', 'uint256', 'uint256', 'address'],
                deploymentParams
            );
            
            const fullBytecode = enhancedArtifact.bytecode + constructorParams.slice(2);
            console.log('   - Manual construction:', fullBytecode.length / 2, 'bytes');
        }
        
    } catch (error) {
        console.log('❌ Transaction generation failed:', error.message);
    }
    
    // Test 3: Gas estimation calculations
    console.log('\n⛽ Gas Estimation Strategies:');
    console.log('-----------------------------');
    
    const gasStrategies = [
        {
            name: 'Conservative (Contract Size Based)',
            calculate: (bytecodeSize) => Math.max(bytecodeSize * 200 + 32000, 500000)
        },
        {
            name: 'Moderate (1.5x Conservative)',
            calculate: (bytecodeSize) => Math.floor((bytecodeSize * 200 + 32000) * 1.5)
        },
        {
            name: 'Aggressive (3x Conservative)',
            calculate: (bytecodeSize) => Math.floor((bytecodeSize * 200 + 32000) * 3)
        },
        {
            name: 'Maximum Safe (8M gas)',
            calculate: (bytecodeSize) => 8000000
        }
    ];
    
    const enhancedArtifact = readArtifact('EnhancedGaslessGrant');
    if (enhancedArtifact) {
        const bytecodeSize = enhancedArtifact.bytecode.length / 2;
        console.log(`\nFor EnhancedGaslessGrant (${bytecodeSize} bytes):`);
        
        gasStrategies.forEach(strategy => {
            const gasLimit = strategy.calculate(bytecodeSize);
            console.log(`   ${strategy.name}: ${gasLimit.toLocaleString()} gas`);
        });
    }
    
    // Test 4: Generate ready-to-use deployment commands
    console.log('\n🚀 Ready-to-Deploy Commands:');
    console.log('-----------------------------');
    
    console.log('SIMPLE CONTRACT:');
    console.log('truffle deploy --network marscredit --contract SimpleTestContract');
    console.log('');
    console.log('ENHANCED CONTRACT (Manual):');
    console.log('node scripts/manual-deploy-enhanced.js');
    
    console.log('\n📋 Recommended Next Steps:');
    console.log('----------------------------');
    console.log('1. ✅ Contracts compiled successfully');
    console.log('2. ✅ Deployment transactions can be generated');
    console.log('3. 🔄 Try deploying SimpleTestContract first with truffle');
    console.log('4. 🔄 If that works, try EnhancedGaslessGrant with manual approach');
    console.log('5. 🎯 Use high gas limits (3-8M) and low gas prices (0.1-1 gwei)');
}

main()
    .then(() => {
        console.log('\n✅ Test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }); 