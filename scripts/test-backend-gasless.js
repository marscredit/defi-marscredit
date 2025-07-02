// Import fetch dynamically for compatibility
let fetch;

async function loadFetch() {
  if (!fetch) {
    // Try to use global fetch first (Node 18+)
    if (typeof globalThis.fetch !== 'undefined') {
      fetch = globalThis.fetch;
    } else {
      // Fallback to node-fetch
      const nodeFetch = await import('node-fetch');
      fetch = nodeFetch.default;
    }
  }
  return fetch;
}

// Test configuration
const TEST_CONFIG = {
  apiUrl: 'http://localhost:3000/api/gasless-redeem',
  userAddress: '0x21b1B2e1452312DF2D284fe4bf26366a7b2BcaaB', // Your wallet address from the screenshot
  grantAddress: '0xFde59B4b965b6B0A9817F050261244Fe5f99B911' // Enhanced Test Genesis Grant
};

async function testBackendGaslessRedemption() {
  console.log('🧪 TESTING BACKEND GASLESS REDEMPTION API');
  console.log('==========================================');
  console.log('🌐 API URL:', TEST_CONFIG.apiUrl);
  console.log('👤 Test User:', TEST_CONFIG.userAddress);
  console.log('🎯 Grant Address:', TEST_CONFIG.grantAddress);

  try {
    // Load fetch first
    await loadFetch();
    
    console.log('\n📡 Sending gasless redemption request...');
    
    const response = await fetch(TEST_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: TEST_CONFIG.userAddress,
        grantAddress: TEST_CONFIG.grantAddress
      })
    });

    const result = await response.json();

    console.log('\n📋 RESPONSE:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS! Gasless redemption completed:');
      console.log('📝 Transaction Hash:', result.transactionHash);
      console.log('⛽ Gas Used:', result.gasUsed);
      console.log('👤 User Address:', result.userAddress);
      console.log('🎯 Grant Address:', result.grantAddress);
      console.log('💰 Gas paid by backend wallet (user paid $0!)');
      
      console.log('\n🔗 Block Explorer Link:');
      console.log(`https://blockscan.marscredit.xyz/tx/${result.transactionHash}`);
      
    } else {
      console.log('\n❌ ERROR:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
      
      // Handle common errors
      if (result.error?.includes('already redeemed')) {
        console.log('\n💡 This is expected if user already redeemed.');
        console.log('Try with a different userAddress that hasn\'t redeemed yet.');
      } else if (result.error?.includes('rate limited')) {
        console.log('\n💡 User is rate limited (must wait ~4 hours between gasless transactions).');
      } else if (result.error?.includes('not authorized')) {
        console.log('\n💡 Grant contract needs to be authorized with paymaster.');
      }
    }

  } catch (error) {
    console.error('\n❌ NETWORK ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your Next.js dev server is running:');
      console.log('   npm run dev');
      console.log('   Then try this test again.');
    }
  }
}

async function testMultipleScenarios() {
  console.log('\n🔄 TESTING MULTIPLE SCENARIOS');
  console.log('==============================');

  // Test 1: Valid redemption
  console.log('\n1️⃣ Testing valid redemption...');
  await testBackendGaslessRedemption();

  // Test 2: Invalid user address
  console.log('\n2️⃣ Testing invalid user address...');
  const invalidUserTest = {
    ...TEST_CONFIG,
    userAddress: 'invalid-address'
  };
  
  try {
    await loadFetch();
    const response = await fetch(TEST_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidUserTest)
    });
    const result = await response.json();
    console.log('Result:', result.error || 'Unexpected success');
  } catch (error) {
    console.log('Error (expected):', error.message);
  }

  // Test 3: Missing parameters
  console.log('\n3️⃣ Testing missing parameters...');
  try {
    await loadFetch();
    const response = await fetch(TEST_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress: TEST_CONFIG.userAddress })
    });
    const result = await response.json();
    console.log('Result:', result.error || 'Unexpected success');
  } catch (error) {
    console.log('Error (expected):', error.message);
  }

  // Test 4: Wrong HTTP method
  console.log('\n4️⃣ Testing wrong HTTP method...');
  try {
    await loadFetch();
    const response = await fetch(TEST_CONFIG.apiUrl, { method: 'GET' });
    const result = await response.json();
    console.log('Result:', result.error || 'Unexpected success');
  } catch (error) {
    console.log('Error (expected):', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting backend gasless redemption tests...\n');
  
  // Check if we should run comprehensive tests
  const runAll = process.argv.includes('--all');
  
  if (runAll) {
    testMultipleScenarios().catch(console.error);
  } else {
    testBackendGaslessRedemption().catch(console.error);
  }
}

module.exports = { testBackendGaslessRedemption }; 