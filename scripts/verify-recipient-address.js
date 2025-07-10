#!/usr/bin/env node

const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

async function verifyRecipientAddress() {
    console.log('🔍 Verifying Recipient Address');
    console.log('===============================');
    
    const solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
    const marsTokenMint = 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b';
    const recipientAddress = '3vk55mgyoNcA2xMtf4GjqBu1SdGUPVut7mBF6SSFKJwL';
    
    try {
        const connection = new Connection(solanaRpcUrl);
        
        console.log(`🎯 Recipient: ${recipientAddress}`);
        console.log(`🪙 MARS Mint: ${marsTokenMint}`);
        console.log('');
        
        // Verify recipient address is valid
        let recipientPubkey;
        try {
            recipientPubkey = new PublicKey(recipientAddress);
            console.log('✅ Recipient address is valid');
        } catch (error) {
            console.log('❌ Invalid recipient address:', error.message);
            return;
        }
        
        // Verify mint address is valid
        let marsTokenPubkey;
        try {
            marsTokenPubkey = new PublicKey(marsTokenMint);
            console.log('✅ MARS token mint address is valid');
        } catch (error) {
            console.log('❌ Invalid MARS mint address:', error.message);
            return;
        }
        
        // Check if recipient address exists on-chain
        const recipientAccountInfo = await connection.getAccountInfo(recipientPubkey);
        console.log(`📊 Recipient account exists: ${recipientAccountInfo ? 'YES' : 'NO'}`);
        
        if (recipientAccountInfo) {
            console.log(`- Owner: ${recipientAccountInfo.owner.toBase58()}`);
            console.log(`- Lamports: ${recipientAccountInfo.lamports}`);
            console.log(`- Data length: ${recipientAccountInfo.data.length}`);
            
            // Check if this is a token account
            if (recipientAccountInfo.owner.toBase58() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                console.log('⚠️  This is a token account, not a wallet address!');
                console.log('The recipient should be a wallet address, not a token account');
            }
        }
        
        // Calculate the associated token account
        const associatedTokenAccount = await getAssociatedTokenAddress(
            marsTokenPubkey,
            recipientPubkey
        );
        
        console.log('');
        console.log('🔗 Associated Token Account:');
        console.log(`Address: ${associatedTokenAccount.toBase58()}`);
        
        // Check if the associated token account exists
        const tokenAccountInfo = await connection.getAccountInfo(associatedTokenAccount);
        console.log(`Exists: ${tokenAccountInfo ? 'YES' : 'NO'}`);
        
        if (tokenAccountInfo) {
            console.log(`- Owner: ${tokenAccountInfo.owner.toBase58()}`);
            console.log(`- Data length: ${tokenAccountInfo.data.length}`);
            
            // Get token balance
            try {
                const tokenBalance = await connection.getTokenAccountBalance(associatedTokenAccount);
                console.log(`- Balance: ${tokenBalance.value.uiAmount || 0} MARS`);
            } catch (error) {
                console.log(`- Balance check failed: ${error.message}`);
            }
        }
        
        console.log('');
        console.log('🎯 Summary:');
        console.log(`- Recipient wallet: ${recipientAddress}`);
        console.log(`- Token account: ${associatedTokenAccount.toBase58()}`);
        console.log(`- Status: ${tokenAccountInfo ? 'Account exists' : 'Account needs creation'}`);
        
    } catch (error) {
        console.error('❌ Error verifying recipient:', error.message);
    }
}

if (require.main === module) {
    verifyRecipientAddress();
}

module.exports = { verifyRecipientAddress }; 