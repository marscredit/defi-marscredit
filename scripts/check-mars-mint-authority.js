#!/usr/bin/env node

const { Connection, PublicKey } = require('@solana/web3.js');
const { getMint } = require('@solana/spl-token');

async function checkMarsMintAuthority() {
    console.log('🔍 Checking MARS Token Mint Authority');
    console.log('====================================');
    
    const solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
    const marsTokenMint = 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b';
    const relayerWallet = 'Dn1KtSuW3reCNBVHPq7Wxubhqwr7dqa5kijVaLiQUF5k';
    
    try {
        const connection = new Connection(solanaRpcUrl);
        const marsTokenPubkey = new PublicKey(marsTokenMint);
        
        console.log(`🪙 MARS Token Mint: ${marsTokenMint}`);
        console.log(`🔑 Relayer Wallet: ${relayerWallet}`);
        console.log('');
        
        // Get mint info
        const mintInfo = await getMint(connection, marsTokenPubkey);
        
        console.log('📊 Mint Information:');
        console.log(`- Decimals: ${mintInfo.decimals}`);
        console.log(`- Supply: ${mintInfo.supply.toString()}`);
        console.log(`- Mint Authority: ${mintInfo.mintAuthority ? mintInfo.mintAuthority.toBase58() : 'NONE'}`);
        console.log(`- Freeze Authority: ${mintInfo.freezeAuthority ? mintInfo.freezeAuthority.toBase58() : 'NONE'}`);
        console.log('');
        
        // Check if relayer is the mint authority
        if (mintInfo.mintAuthority) {
            const isRelayerMintAuthority = mintInfo.mintAuthority.toBase58() === relayerWallet;
            console.log(`🔐 Is relayer the mint authority? ${isRelayerMintAuthority ? '✅ YES' : '❌ NO'}`);
            
            if (!isRelayerMintAuthority) {
                console.log('');
                console.log('⚠️  PROBLEM IDENTIFIED:');
                console.log('The relayer wallet is not the mint authority for the MARS token!');
                console.log('');
                console.log('💡 SOLUTIONS:');
                console.log('1. Transfer mint authority to the relayer wallet');
                console.log('2. Or use a different approach (transfer from a funded account)');
                console.log('3. Or update the bridge to use the correct mint authority');
                console.log('');
                console.log('🔧 Current mint authority:', mintInfo.mintAuthority.toBase58());
                console.log('🔧 Expected mint authority:', relayerWallet);
            }
        } else {
            console.log('❌ No mint authority found - minting is disabled!');
        }
        
        // Check if we can use a different approach
        console.log('');
        console.log('🔄 Alternative Approach:');
        console.log('Instead of minting, we could transfer from a pre-funded account');
        console.log('This would require:');
        console.log('1. A treasury account with sufficient MARS tokens');
        console.log('2. The relayer having authority to transfer from treasury');
        
    } catch (error) {
        console.error('❌ Error checking mint authority:', error.message);
    }
}

if (require.main === module) {
    checkMarsMintAuthority();
}

module.exports = { checkMarsMintAuthority }; 