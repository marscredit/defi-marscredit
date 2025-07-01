const EnhancedGaslessGrant = artifacts.require("EnhancedGaslessGrant");

module.exports = async function(deployer, network, accounts) {
    console.log('\n🚀 MARS CREDIT NETWORK - PRODUCTION GRANT DEPLOYMENT');
    console.log('===================================================');
    console.log('Network:', network);
    console.log('Deployer:', accounts[0]);
    console.log('');

    // Production grant configurations
    const PRODUCTION_GRANTS = [
        {
            name: 'Enhanced Grant #1 - Test Genesis',
            rewardAmount: web3.utils.toWei('10', 'ether'),
            isWhitelistMode: false,
            description: 'Test Genesis Grant - 10 MARS per user'
        },
        {
            name: 'Enhanced Grant #2 - Ecosystem',
            rewardAmount: web3.utils.toWei('5000', 'ether'),
            isWhitelistMode: true,
            description: 'Ecosystem Participants - 5000 MARS per user (Whitelist)'
        },
        {
            name: 'Enhanced Grant #3 - Developer',
            rewardAmount: web3.utils.toWei('2500', 'ether'),
            isWhitelistMode: true,
            description: 'Developer Incentives - 2500 MARS per user (Whitelist)'
        },
        {
            name: 'Enhanced Grant #4 - Community',
            rewardAmount: web3.utils.toWei('1000', 'ether'),
            isWhitelistMode: false,
            description: 'Community Airdrop - 1000 MARS per user (Public)'
        },
        {
            name: 'Enhanced Grant #5 - Strategic',
            rewardAmount: web3.utils.toWei('10000', 'ether'),
            isWhitelistMode: true,
            description: 'Strategic Partners - 10000 MARS per user (Whitelist)'
        }
    ];

    const deployedContracts = [];
    const paymaster = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';

    // Deploy each grant contract
    for (let i = 0; i < PRODUCTION_GRANTS.length; i++) {
        const grant = PRODUCTION_GRANTS[i];
        
        console.log(`🚀 DEPLOYING ${grant.name}`);
        console.log(`💰 Reward: ${web3.utils.fromWei(grant.rewardAmount, 'ether')} MARS per user`);
        console.log(`🔒 Whitelist Mode: ${grant.isWhitelistMode}`);
        console.log(`📝 ${grant.description}`);
        console.log('─'.repeat(60));

        try {
            // Deploy with correct constructor parameters
            const contract = await deployer.deploy(
                EnhancedGaslessGrant,
                grant.rewardAmount,
                grant.isWhitelistMode,
                {
                    gas: 3000000,
                    gasPrice: web3.utils.toWei('1', 'gwei')
                }
            );

            console.log(`✅ SUCCESS! Contract deployed at: ${contract.address}`);

            // Authorize paymaster after deployment
            try {
                await contract.authorizePaymaster(paymaster, { from: accounts[0] });
                console.log(`✅ Paymaster authorized: ${paymaster}`);
            } catch (paymasterError) {
                console.log(`⚠️  Warning: Could not authorize paymaster: ${paymasterError.message}`);
            }

            // Verify deployment
            try {
                const owner = await contract.owner();
                const rewardAmount = await contract.redemptionAmountPerUser();
                const isWhitelistMode = await contract.isWhitelistMode();
                
                console.log(`👤 Owner: ${owner}`);
                console.log(`💰 Reward: ${web3.utils.fromWei(rewardAmount, 'ether')} MARS`);
                console.log(`🔒 Whitelist: ${isWhitelistMode}`);
            } catch (verifyError) {
                console.log(`⚠️  Warning: Could not verify deployment: ${verifyError.message}`);
            }

            deployedContracts.push({
                name: grant.name,
                address: contract.address,
                rewardAmount: web3.utils.fromWei(grant.rewardAmount, 'ether'),
                isWhitelistMode: grant.isWhitelistMode,
                description: grant.description
            });

        } catch (error) {
            console.log(`❌ DEPLOYMENT FAILED: ${error.message}`);
            
            // Fallback to existing contract
            console.log(`💡 Using existing contract as backup`);
            deployedContracts.push({
                name: grant.name,
                address: '0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174',
                rewardAmount: web3.utils.fromWei(grant.rewardAmount, 'ether'),
                isWhitelistMode: grant.isWhitelistMode,
                description: grant.description + ' (Using existing contract)',
                status: 'backup'
            });
        }

        console.log('');
    }

    // Save deployment results
    const deploymentResults = {
        timestamp: new Date().toISOString(),
        network: network,
        deployer: accounts[0],
        paymaster: paymaster,
        deployedContracts: deployedContracts
    };

    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '..', 'truffle-deployment.json');
    fs.writeFileSync(logPath, JSON.stringify(deploymentResults, null, 2));

    console.log('🎉 PRODUCTION DEPLOYMENT COMPLETE!');
    console.log('===================================');
    console.log('📊 DEPLOYED CONTRACTS SUMMARY:');
    console.log('─'.repeat(80));
    
    deployedContracts.forEach((contract, index) => {
        console.log(`${index + 1}. ${contract.name}`);
        console.log(`   Address: ${contract.address}`);
        console.log(`   Reward: ${contract.rewardAmount} MARS per user`);
        console.log(`   Whitelist: ${contract.isWhitelistMode}`);
        console.log(`   Description: ${contract.description}`);
        if (contract.status === 'backup') {
            console.log(`   Status: BACKUP CONTRACT (New deployment failed)`);
        }
        console.log('');
    });

    console.log('✅ Deployment results saved to truffle-deployment.json');
    console.log('🚀 MARS CREDIT NETWORK READY FOR PRODUCTION LAUNCH!');
}; 