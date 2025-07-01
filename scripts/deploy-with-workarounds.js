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

async function deployWithWorkarounds() {
    console.log('\n🔧 Mars Credit Network - Deployment with Workarounds');
    console.log('======================================================\n');

    // Initialize Web3 with Mars Credit Network
    const web3 = new Web3('http://209.145.61.4:8545');
    
    // Load deployment wallet
    const walletPath = path.join(__dirname, '..', 'deployment-wallet.json');
    const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    const account = web3.eth.accounts.privateKeyToAccount(walletInfo.privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('Deployer:', account.address);
    
    try {
        const balance = await web3.eth.getBalance(account.address);
        console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'MARS\n');
    } catch (error) {
        console.log('❌ Network connection failed. Using offline mode for transaction generation.\n');
        return generateOfflineTransactions(web3, walletInfo);
    }

    // WORKAROUND 1: Test basic network connectivity
    console.log('🌐 Network Diagnostic:');
    console.log('----------------------');
    
    try {
        const block = await web3.eth.getBlock('latest');
        console.log('✅ Network connected');
        console.log('Latest block:', block.number);
        console.log('Block gas limit:', block.gasLimit.toLocaleString());
        console.log('Block gas used:', block.gasUsed.toLocaleString());
        console.log('Network utilization:', ((block.gasUsed / block.gasLimit) * 100).toFixed(2) + '%');
    } catch (error) {
        console.log('❌ Network diagnostic failed:', error.message);
        console.log('Switching to offline transaction generation...\n');
        return generateOfflineTransactions(web3, walletInfo);
    }

    // WORKAROUND 2: Deploy minimal contract first
    console.log('\n🧪 Step 1: Minimal Contract Test');
    console.log('----------------------------------');
    
    const simpleArtifact = readArtifact('SimpleTestContract');
    if (!simpleArtifact) {
        console.log('❌ SimpleTestContract not found. Run: truffle compile');
        return;
    }
    
    const SimpleContract = new web3.eth.Contract(simpleArtifact.abi);
    
    // WORKAROUND 3: Use legacy transaction with conservative gas
    const simpleDeployOptions = {
        from: account.address,
        gas: 1000000,                                    // Conservative for small contract
        gasPrice: web3.utils.toWei('1', 'gwei'),         // Low gas price
        // No type specified = legacy transaction type
    };
    
    console.log('Deploying SimpleTestContract...');
    console.log('Gas limit:', simpleDeployOptions.gas.toLocaleString());
    console.log('Gas price:', web3.utils.fromWei(simpleDeployOptions.gasPrice, 'gwei'), 'gwei');
    
    try {
        const simpleContract = await SimpleContract.deploy({
            data: simpleArtifact.bytecode
        }).send(simpleDeployOptions);
        
        console.log('✅ SimpleTestContract deployed successfully!');
        console.log('Contract address:', simpleContract.options.address);
        
        // Test basic interaction
        const ping = await simpleContract.methods.ping().call();
        console.log('Contract test (ping):', ping);
        
    } catch (error) {
        console.log('❌ SimpleTestContract deployment failed:', error.message);
        console.log('\n🔄 Trying alternative approaches...\n');
        
        // WORKAROUND 4: Try with different gas settings
        await tryAlternativeGasSettings(web3, account, SimpleContract, simpleArtifact);
        return;
    }

    // WORKAROUND 5: Deploy enhanced contract with multiple strategies
    console.log('\n🚀 Step 2: Enhanced Contract Deployment');
    console.log('----------------------------------------');
    
    const enhancedArtifact = readArtifact('EnhancedGaslessGrant');
    if (!enhancedArtifact) {
        console.log('❌ EnhancedGaslessGrant not found. Run: truffle compile');
        return;
    }
    
    const deploymentParams = [
        account.address,                                        // owner
        web3.utils.toWei('5000', 'ether'),                     // reward amount
        web3.utils.toWei('0.01', 'ether'),                     // gas allowance  
        '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'          // paymaster
    ];
    
    // WORKAROUND 6: Multiple gas strategies
    const gasStrategies = [
        {
            name: 'Conservative',
            gas: 3000000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        },
        {
            name: 'Moderate',
            gas: 5000000,
            gasPrice: web3.utils.toWei('0.5', 'gwei')
        },
        {
            name: 'Aggressive',
            gas: 8000000,
            gasPrice: web3.utils.toWei('0.1', 'gwei')
        }
    ];
    
    const EnhancedContract = new web3.eth.Contract(enhancedArtifact.abi);
    
    for (const strategy of gasStrategies) {
        console.log(`\nTrying ${strategy.name} strategy...`);
        console.log(`Gas: ${strategy.gas.toLocaleString()}, Price: ${web3.utils.fromWei(strategy.gasPrice, 'gwei')} gwei`);
        
        try {
            const enhancedContract = await EnhancedContract.deploy({
                data: enhancedArtifact.bytecode,
                arguments: deploymentParams
            }).send({
                from: account.address,
                gas: strategy.gas,
                gasPrice: strategy.gasPrice
            });
            
            console.log('🎉 SUCCESS! EnhancedGaslessGrant deployed!');
            console.log('Contract address:', enhancedContract.options.address);
            
            // Test basic functionality
            const owner = await enhancedContract.methods.owner().call();
            const rewardAmount = await enhancedContract.methods.rewardAmount().call();
            
            console.log('Owner:', owner);
            console.log('Reward amount:', web3.utils.fromWei(rewardAmount, 'ether'), 'MARS');
            
            console.log('\n✅ DEPLOYMENT COMPLETE!');
            console.log('=====================');
            console.log('Strategy that worked:', strategy.name);
            console.log('Contract address:', enhancedContract.options.address);
            console.log('Gas used: Check transaction receipt for actual gas consumption');
            
            return;
            
        } catch (error) {
            console.log(`❌ ${strategy.name} strategy failed:`, error.message.substring(0, 100) + '...');
        }
    }
    
    // WORKAROUND 7: Manual bytecode deployment as last resort
    console.log('\n🔧 Step 3: Manual Bytecode Deployment');
    console.log('--------------------------------------');
    
    try {
        await manualBytecodeDeployment(web3, account, enhancedArtifact, deploymentParams);
    } catch (error) {
        console.log('❌ Manual deployment also failed:', error.message);
        
        console.log('\n🚨 All deployment strategies failed!');
        console.log('=====================================');
        console.log('This indicates a potential network configuration issue.');
        console.log('Please coordinate with the Mars Credit Network team to:');
        console.log('1. Check network health and gas limits');
        console.log('2. Verify RPC endpoint accessibility');
        console.log('3. Consider network upgrades if needed');
    }
}

