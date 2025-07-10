const MarsBridge = artifacts.require("MarsBridge");
const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network, accounts) {
    console.log('\n🌉 MARS BRIDGE DEPLOYMENT');
    console.log('=========================');
    console.log('Network:', network);
    console.log('Deployer:', accounts[0]);
    console.log('Chain ID:', network === 'marscredit' ? 110110 : 'development');
    console.log('');

    try {
        // Deploy the Mars Bridge contract
        console.log('🚀 Deploying Mars Bridge Contract...');
        await deployer.deploy(MarsBridge, {
            from: accounts[0],
            gas: 3000000,
            gasPrice: network === 'marscredit' ? 100000000 : 20000000000 // 0.1 gwei for Mars Credit Network
        });

        const bridgeInstance = await MarsBridge.deployed();
        console.log('✅ Mars Bridge deployed at:', bridgeInstance.address);
        
        // Get initial bridge configuration
        const stats = await bridgeInstance.getBridgeStats();
        console.log('\n📊 Initial Bridge Configuration:');
        console.log('Min Bridge Amount:', web3.utils.fromWei(stats.minAmount, 'ether'), 'MARS');
        console.log('Max Bridge Amount:', web3.utils.fromWei(stats.maxAmount, 'ether'), 'MARS');
        console.log('Bridge Fee:', (stats.feePercentage / 100).toFixed(2) + '%');
        console.log('Contract Balance:', web3.utils.fromWei(stats.contractBalance, 'ether'), 'MARS');
        console.log('Total Locked:', web3.utils.fromWei(stats.totalLocked, 'ether'), 'MARS');
        console.log('Bridge Count:', stats.bridgeCount.toString());
        
        // Save deployment info for frontend
        const deploymentInfo = {
            bridgeContract: bridgeInstance.address,
            network: network,
            chainId: network === 'marscredit' ? 110110 : 'development',
            deployedAt: new Date().toISOString(),
            deployer: accounts[0],
            minBridgeAmount: stats.minAmount.toString(),
            maxBridgeAmount: stats.maxAmount.toString(),
            bridgeFeePercentage: stats.feePercentage.toString(),
            gasUsed: bridgeInstance.constructor.class_defaults.gas || 'N/A'
        };
        
        // Save to src/contracts for frontend integration
        const contractsDir = path.join(__dirname, '..', 'src', 'contracts');
        if (!fs.existsSync(contractsDir)) {
            fs.mkdirSync(contractsDir, { recursive: true });
        }
        
        const deploymentPath = path.join(contractsDir, 'bridge-deployment.json');
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        
        console.log('\n✅ Deployment info saved to:', deploymentPath);
        
        console.log('\n🔧 NEXT STEPS:');
        console.log('1. Add relayer address: bridgeInstance.addRelayer(relayerAddress)');
        console.log('2. Fund bridge for unlock operations if needed');
        console.log('3. Configure Solana program with this bridge address');
        console.log('4. Start relayer service');
        console.log('5. Test bridge operations');
        
        console.log('\n📋 ENVIRONMENT VARIABLES FOR PRODUCTION:');
        console.log(`BRIDGE_CONTRACT_ADDRESS=${bridgeInstance.address}`);
        console.log(`MARS_MINT_ADDRESS=5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs`);
        console.log(`RPC_URL=https://rpc.marscredit.xyz:443`);
        console.log(`CHAIN_ID=110110`);
        
        return bridgeInstance;
        
    } catch (error) {
        console.error('❌ Bridge deployment failed:', error);
        throw error;
    }
}; 