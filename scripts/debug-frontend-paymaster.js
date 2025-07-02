// Debug script to test paymaster functionality from frontend perspective
// Run this in browser console: copy and paste the entire script

async function debugFrontendPaymaster() {
    console.log('\n🔍 COMPREHENSIVE FRONTEND PAYMASTER DEBUG');
    console.log('==========================================');
    
    // Import the functions we need to test
    const { 
        testPaymasterConnection, 
        debugPaymasterStatus, 
        debugGrantAuthorization, 
        debugUserGaslessEligibility,
        PAYMASTER_CONTRACT_ADDRESS 
    } = await import('/src/lib/grants-registry.ts');
    
    console.log('\n1. 📍 BASIC CONTRACT INFO');
    console.log('========================');
    console.log('Paymaster Address:', PAYMASTER_CONTRACT_ADDRESS);
    
    // Test basic connection
    console.log('\n2. 🧪 TESTING BASIC CONNECTION');
    console.log('==============================');
    const connectionTest = await testPaymasterConnection();
    console.log('Connection Test Result:', connectionTest);
    
    // Test paymaster status
    console.log('\n3. 💰 TESTING PAYMASTER STATUS');
    console.log('==============================');
    const paymasterStatus = await debugPaymasterStatus();
    console.log('Paymaster Status Result:', paymasterStatus);
    
    // Test grant authorization
    console.log('\n4. 🎯 TESTING GRANT AUTHORIZATION');
    console.log('=================================');
    const testGrantAddress = '0xFde59B4b965b6B0A9817F050261244Fe5f99B911';
    const grantAuth = await debugGrantAuthorization(testGrantAddress);
    console.log('Grant Authorization Result:', grantAuth);
    
    // Test user eligibility (use current wallet address)
    console.log('\n5. 👤 TESTING USER ELIGIBILITY');
    console.log('==============================');
    let userAddress = '0x21b1B2e1452312DF2D284fe4bf26366a7b2BcaaB'; // Default test address
    
    // Try to get current wallet address if available
    if (typeof window !== 'undefined' && window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                userAddress = accounts[0];
                console.log('Using connected wallet address:', userAddress);
            }
        } catch (error) {
            console.log('Could not get wallet address, using default:', userAddress);
        }
    }
    
    const userEligibility = await debugUserGaslessEligibility(userAddress);
    console.log('User Eligibility Result:', userEligibility);
    
    // Summary
    console.log('\n📋 SUMMARY');
    console.log('==========');
    console.log('✅ Connection Test:', connectionTest.success ? 'PASS' : 'FAIL');
    console.log('✅ Paymaster Status:', paymasterStatus.error ? 'FAIL' : 'PASS');
    console.log('✅ Grant Authorization:', grantAuth.error ? 'FAIL' : 'PASS');
    console.log('✅ User Eligibility:', userEligibility.error ? 'FAIL' : 'PASS');
    
    if (connectionTest.success && !paymasterStatus.error && !grantAuth.error && !userEligibility.error) {
        console.log('🎉 ALL TESTS PASSED! Gasless should work.');
    } else {
        console.log('❌ SOME TESTS FAILED. Check errors above.');
    }
    
    return {
        connection: connectionTest,
        paymaster: paymasterStatus,
        authorization: grantAuth,
        eligibility: userEligibility
    };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    console.log('🚀 Starting frontend paymaster debug...');
    debugFrontendPaymaster().catch(console.error);
} else {
    console.log('📝 Copy and paste this entire script into browser console to run');
} 