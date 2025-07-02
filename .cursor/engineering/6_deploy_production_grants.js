const EnhancedGaslessGrant = artifacts.require("EnhancedGaslessGrant");
const EnhancedTokenGrant = artifacts.require("EnhancedTokenGrant");

module.exports = async function(deployer, network, accounts) {
    console.log('\n🚀 MARS CREDIT NETWORK - PRODUCTION GRANT DEPLOYMENT');
    console.log('===================================================');
    console.log('Network:', network);
    console.log('Deployer:', accounts[0]);
    console.log('');

    // Production grant configurations
    const PRODUCTION_GRANTS = [
        {
            name: 'Intract Campaign Reward Distribution',
            rewardAmount: web3.utils.toWei('500', 'ether'), // 500 MARS per user
            isWhitelistMode: false, // Open to all (will enable whitelist later for top 10,000)
            contractType: 'enhanced-gasless',
            description: 'A targeted incentive program rewarding the top 10,000 participants of the Intract campaign. Each qualifying address will receive 500 MARS tokens, totaling 5,000,000 MARS in distribution. This grant aims to recognize community engagement and drive awareness of Mars Credit through the Intract platform.'
        },
        {
            name: 'CoinGecko Listing Bounty',
            rewardAmount: web3.utils.toWei('1000000', 'ether'), // 1,000,000 MARS per redemption
            isWhitelistMode: true, // Whitelist only
            contractType: 'enhanced',
            description: 'A 1,000,000 MARS token grant allocated to secure Mars Credit\'s official listing on CoinGecko. This strategic listing will enhance visibility and legitimacy across the crypto community, making token information publicly accessible to millions of CoinGecko users.'
        },
        {
            name: 'CoinMarketCap Listing Bounty',
            rewardAmount: web3.utils.toWei('1000000', 'ether'), // 1,000,000 MARS per redemption
            isWhitelistMode: true, // Whitelist only
            contractType: 'enhanced',
            description: 'A 1,000,000 MARS reward grant dedicated to achieving a successful listing of Mars Credit on CoinMarketCap. This listing is crucial for driving traffic, increasing discoverability, and enabling global price tracking, ultimately boosting investor confidence and transparency.'
        },
        {
            name: 'Mining Pool Integration Grant',
            rewardAmount: web3.utils.toWei('2500000', 'ether'), // 2,500,000 MARS per redemption
            isWhitelistMode: true, // Whitelist only
            contractType: 'enhanced',
            description: 'A 2,500,000 MARS grant to incentivize integration of Mars Credit into established mining pools. By supporting this listing, Mars aims to expand mining capacity, improve network stability, and attract more miners, enhancing decentralization and hash power availability.'
        },
        {
            name: 'Early Supporter Faucet',
            rewardAmount: web3.utils.toWei('25', 'ether'), // 25 MARS per user
            isWhitelistMode: false, // Open to all
            contractType: 'enhanced',
            description: 'A 10,000,000 MARS grant to incentivize early supporters to deploy smart contract. Each wallet is eligible for 25 MARS.'
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
        console.log(`🔧 Contract Type: ${grant.contractType}`);
        console.log(`📝 ${grant.description.substring(0, 100)}...`);
        console.log('─'.repeat(60));

        try {
            let contract;
            
            if (grant.contractType === 'enhanced-gasless') {
                // Deploy EnhancedGaslessGrant (for Intract campaign)
                contract = await deployer.deploy(
                    EnhancedGaslessGrant,
                    grant.rewardAmount,     // redemptionAmountPerUser
                    grant.isWhitelistMode,  // isWhitelistMode
                    {
                        gas: 3000000,
                        gasPrice: web3.utils.toWei('0.1', 'gwei')
                    }
                );
                
                // Authorize paymaster for gasless functionality
                try {
                    await contract.authorizePaymaster(paymaster, { from: accounts[0] });
                    console.log(`✅ Paymaster authorized: ${paymaster}`);
                } catch (paymasterError) {
                    console.log(`⚠️  Warning: Could not authorize paymaster: ${paymasterError.message}`);
                }
                
            } else {
                // Deploy EnhancedTokenGrant (for other grants)
                contract = await deployer.deploy(
                    EnhancedTokenGrant,
                    grant.rewardAmount,     // redemptionAmountPerUser
                    grant.isWhitelistMode,  // isWhitelistMode
                    {
                        gas: 3000000,
                        gasPrice: web3.utils.toWei('0.1', 'gwei')
                    }
                );
            }

            console.log(`✅ SUCCESS! ${grant.contractType} contract deployed at: ${contract.address}`);

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
                contractType: grant.contractType,
                description: grant.description
            });

        } catch (error) {
            console.log(`❌ DEPLOYMENT FAILED: ${error.message}`);
            console.log(`💡 Skipping this grant and continuing...`);
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
    const logPath = path.join(__dirname, '..', 'production-deployment-final.json');
    fs.writeFileSync(logPath, JSON.stringify(deploymentResults, null, 2));

    console.log('🎉 PRODUCTION DEPLOYMENT COMPLETE!');
    console.log('===================================');
    console.log('📊 DEPLOYED CONTRACTS SUMMARY:');
    console.log('─'.repeat(80));
    
    deployedContracts.forEach((contract, index) => {
        console.log(`${index + 1}. ${contract.name}`);
        console.log(`   📍 Address: ${contract.address}`);
        console.log(`   🔧 Type: ${contract.contractType}`);
        console.log(`   💰 Reward: ${contract.rewardAmount} MARS per user`);
        console.log(`   🔒 Whitelist: ${contract.isWhitelistMode}`);
        console.log('');
    });

    console.log('✅ Deployment results saved to production-deployment-final.json');
    
    // Generate grants registry configuration
    console.log('\n📝 GRANTS REGISTRY CONFIGURATION');
    console.log('=================================');
    console.log('Copy this into your grants-registry.ts file:');
    console.log('');
    
    const registryConfig = deployedContracts.map((contract, index) => {
        const grantIds = [
            'intract-campaign-winners',
            'coingecko-listing-bounty', 
            'coinmarketcap-listing-bounty',
            'mining-pool-integration',
            'early-supporter-faucet'
        ];
        
        const categories = ['community', 'special', 'special', 'developer', 'genesis'];
        
        return `  {
    id: '${grantIds[index]}',
    name: '${contract.name}',
    description: '${contract.description}',
    contractAddress: '${contract.address}' as \`0x\${string}\`,
    deployedAt: '${new Date().toISOString()}',
    category: '${categories[index]}',
    isActive: true,
    contractType: '${contract.contractType}',
    isWhitelistOnly: ${contract.isWhitelistMode}
  }`
    }).join(',\n');
    
    console.log(`export const GRANTS_REGISTRY: GrantConfig[] = [
${registryConfig}
]`);
    
    console.log('\n🚀 MARS CREDIT NETWORK READY FOR PRODUCTION LAUNCH!');
}; 