async function tryAlternativeGasSettings(web3, account, Contract, artifact) {
    console.log('🔄 Trying alternative gas settings for SimpleTestContract...');
    
    const alternatives = [
        { gas: 500000, gasPrice: web3.utils.toWei('0.5', 'gwei') },
        { gas: 2000000, gasPrice: web3.utils.toWei('0.1', 'gwei') },
        { gas: 5000000, gasPrice: web3.utils.toWei('0.01', 'gwei') },
    ];
    
    for (const alt of alternatives) {
        try {
            console.log(`Trying gas: ${alt.gas}, price: ${web3.utils.fromWei(alt.gasPrice, 'gwei')} gwei`);
            
            const contract = await Contract.deploy({
                data: artifact.bytecode
            }).send({
                from: account.address,
                gas: alt.gas,
                gasPrice: alt.gasPrice
            });
            
            console.log('✅ Alternative deployment successful!');
            console.log('Contract address:', contract.options.address);
            return;
            
        } catch (error) {
            console.log('❌ Failed:', error.message.substring(0, 50) + '...');
        }
    }
}

async function manualBytecodeDeployment(web3, account, artifact, deploymentParams) {
    console.log('Manual bytecode deployment...');
    
    // Encode constructor parameters
    const constructorParams = web3.eth.abi.encodeParameters(
        ['address', 'uint256', 'uint256', 'address'],
        deploymentParams
    );
    
    const fullBytecode = artifact.bytecode + constructorParams.slice(2);
    console.log('Full bytecode length:', fullBytecode.length / 2, 'bytes');
    
    const deployTx = await web3.eth.sendTransaction({
        from: account.address,
        data: fullBytecode,
        gas: 8000000,
        gasPrice: web3.utils.toWei('0.1', 'gwei')
    });
    
    if (deployTx.contractAddress) {
        console.log('✅ Manual deployment successful!');
        console.log('Contract address:', deployTx.contractAddress);
        console.log('Gas used:', deployTx.gasUsed);
    } else {
        throw new Error('Manual deployment failed - no contract address returned');
    }
}

function generateOfflineTransactions(web3, walletInfo) {
    console.log('📝 Generating Offline Deployment Transactions');
    console.log('==============================================\n');
    
    // This provides transaction data that can be broadcast manually
    const simpleArtifact = readArtifact('SimpleTestContract');
    const enhancedArtifact = readArtifact('EnhancedGaslessGrant');
    
    if (simpleArtifact) {
        console.log('SimpleTestContract deployment data:');
        console.log('Data:', simpleArtifact.bytecode);
        console.log('Recommended gas: 1000000');
        console.log('Recommended gas price: 1 gwei');
    }
    
    if (enhancedArtifact) {
        const deploymentParams = [
            walletInfo.address,
            web3.utils.toWei('5000', 'ether'),
            web3.utils.toWei('0.01', 'ether'),  
            '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
        ];
        
        const constructorParams = web3.eth.abi.encodeParameters(
            ['address', 'uint256', 'uint256', 'address'],
            deploymentParams
        );
        
        const fullBytecode = enhancedArtifact.bytecode + constructorParams.slice(2);
        
        console.log('\nEnhancedGaslessGrant deployment data:');
        console.log('Data:', fullBytecode);
        console.log('Recommended gas: 5000000');
        console.log('Recommended gas price: 0.5 gwei');
    }
    
    console.log('\n💡 These can be broadcast using MetaMask or other wallet tools');
}

// Run the deployment
deployWithWorkarounds()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }); 