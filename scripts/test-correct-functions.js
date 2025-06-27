#!/usr/bin/env node

const { createPublicClient, http, formatEther, parseAbi } = require('viem')

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
  gaslessGrant: '0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6',
  paymaster: '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
}

// CORRECT ABIs based on actual contract code
const PAYMASTER_ENABLED_GRANT_ABI = parseAbi([
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function getRemainingTokens() view returns (uint256)',
  'function authorizedPaymasters(address) view returns (bool)',
  'function redeemTokens() external',
  'function redeemForUser(address) external'
])

const MARS_GRANT_PAYMASTER_ABI = parseAbi([
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function totalGasSponsored() view returns (uint256)',
  'function rateLimitBlocks() view returns (uint256)',
  'function authorizedContracts(address) view returns (bool)',
  'function lastSponsoredBlock(address) view returns (uint256)',
  'function canUseSponsoredTransaction(address) view returns (bool)',
  'function getBlocksUntilNextSponsorship(address) view returns (uint256)',
  'function sponsoredRedemption(address) external'
])

const client = createPublicClient({
  chain: marsCreditNetwork,
  transport: http()
})

async function analyzeGaslessSystem(userAddress) {
  console.log('🔧 MARS CREDIT GASLESS SYSTEM ANALYSIS')
  console.log('=' .repeat(60))
  console.log(`👤 User: ${userAddress}`)
  
  try {
    // Network info
    const blockNumber = await client.getBlockNumber()
    console.log(`📊 Current Block: ${blockNumber.toLocaleString()}`)
    
    console.log('\n📋 GASLESS GRANT CONTRACT ANALYSIS')
    console.log('=' .repeat(60))
    
    // Grant contract analysis
    const [
      grantOwner,
      grantBalance,
      redemptionAmount,
      hasUserRedeemed,
      remainingTokens,
      isPaymasterAuthorized
    ] = await Promise.all([
      client.readContract({
        address: CONTRACTS.gaslessGrant,
        abi: PAYMASTER_ENABLED_GRANT_ABI,
        functionName: 'owner'
      }),
      client.readContract({
        address: CONTRACTS.gaslessGrant,
        abi: PAYMASTER_ENABLED_GRANT_ABI,
        functionName: 'getBalance'
      }),
      client.readContract({
        address: CONTRACTS.gaslessGrant,
        abi: PAYMASTER_ENABLED_GRANT_ABI,
        functionName: 'redemptionAmountPerUser'
      }),
      client.readContract({
        address: CONTRACTS.gaslessGrant,
        abi: PAYMASTER_ENABLED_GRANT_ABI,
        functionName: 'hasAddressRedeemed',
        args: [userAddress]
      }),
      client.readContract({
        address: CONTRACTS.gaslessGrant,
        abi: PAYMASTER_ENABLED_GRANT_ABI,
        functionName: 'getRemainingTokens'
      }),
      client.readContract({
        address: CONTRACTS.gaslessGrant,
        abi: PAYMASTER_ENABLED_GRANT_ABI,
        functionName: 'authorizedPaymasters',
        args: [CONTRACTS.paymaster]
      })
    ])
    
    console.log(`👑 Owner: ${grantOwner}`)
    console.log(`💰 Balance: ${formatEther(grantBalance)} MARS`)
    console.log(`🎁 Redemption Amount: ${formatEther(redemptionAmount)} MARS`)
    console.log(`👤 User Has Redeemed: ${hasUserRedeemed ? '✅ YES' : '❌ NO'}`)
    console.log(`📊 Remaining Tokens: ${formatEther(remainingTokens)} MARS`)
    console.log(`🔗 Paymaster Authorized: ${isPaymasterAuthorized ? '✅ YES' : '❌ NO'}`)
    
    console.log('\n⚡ PAYMASTER CONTRACT ANALYSIS')
    console.log('=' .repeat(60))
    
    // Paymaster analysis
    const [
      paymasterOwner,
      paymasterBalance,
      totalSponsored,
      rateLimitBlocks,
      isGrantAuthorized,
      userLastBlock,
      canUserUseSponsored,
      blocksUntilNext
    ] = await Promise.all([
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'owner'
      }),
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'getBalance'
      }),
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'totalGasSponsored'
      }),
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'rateLimitBlocks'
      }),
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'authorizedContracts',
        args: [CONTRACTS.gaslessGrant]
      }),
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'lastSponsoredBlock',
        args: [userAddress]
      }),
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'canUseSponsoredTransaction',
        args: [userAddress]
      }),
      client.readContract({
        address: CONTRACTS.paymaster,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'getBlocksUntilNextSponsorship',
        args: [userAddress]
      })
    ])
    
    console.log(`👑 Owner: ${paymasterOwner}`)
    console.log(`💰 Balance: ${formatEther(paymasterBalance)} MARS`)
    console.log(`📊 Total Gas Sponsored: ${formatEther(totalSponsored)} MARS`)
    console.log(`⏱️ Rate Limit: ${rateLimitBlocks.toString()} blocks`)
    console.log(`🔗 Grant Authorized: ${isGrantAuthorized ? '✅ YES' : '❌ NO'}`)
    console.log(`📍 User Last Block: ${userLastBlock.toString()}`)
    console.log(`✅ Can Use Sponsored: ${canUserUseSponsored ? '✅ YES' : '❌ NO'}`)
    console.log(`⏳ Blocks Until Next: ${blocksUntilNext.toString()}`)
    
    // Calculate time until next
    if (blocksUntilNext > 0n) {
      const hoursLeft = Math.ceil(Number(blocksUntilNext) * 14.3 / 3600)
      console.log(`⏰ Time Until Next: ~${hoursLeft} hours`)
    }
    
    console.log('\n🎯 TRANSACTION READINESS CHECK')
    console.log('=' .repeat(60))
    
    const issues = []
    const successes = []
    
    if (hasUserRedeemed) {
      issues.push('❌ User has already redeemed from this grant')
    } else {
      successes.push('✅ User has not redeemed yet')
    }
    
    if (!isPaymasterAuthorized) {
      issues.push('❌ Paymaster is not authorized on grant contract')
    } else {
      successes.push('✅ Paymaster is authorized on grant contract')
    }
    
    if (!isGrantAuthorized) {
      issues.push('❌ Grant contract is not authorized on paymaster')
    } else {
      successes.push('✅ Grant contract is authorized on paymaster')
    }
    
    if (!canUserUseSponsored) {
      issues.push(`❌ User is rate limited (${blocksUntilNext} blocks remaining)`)
    } else {
      successes.push('✅ User can use sponsored transactions')
    }
    
    if (remainingTokens === 0n) {
      issues.push('❌ No tokens remaining in grant')
    } else {
      successes.push(`✅ ${formatEther(remainingTokens)} MARS remaining`)
    }
    
    if (paymasterBalance === 0n) {
      issues.push('❌ Paymaster has no MARS for gas fees')
    } else {
      successes.push(`✅ Paymaster has ${formatEther(paymasterBalance)} MARS for gas`)
    }
    
    console.log('\n✅ WORKING CORRECTLY:')
    successes.forEach(success => console.log(`  ${success}`))
    
    if (issues.length > 0) {
      console.log('\n❌ ISSUES PREVENTING GASLESS TRANSACTIONS:')
      issues.forEach(issue => console.log(`  ${issue}`))
    } else {
      console.log('\n🎉 ALL SYSTEMS GO! Gasless transactions should work!')
    }
    
    return {
      canRedeem: issues.length === 0,
      issues,
      successes,
      grantBalance: formatEther(grantBalance),
      paymasterBalance: formatEther(paymasterBalance),
      redemptionAmount: formatEther(redemptionAmount)
    }
    
  } catch (error) {
    console.error('❌ Error analyzing system:', error.message)
    return null
  }
}

async function main() {
  const userAddress = process.argv[2] || '0xAb689a95Eb3a3f3cc06ba08a7770bF2410Dd80E8'
  
  const result = await analyzeGaslessSystem(userAddress)
  
  if (result && !result.canRedeem) {
    console.log('\n🔧 REQUIRED FIXES:')
    console.log('To enable gasless transactions, the following must be resolved:')
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.replace('❌ ', '')}`)
    })
  }
}

main().catch(console.error) 