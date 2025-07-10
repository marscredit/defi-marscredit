#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkBridgeQueue() {
    const queueFile = path.join(__dirname, '..', 'bridge-queue.json');
    const processedFile = path.join(__dirname, '..', 'processed-transactions.json');
    
    console.log('=== Bridge Queue Status ===');
    
    // Check pending queue
    try {
        if (fs.existsSync(queueFile)) {
            const queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
            console.log(`\n📋 Pending Transactions: ${queueData.length}`);
            
            queueData.forEach((tx, index) => {
                console.log(`  ${index + 1}. ${tx.transactionHash} -> ${tx.recipientAddress}`);
                console.log(`     Amount: ${tx.amount} MARS`);
                console.log(`     Attempts: ${tx.attempts || 0}`);
                console.log(`     Next retry: ${tx.nextRetry ? new Date(tx.nextRetry).toLocaleString() : 'Now'}`);
                console.log(`     Status: ${tx.status || 'pending'}`);
                console.log('');
            });
        } else {
            console.log('\n📋 No pending queue file found');
        }
    } catch (error) {
        console.error('Error reading queue:', error.message);
    }
    
    // Check processed transactions
    try {
        if (fs.existsSync(processedFile)) {
            const processedData = JSON.parse(fs.readFileSync(processedFile, 'utf8'));
            console.log(`\n✅ Processed Transactions: ${processedData.length}`);
            
            // Look for our specific transaction
            const targetTx = processedData.find(tx => 
                tx.transactionHash === '0xe2b66b547dabc12d8df3fea8b05ca747beeffb88f888b79430858a35d9365264' ||
                tx.recipientAddress === '3vk55mgyoNcA2xMtf4GjqBu1SdGUPVut7mBF6SSFKJwL'
            );
            
            if (targetTx) {
                console.log('\n🎯 Found target transaction:');
                console.log(`   Hash: ${targetTx.transactionHash}`);
                console.log(`   Recipient: ${targetTx.recipientAddress}`);
                console.log(`   Amount: ${targetTx.amount} MARS`);
                console.log(`   Processed: ${new Date(targetTx.processedAt).toLocaleString()}`);
                console.log(`   Solana TX: ${targetTx.solanaTransactionHash || 'N/A'}`);
            } else {
                console.log('\n❌ Target transaction not found in processed list');
            }
        } else {
            console.log('\n✅ No processed transactions file found');
        }
    } catch (error) {
        console.error('Error reading processed transactions:', error.message);
    }
}

// Check for specific transaction
function checkForTransaction(txHash) {
    console.log(`\n🔍 Searching for transaction: ${txHash}`);
    
    const files = [
        path.join(__dirname, '..', 'bridge-queue.json'),
        path.join(__dirname, '..', 'processed-transactions.json')
    ];
    
    files.forEach(file => {
        try {
            if (fs.existsSync(file)) {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                const found = data.find(tx => tx.transactionHash === txHash);
                if (found) {
                    console.log(`Found in ${path.basename(file)}:`);
                    console.log(JSON.stringify(found, null, 2));
                }
            }
        } catch (error) {
            console.error(`Error checking ${file}:`, error.message);
        }
    });
}

if (require.main === module) {
    checkBridgeQueue();
    
    // Check for the specific transaction we're looking for
    checkForTransaction('0xe2b66b547dabc12d8df3fea8b05ca747beeffb88f888b79430858a35d9365264');
}

module.exports = { checkBridgeQueue, checkForTransaction }; 