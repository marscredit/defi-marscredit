const EnhancedGaslessGrant = artifacts.require("EnhancedGaslessGrant");

module.exports = async function(deployer, network, accounts) {
    console.log('\n🚀 DEPLOYING MISSING INTRACT CAMPAIGN WINNERS GRANT');
    console.log('===================================================');
    console.log('Network:', network);
    console.log('Deployer:', accounts[0]);
    console.log('');

    const paymaster = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4';
    
    console.log('🚀 DEPLOYING Intract Campaign Reward Distribution');
    console.log('💰 Reward: 500 MARS per user');
    console.log('🔒 Whitelist Mode: false (open to all)');
    console.log('🔧 Contract Type: enhanced-gasless');
    console.log('📝 Gasless redemption for Intract campaign participants');
    console.log('─'.repeat(60));

    try {
        // Deploy EnhancedGaslessGrant
        const contract = await deployer.deploy(
            EnhancedGaslessGrant,
            web3.utils.toWei('500', 'ether'),  // 500 MARS per user
            false,                             // Not whitelist mode initially
            {
                gas: 3000000,
                gasPrice: web3.utils.toWei('0.1', 'gwei')
            }
        );

        console.log(`✅ SUCCESS! enhanced-gasless contract deployed at: ${contract.address}`);

        // Authorize paymaster for gasless functionality
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

        console.log('\n🎉 INTRACT GRANT DEPLOYED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('📍 Contract Address:', contract.address);
        console.log('🔧 Type: enhanced-gasless');
        console.log('💰 Reward: 500 MARS per user');
        console.log('🔒 Whitelist: false (open to all)');
        console.log('⚡ Gasless: enabled');
        
        console.log('\nAdd this to your grants registry:');
        console.log(`{
    id: 'intract-campaign-winners',
    name: 'Intract Campaign Reward Distribution',
    description: 'A targeted incentive program rewarding the top 10,000 participants of the Intract campaign. Each qualifying address will receive 500 MARS tokens, totaling 5,000,000 MARS in distribution. This grant aims to recognize community engagement and drive awareness of Mars Credit through the Intract platform.',
    contractAddress: '${contract.address}' as \`0x\${string}\`,
    deployedAt: '${new Date().toISOString()}',
    category: 'community',
    isActive: true,
    contractType: 'enhanced-gasless',
    isWhitelistOnly: false
},`);

    } catch (error) {
        console.log(`❌ DEPLOYMENT FAILED: ${error.message}`);
        console.log('📋 Error details:', error);
    }
}; 