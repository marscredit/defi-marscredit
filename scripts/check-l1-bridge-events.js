#!/usr/bin/env node

const { ethers } = require('ethers');

async function checkL1BridgeEvents() {
    // Mars Credit Network configuration
    const l1RpcUrl = 'https://rpc.marscredit.xyz';
    const bridgeContractAddress = '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba';
    
    console.log('🔍 Checking L1 Bridge Contract Events...');
    console.log(`RPC: ${l1RpcUrl}`);
    console.log(`Contract: ${bridgeContractAddress}`);
    console.log('');
    
    // Bridge contract ABI - only the events we need
    const bridgeABI = [
        'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
        'event TokensUnlocked(address indexed recipient, uint256 amount, bytes32 indexed solanaTxId, uint256 indexed bridgeId)',
        'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
    ];
    
    try {
        const provider = new ethers.JsonRpcProvider(l1RpcUrl);
        const bridgeContract = new ethers.Contract(bridgeContractAddress, bridgeABI, provider);
        
        // Get current block number
        const currentBlock = await provider.getBlockNumber();
        console.log(`📊 Current block: ${currentBlock}`);
        
        // Check for TokensLocked events (deposits)
        console.log('\n🔒 Checking TokensLocked events...');
        const fromBlock = Math.max(0, currentBlock - 10000); // Check last 10,000 blocks
        
        const lockedEvents = await bridgeContract.queryFilter(
            bridgeContract.filters.TokensLocked(),
            fromBlock,
            currentBlock
        );
        
        console.log(`Found ${lockedEvents.length} TokensLocked events:`);
        
        let targetTransactionFound = false;
        
        lockedEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. Transaction: ${event.transactionHash}`);
            console.log(`   User: ${event.args.user}`);
            console.log(`   Amount: ${ethers.formatEther(event.args.amount)} MARS`);
            console.log(`   Solana Recipient: ${event.args.solanaRecipient}`);
            console.log(`   Bridge ID: ${event.args.bridgeId}`);
            console.log(`   Block: ${event.blockNumber}`);
            
            // Check if this is our target transaction
            if (event.transactionHash === '0xe2b66b547dabc12d8df3fea8b05ca747beeffb88f888b79430858a35d9365264') {
                console.log('   🎯 THIS IS THE TARGET TRANSACTION!');
                targetTransactionFound = true;
            }
        });
        
        if (!targetTransactionFound) {
            console.log('\n❌ Target transaction not found in TokensLocked events');
            console.log('   This suggests the transaction may not have been properly recorded');
        }
        
        // Check for TokensUnlocked events (withdrawals)
        console.log('\n🔓 Checking TokensUnlocked events...');
        const unlockedEvents = await bridgeContract.queryFilter(
            bridgeContract.filters.TokensUnlocked(),
            fromBlock,
            currentBlock
        );
        
        console.log(`Found ${unlockedEvents.length} TokensUnlocked events:`);
        
        unlockedEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. Transaction: ${event.transactionHash}`);
            console.log(`   Recipient: ${event.args.recipient}`);
            console.log(`   Amount: ${ethers.formatEther(event.args.amount)} MARS`);
            console.log(`   Solana TX ID: ${event.args.solanaTxId}`);
            console.log(`   Bridge ID: ${event.args.bridgeId}`);
            console.log(`   Block: ${event.blockNumber}`);
        });
        
        // Get bridge statistics
        console.log('\n📊 Bridge Statistics:');
        try {
            const stats = await bridgeContract.getBridgeStats();
            console.log(`   Total Locked: ${ethers.formatEther(stats[0])} MARS`);
            console.log(`   Total Unlocked: ${ethers.formatEther(stats[1])} MARS`);
            console.log(`   Total Deposits: ${stats[2]}`);
            console.log(`   Total Withdrawals: ${stats[3]}`);
            console.log(`   Next Bridge ID: ${stats[4]}`);
            console.log(`   Contract Balance: ${ethers.formatEther(stats[5])} MARS`);
        } catch (error) {
            console.log('   ⚠️  Could not fetch bridge statistics:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error checking L1 bridge:', error.message);
    }
}

if (require.main === module) {
    checkL1BridgeEvents();
}

module.exports = { checkL1BridgeEvents }; 