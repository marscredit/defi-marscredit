#!/usr/bin/env node

const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

async function checkMarsBalance(walletAddress) {
    console.log(`Checking MARS balance for address: ${walletAddress}`);
    
    // Use environment variable or default to mainnet
    const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(solanaRpcUrl);
    
    // MARS token mint address from environment or default
    const marsTokenMint = process.env.MARS_MINT_ADDRESS || 'CuJbYgGkJTseLUhGCjHqD1kN7TxHkRhCqQmWTjGfxGCp';
    
    try {
        const walletPubkey = new PublicKey(walletAddress);
        const marsTokenPubkey = new PublicKey(marsTokenMint);
        
        // Get the associated token account address
        const associatedTokenAccount = await getAssociatedTokenAddress(
            marsTokenPubkey,
            walletPubkey
        );
        
        console.log(`Associated token account: ${associatedTokenAccount.toBase58()}`);
        
        // Check if the account exists and get balance
        const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
        
        if (!accountInfo) {
            console.log('❌ No MARS token account found for this address');
            return 0;
        }
        
        // Get token account balance
        const tokenBalance = await connection.getTokenAccountBalance(associatedTokenAccount);
        
        console.log(`✅ MARS Token Balance: ${tokenBalance.value.uiAmount || 0} MARS`);
        console.log(`Raw amount: ${tokenBalance.value.amount}`);
        console.log(`Decimals: ${tokenBalance.value.decimals}`);
        
        return tokenBalance.value.uiAmount || 0;
        
    } catch (error) {
        console.error('Error checking balance:', error.message);
        return 0;
    }
}

// If run directly, check the specific address
if (require.main === module) {
    const addressToCheck = process.argv[2] || '3vk55mgyoNcA2xMtf4GjqBu1SdGUPVut7mBF6SSFKJwL';
    checkMarsBalance(addressToCheck);
}

module.exports = { checkMarsBalance }; 