#!/usr/bin/env node

const { createPublicClient, http, toHex, keccak256, encodePacked } = require('viem')

// Mars Credit Network configuration
const marsCreditNetwork = {
  id: 110110,
  name: 'Mars Credit Network',
  rpcUrls: {
    default: { http: ['https://rpc.marscredit.xyz'] }
  }
}

// Contract addresses
const CONTRACTS = {
  simpleTokenGrant: '0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174',
  gaslessGrant: '0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6',
  paymaster: '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
}

// Common function signatures to test
const COMMON_FUNCTIONS = {
  'owner()': '0x8da5cb5b',
  'balance()': '0xb69ef8a8',
  'getBalance()': '0x12065fe0',
  'rewardPerUser()': '0x7c3a00fd',
  'totalUsers()': '0xa3f4df7e',
  'hasRedeemed(address)': '0x0b9bcafe',
  'balanceOf(address)': '0x70a08231',
  'totalSponsored()': '0x6c3b9c20',
  'rateLimit()': '0xa3f8eadb',
  'authorizedGrants(address)': '0x8e5c7f7b',
  'canUseGasless(address)': '0x1234abcd', // placeholder
  'paused()': '0x5c975abb',
  'isPaused()': '0xb187bd26'
}

const client = createPublicClient({
  chain: marsCreditNetwork,
  transport: http()
})

async function probeContract(contractAddress, contractName) {
  console.log(`\n🔍 PROBING ${contractName.toUpperCase()}: ${contractAddress}`)
  console.log('=' .repeat(80))
  
  try {
    // Check if contract exists
    const code = await client.getBytecode({ address: contractAddress })
    if (!code || code === '0x') {
      console.log('❌ Contract not deployed or has no code')
      return
    }
    
    console.log(`✅ Contract deployed, code length: ${code.length} characters`)
    console.log(`📋 Bytecode preview: ${code.slice(0, 100)}...`)
    
    // Test common function signatures
    console.log('\n🧪 Testing Common Function Signatures:')
    
    for (const [funcName, selector] of Object.entries(COMMON_FUNCTIONS)) {
      try {
        const callData = selector + '0'.repeat(64) // Add padding for address parameters
        const result = await client.call({
          to: contractAddress,
          data: callData
        })
        
        if (result.data && result.data !== '0x') {
          console.log(`  ✅ ${funcName}: ${result.data}`)
          
          // Try to decode common return types
          if (result.data.length === 66) { // 32 bytes = uint256 or address
            const asUint = BigInt(result.data)
            const asAddress = '0x' + result.data.slice(26) // Last 20 bytes for address
            console.log(`     → as uint256: ${asUint}`)
            console.log(`     → as address: ${asAddress}`)
          }
        } else {
          console.log(`  ❌ ${funcName}: No data returned`)
        }
      } catch (error) {
        console.log(`  💥 ${funcName}: ${error.message.split('\n')[0]}`)
      }
    }
    
    // Try to call with user address
    const userAddress = '0xAb689a95Eb3a3f3cc06ba08a7770bF2410Dd80E8'
    const userAddressPadded = userAddress.toLowerCase().replace('0x', '').padStart(64, '0')
    
    console.log('\n🧪 Testing Functions with User Address:')
    for (const [funcName, selector] of Object.entries(COMMON_FUNCTIONS)) {
      if (funcName.includes('address)')) {
        try {
          const callData = selector + userAddressPadded
          const result = await client.call({
            to: contractAddress,
            data: callData
          })
          
          if (result.data && result.data !== '0x') {
            console.log(`  ✅ ${funcName}: ${result.data}`)
            if (result.data === '0x0000000000000000000000000000000000000000000000000000000000000001') {
              console.log('     → Returns TRUE (has redeemed)')
            } else if (result.data === '0x0000000000000000000000000000000000000000000000000000000000000000') {
              console.log('     → Returns FALSE (has not redeemed)')
            }
          }
        } catch (error) {
          console.log(`  💥 ${funcName}: ${error.message.split('\n')[0]}`)
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Error probing ${contractName}:`, error.message)
  }
}

async function checkSimpleTransactionCall() {
  console.log('\n🧪 TESTING DIRECT TRANSACTION CALLS')
  console.log('=' .repeat(80))
  
  // Test simple redeem call
  const redeemSelector = '0x1c5a2d76' // redeem() function
  
  try {
    // Test against gasless grant
    console.log('Testing redeem() on gasless grant...')
    const result = await client.call({
      to: CONTRACTS.gaslessGrant,
      data: redeemSelector,
      from: '0xAb689a95Eb3a3f3cc06ba08a7770bF2410Dd80E8'
    })
    console.log('✅ Redeem call result:', result)
  } catch (error) {
    console.log('❌ Redeem call failed:', error.message)
  }
  
  // Test paymaster sponsored redemption
  const sponsoredRedeemSelector = '0x12345678' // placeholder
  const grantAddressPadded = CONTRACTS.gaslessGrant.toLowerCase().replace('0x', '').padStart(64, '0')
  
  try {
    console.log('Testing sponsoredRedemption() on paymaster...')
    const result = await client.call({
      to: CONTRACTS.paymaster,
      data: sponsoredRedeemSelector + grantAddressPadded,
      from: '0xAb689a95Eb3a3f3cc06ba08a7770bF2410Dd80E8'
    })
    console.log('✅ Sponsored redemption result:', result)
  } catch (error) {
    console.log('❌ Sponsored redemption failed:', error.message)
  }
}

async function main() {
  console.log('🔧 MARS CREDIT NETWORK CONTRACT DEBUG TOOL')
  console.log('=' .repeat(60))
  
  // Get network status first
  const blockNumber = await client.getBlockNumber()
  console.log(`📊 Current Block: ${blockNumber.toLocaleString()}`)
  
  // Probe each contract
  await probeContract(CONTRACTS.simpleTokenGrant, 'Simple Token Grant')
  await probeContract(CONTRACTS.gaslessGrant, 'Gasless Grant')  
  await probeContract(CONTRACTS.paymaster, 'Paymaster')
  
  // Test transaction calls
  await checkSimpleTransactionCall()
  
  console.log('\n🎯 ANALYSIS COMPLETE')
  console.log('Check which functions returned valid data above ↑')
}

main().catch(console.error) 