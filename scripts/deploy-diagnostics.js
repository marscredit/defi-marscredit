const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('\n🔧 Mars Credit Network - Deployment Diagnostics Script');
    console.log('=====================================================\n');

    const [deployer] = await ethers.getSigners();
    console.log('Deployer address:', deployer.address);
    
    // Check balance
    const balance = await deployer.getBalance();
    console.log('Balance:', ethers.utils.formatEther(balance), 'MARS');
    
    if (balance.lt(ethers.utils.parseEther('1'))) {
        console.log('❌ ERROR: Insufficient balance for deployment');
        return;
    }

    // Read and compile contract
    const contractPath = path.join(__dirname, '..', 'contracts', 'EnhancedGaslessGrant.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');
    console.log('Contract size:', contractSource.length, 'characters');
    
    // Estimate deployment gas using multiple methods
    console.log('\n📊 Gas Estimation Analysis:');
    console.log('-----------------------------');
    
    try {
        // Method 1: Standard estimation
        const ContractFactory = await ethers.getContractFactory('EnhancedGaslessGrant');
        const estimatedGas = await ContractFactory.signer.provider.estimateGas({
            data: ContractFactory.bytecode
        });
        console.log('Standard estimation:', estimatedGas.toString(), 'gas');
        
        // Method 2: Manual calculation (bytecode size * 200 + 32000 base)
        const bytecodeSize = ContractFactory.bytecode.length / 2 - 1; // Remove 0x prefix
        const manualEstimate = bytecodeSize * 200 + 32000;
        console.log('Manual estimate:', manualEstimate, 'gas');
        
        // Method 3: Conservative estimate
        const conservativeEstimate = Math.max(estimatedGas.toNumber(), manualEstimate) * 1.5;
        console.log('Conservative estimate:', Math.floor(conservativeEstimate), 'gas');
        
    } catch (error) {
        console.log('❌ Gas estimation failed:', error.message);
    }

    // Deployment Strategy Tests
    console.log('\n🚀 Deployment Strategy Tests:');
    console.log('-------------------------------');
    
    // Strategy 1: Legacy transaction with manual gas
    await testDeploymentStrategy('Legacy Transaction (Manual Gas)', async () => {
        const ContractFactory = await ethers.getContractFactory('EnhancedGaslessGrant');
        
        const deploymentParams = [
            deployer.address,           // owner
            ethers.utils.parseEther('5000'), // reward amount
            ethers.utils.parseEther('0.01'), // gas allowance
            '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4' // paymaster
        ];
        
        const contract = await ContractFactory.deploy(...deploymentParams, {
            gasLimit: 3000000, // Fixed high gas limit
            gasPrice: ethers.utils.parseUnits('1', 'gwei'), // Low gas price
            type: 0 // Legacy transaction type
        });
        
        return contract;
    });
    
    // Strategy 2: EIP-1559 transaction with maxFeePerGas
    await testDeploymentStrategy('EIP-1559 Transaction', async () => {
        const ContractFactory = await ethers.getContractFactory('EnhancedGaslessGrant');
        
        const deploymentParams = [
            deployer.address,
            ethers.utils.parseEther('5000'),
            ethers.utils.parseEther('0.01'),
            '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
        ];
        
        const contract = await ContractFactory.deploy(...deploymentParams, {
            gasLimit: 2500000,
            maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('1', 'gwei'),
            type: 2 // EIP-1559 transaction
        });
        
        return contract;
    });
    
    // Strategy 3: Incremental gas approach
    await testDeploymentStrategy('Incremental Gas Approach', async () => {
        const ContractFactory = await ethers.getContractFactory('EnhancedGaslessGrant');
        
        const deploymentParams = [
            deployer.address,
            ethers.utils.parseEther('5000'),
            ethers.utils.parseEther('0.01'),
            '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
        ];
        
        // Try different gas limits starting from low
        const gasLimits = [1000000, 1500000, 2000000, 2500000, 3000000];
        
        for (const gasLimit of gasLimits) {
            try {
                console.log(`  Trying gas limit: ${gasLimit}`);
                const contract = await ContractFactory.deploy(...deploymentParams, {
                    gasLimit: gasLimit,
                    gasPrice: ethers.utils.parseUnits('1', 'gwei'),
                    type: 0
                });
                console.log(`  ✅ Success with gas limit: ${gasLimit}`);
                return contract;
            } catch (error) {
                console.log(`  ❌ Failed with gas limit ${gasLimit}: ${error.message.substring(0, 100)}`);
            }
        }
        
        throw new Error('All gas limit attempts failed');
    });
    
    // Strategy 4: Split deployment (CREATE2 or factory pattern)
    await testDeploymentStrategy('Factory Pattern Deployment', async () => {
        // Deploy a simple factory first, then use it to deploy the main contract
        console.log('  This would require implementing a factory contract...');
        throw new Error('Factory pattern not implemented yet');
    });
    
    console.log('\n🔍 Network Analysis:');
    console.log('---------------------');
    
    // Check latest block and gas usage
    const latestBlock = await deployer.provider.getBlock('latest');
    console.log('Latest block number:', latestBlock.number);
    console.log('Block gas limit:', latestBlock.gasLimit.toString());
    console.log('Block gas used:', latestBlock.gasUsed.toString());
    console.log('Gas utilization:', ((latestBlock.gasUsed.toNumber() / latestBlock.gasLimit.toNumber()) * 100).toFixed(2) + '%');
    
    // Test basic transaction
    console.log('\n🧪 Basic Transaction Test:');
    console.log('---------------------------');
    
    try {
        const testTx = await deployer.sendTransaction({
            to: deployer.address,
            value: ethers.utils.parseEther('0.001'),
            gasLimit: 21000,
            gasPrice: ethers.utils.parseUnits('1', 'gwei')
        });
        
        console.log('Test transaction hash:', testTx.hash);
        const receipt = await testTx.wait();
        console.log('✅ Basic transaction successful');
        console.log('Gas used:', receipt.gasUsed.toString());
        console.log('Status:', receipt.status);
        
    } catch (error) {
        console.log('❌ Basic transaction failed:', error.message);
    }
    
    console.log('\n📋 Recommendations:');
    console.log('--------------------');
    console.log('1. Try deploying with legacy transaction type (type: 0)');
    console.log('2. Use conservative gas limits (2.5M - 3M gas)');
    console.log('3. Use low gas prices (1-2 gwei) to avoid priority issues');
    console.log('4. Consider splitting contract into smaller modules');
    console.log('5. If all fails, coordinate with network maintainers for gas limit increases');
}

async function testDeploymentStrategy(strategyName, deployFunction) {
    console.log(`\n🔄 Testing: ${strategyName}`);
    
    try {
        const startTime = Date.now();
        const contract = await deployFunction();
        const endTime = Date.now();
        
        if (contract && contract.address) {
            console.log(`✅ Success! Contract deployed at: ${contract.address}`);
            console.log(`   Deployment time: ${endTime - startTime}ms`);
            
            // Test basic contract interaction
            try {
                const owner = await contract.owner();
                console.log(`   Contract owner: ${owner}`);
            } catch (error) {
                console.log(`   ⚠️  Warning: Contract interaction failed: ${error.message}`);
            }
            
            return contract;
        } else {
            console.log('❌ Deployment returned invalid contract');
        }
    } catch (error) {
        console.log(`❌ Strategy failed: ${error.message}`);
        
        // Parse error for additional insights
        if (error.message.includes('gas')) {
            console.log('   💡 Gas-related error detected');
        }
        if (error.message.includes('revert')) {
            console.log('   💡 Transaction reverted - check contract logic');
        }
        if (error.message.includes('timeout')) {
            console.log('   💡 Timeout - network congestion or node issues');
        }
    }
    
    return null;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    }); 