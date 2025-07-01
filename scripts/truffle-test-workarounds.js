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
    console.log('\n🔧 Testing Gas Workarounds for Mars Credit Network (Truffle)');
    console.log('============================================================\n');

    // Initialize Web3 with Mars Credit Network  
    const web3 = new Web3('http://209.145.61.4:8545');
    
    // Load deployment wallet
    const walletPath = path.join(__dirname, '..', 'deployment-wallet.json');
    const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    const account = web3.eth.accounts.privateKeyToAccount(walletInfo.privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('Deployer:', account.address);
    
    const balance = await web3.eth.getBalance(account.address);
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'MARS\n');

    // Test 1: Deploy minimal contract first
    console.log('🧪 Test 1: Minimal Contract Deployment');
    console.log('---------------------------------------');
    
    try {
        const simpleArtifact = readArtifact('SimpleTestContract');
        if (!simpleArtifact) {
            console.log('❌ SimpleTestContract artifact not found. Run: truffle compile');
            return;
        }
        
        const SimpleContract = new web3.eth.Contract(simpleArtifact.abi);
        
        // Deploy with conservative gas settings
        const simpleContract = await SimpleContract.deploy({
            data: simpleArtifact.bytecode
        }).send({
            from: account.address,
            gas: 500000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('✅ Simple contract deployed at:', simpleContract.options.address);
        
        // Test interaction
        const ping = await simpleContract.methods.ping().call();
        console.log('Ping test:', ping);
        
        const info = await simpleContract.methods.getInfo().call();
        console.log('Contract info - Owner:', info[0], 'Block:', info[1], 'Deployed:', info[2]);
        
    } catch (error) {
        console.log('❌ Simple contract deployment failed:', error.message);
    }

    // Test 2: Enhanced contract with workarounds
    console.log('\n🧪 Test 2: Enhanced Contract with Gas Workarounds');
    console.log('--------------------------------------------------');
    
    const enhancedArtifact = readArtifact('EnhancedGaslessGrant');
    if (!enhancedArtifact) {
        console.log('❌ EnhancedGaslessGrant artifact not found. Run: truffle compile');
        return;
    }
    
    const EnhancedContract = new web3.eth.Contract(enhancedArtifact.abi);
    const deploymentParams = [
        account.address,                                        // owner
        web3.utils.toWei('5000', 'ether'),                     // reward amount
        web3.utils.toWei('0.01', 'ether'),                     // gas allowance  
        '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'          // paymaster
    ];
    
    const workarounds = [
        {
            name: 'Ultra Conservative',
            options: {
                gas: 4000000,
                gasPrice: web3.utils.toWei('1', 'gwei')
            }
        },
        {
            name: 'High Gas Limit',
            options: {
                gas: 6000000,
                gasPrice: web3.utils.toWei('0.5', 'gwei')
            }
        },
        {
            name: 'Maximum Block Gas',
            options: {
                gas: 8000000,
                gasPrice: web3.utils.toWei('0.1', 'gwei')
            }
        },
        {
            name: 'Very Low Gas Price',
            options: {
                gas: 3000000,
                gasPrice: web3.utils.toWei('0.01', 'gwei')
            }
        }
    ];

    for (const workaround of workarounds) {
        console.log(`\nTrying: ${workaround.name}`);
        console.log(`Gas: ${workaround.options.gas}, Price: ${web3.utils.fromWei(workaround.options.gasPrice, 'gwei')} gwei`);
        
        try {
            const contract = await EnhancedContract.deploy({
                data: enhancedArtifact.bytecode,
                arguments: deploymentParams
            }).send({
                from: account.address,
                ...workaround.options
            });
            
            console.log('✅ SUCCESS! Contract deployed at:', contract.options.address);
            
            // Test basic functionality
            try {
                const owner = await contract.methods.owner().call();
                console.log('Owner check:', owner === account.address ? '✅' : '❌');
                
                const rewardAmount = await contract.methods.rewardAmount().call();
                console.log('Reward amount:', web3.utils.fromWei(rewardAmount, 'ether'), 'MARS');
                
                console.log(`\n🎉 DEPLOYMENT SUCCESSFUL WITH: ${workaround.name}`);
                console.log('Contract address:', contract.options.address);
                
                // Stop here since we found a working method
                return;
                
            } catch (interactionError) {
                console.log('⚠️ Deployment succeeded but interaction failed:', interactionError.message);
            }
            
        } catch (error) {
            console.log('❌ Failed:', error.message.substring(0, 100) + '...');
            
            // Provide specific guidance based on error type
            if (error.message.includes('gas')) {
                console.log('💡 Suggestion: Gas-related error - try higher gas limit');
            }
            if (error.message.includes('revert')) {
                console.log('💡 Suggestion: Transaction reverted - check contract parameters');
            }
            if (error.message.includes('timeout')) {
                console.log('💡 Suggestion: Network timeout - try again or use different RPC');
            }
        }
    }

    // Test 3: Manual transaction approach
    console.log('\n🧪 Test 3: Manual Transaction Deployment');
    console.log('------------------------------------------');
    
    try {
        // Encode constructor parameters
        const constructorParams = web3.eth.abi.encodeParameters(
            ['address', 'uint256', 'uint256', 'address'],
            deploymentParams
        );
        
        const bytecodeWithParams = enhancedArtifact.bytecode + constructorParams.slice(2);
        console.log('Bytecode length:', bytecodeWithParams.length / 2, 'bytes');
        
        const deployTx = await web3.eth.sendTransaction({
            from: account.address,
            data: bytecodeWithParams,
            gas: 5000000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('Manual deployment tx:', deployTx.transactionHash);
        
        if (deployTx.contractAddress) {
            console.log('✅ Manual deployment successful!');
            console.log('Contract address:', deployTx.contractAddress);
            console.log('Gas used:', deployTx.gasUsed);
        }
        
    } catch (error) {
        console.log('❌ Manual deployment failed:', error.message);
    }

    // Test 4: Network diagnostic
    console.log('\n🔍 Network Diagnostic');
    console.log('----------------------');
    
    try {
        const block = await web3.eth.getBlock('latest');
        console.log('Block number:', block.number);
        console.log('Block gas limit:', block.gasLimit);
        console.log('Block gas used:', block.gasUsed);
        console.log('Network utilization:', ((block.gasUsed / block.gasLimit) * 100).toFixed(2) + '%');
        
        // Test simple transfer
        const transferTx = await web3.eth.sendTransaction({
            from: account.address,
            to: account.address,
            value: web3.utils.toWei('0.001', 'ether'),
            gas: 21000,
            gasPrice: web3.utils.toWei('1', 'gwei')
        });
        
        console.log('Simple transfer test: ✅');
        console.log('Transfer gas used:', transferTx.gasUsed);
        
    } catch (error) {
        console.log('❌ Network diagnostic failed:', error.message);
    }

    console.log('\n📋 Summary and Next Steps:');
    console.log('----------------------------');
    console.log('1. If simple contract worked but enhanced failed: Contract size issue');
    console.log('2. If all failed: Potential network/node configuration issue');
    console.log('3. If manual deployment worked: Use manual deployment approach');
    console.log('4. Try deploying during off-peak hours with lower gas prices');
    console.log('5. Consider contract optimization or factory pattern');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }); 