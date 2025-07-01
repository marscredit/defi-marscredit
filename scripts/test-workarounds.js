const { ethers } = require('hardhat');

async function main() {
    console.log('\n🔧 Testing Gas Workarounds for Mars Credit Network');
    console.log('==================================================\n');

    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    
    const balance = await deployer.getBalance();
    console.log('Balance:', ethers.utils.formatEther(balance), 'MARS\n');

    // Test 1: Deploy minimal contract first
    console.log('🧪 Test 1: Minimal Contract Deployment');
    console.log('---------------------------------------');
    
    try {
        const SimpleContract = await ethers.getContractFactory('SimpleTestContract');
        
        // Use legacy transaction with conservative gas settings
        const simpleContract = await SimpleContract.deploy({
            gasLimit: 500000,  // Conservative for small contract
            gasPrice: ethers.utils.parseUnits('1', 'gwei'),
            type: 0  // Legacy transaction type
        });
        
        console.log('✅ Simple contract deployed at:', simpleContract.address);
        
        // Test interaction
        const receipt = await simpleContract.deployTransaction.wait();
        console.log('Gas used:', receipt.gasUsed.toString());
        console.log('Status:', receipt.status);
        
        // Test contract call
        const ping = await simpleContract.ping();
        console.log('Ping test:', ping);
        
    } catch (error) {
        console.log('❌ Simple contract deployment failed:', error.message);
    }

    // Test 2: Enhanced contract with workarounds
    console.log('\n🧪 Test 2: Enhanced Contract with Gas Workarounds');
    console.log('--------------------------------------------------');
    
    const workarounds = [
        {
            name: 'Ultra Conservative Legacy',
            options: {
                gasLimit: 4000000,
                gasPrice: ethers.utils.parseUnits('1', 'gwei'),
                type: 0
            }
        },
        {
            name: 'High Gas Limit Legacy',
            options: {
                gasLimit: 6000000,
                gasPrice: ethers.utils.parseUnits('0.5', 'gwei'),
                type: 0
            }
        },
        {
            name: 'Maximum Block Gas',
            options: {
                gasLimit: 8000000,  // Close to typical block gas limit
                gasPrice: ethers.utils.parseUnits('0.1', 'gwei'),
                type: 0
            }
        },
        {
            name: 'EIP-1559 with Low Fees',
            options: {
                gasLimit: 3000000,
                maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
                maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei'),
                type: 2
            }
        }
    ];

    const EnhancedContract = await ethers.getContractFactory('EnhancedGaslessGrant');
    const deploymentParams = [
        deployer.address,
        ethers.utils.parseEther('5000'),
        ethers.utils.parseEther('0.01'),
        '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
    ];

    for (const workaround of workarounds) {
        console.log(`\nTrying: ${workaround.name}`);
        console.log(`Options:`, JSON.stringify(workaround.options, null, 2));
        
        try {
            const contract = await EnhancedContract.deploy(...deploymentParams, workaround.options);
            console.log('✅ SUCCESS! Contract deployed at:', contract.address);
            
            const receipt = await contract.deployTransaction.wait();
            console.log('Gas used:', receipt.gasUsed.toString());
            console.log('Effective gas price:', ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei'), 'gwei');
            
            // Test basic functionality
            try {
                const owner = await contract.owner();
                console.log('Owner check:', owner === deployer.address ? '✅' : '❌');
                
                // Get reward amount
                const rewardAmount = await contract.rewardAmount();
                console.log('Reward amount:', ethers.utils.formatEther(rewardAmount), 'MARS');
                
                console.log(`\n🎉 DEPLOYMENT SUCCESSFUL WITH: ${workaround.name}`);
                console.log('Contract address:', contract.address);
                console.log('Transaction hash:', contract.deployTransaction.hash);
                
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

    // Test 3: Try bytecode-only deployment (manual approach)
    console.log('\n🧪 Test 3: Manual Bytecode Deployment');
    console.log('--------------------------------------');
    
    try {
        const contractFactory = await ethers.getContractFactory('EnhancedGaslessGrant');
        const bytecode = contractFactory.bytecode;
        const constructorParams = ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'uint256', 'address'],
            deploymentParams
        );
        const fullBytecode = bytecode + constructorParams.slice(2); // Remove 0x prefix
        
        console.log('Bytecode length:', fullBytecode.length / 2, 'bytes');
        
        const deployTx = await deployer.sendTransaction({
            data: fullBytecode,
            gasLimit: 5000000,
            gasPrice: ethers.utils.parseUnits('1', 'gwei'),
            type: 0
        });
        
        console.log('Manual deployment tx:', deployTx.hash);
        const receipt = await deployTx.wait();
        
        if (receipt.contractAddress) {
            console.log('✅ Manual deployment successful!');
            console.log('Contract address:', receipt.contractAddress);
            console.log('Gas used:', receipt.gasUsed.toString());
        }
        
    } catch (error) {
        console.log('❌ Manual deployment failed:', error.message);
    }

    // Test 4: Network diagnostic
    console.log('\n🔍 Network Diagnostic');
    console.log('----------------------');
    
    try {
        // Get latest block info
        const block = await deployer.provider.getBlock('latest');
        console.log('Block number:', block.number);
        console.log('Block gas limit:', block.gasLimit.toString());
        console.log('Block gas used:', block.gasUsed.toString());
        console.log('Network utilization:', ((block.gasUsed.toNumber() / block.gasLimit.toNumber()) * 100).toFixed(2) + '%');
        
        // Test simple transfer
        const transferTx = await deployer.sendTransaction({
            to: deployer.address,
            value: ethers.utils.parseEther('0.001'),
            gasLimit: 21000,
            gasPrice: ethers.utils.parseUnits('1', 'gwei')
        });
        
        const transferReceipt = await transferTx.wait();
        console.log('Simple transfer test: ✅');
        console.log('Transfer gas used:', transferReceipt.gasUsed.toString());
        
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