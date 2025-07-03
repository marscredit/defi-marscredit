'use client'

import { createPublicClient, http, formatEther, parseAbi } from 'viem'
import { marsCreditNetwork } from './web3'

// Public client for reading blockchain data (no wallet required)
export const publicClient = createPublicClient({
  chain: marsCreditNetwork,
  transport: http()
})

// CORRECT ABIs based on deployed contracts
export const SIMPLE_TOKEN_GRANT_ABI = [
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function totalTokensAvailable() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function getRemainingTokens() view returns (uint256)',
  'function redeemTokens() external'
] as const

export const MARS_GRANT_PAYMASTER_ABI = parseAbi([
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

// PaymasterEnabledGrant contract ABI (enhanced version with gasless support)
export const PAYMASTER_ENABLED_GRANT_ABI = parseAbi([
  'function owner() view returns (address)',
  'function totalTokensAvailable() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)', 
  'function tokensRedeemed() view returns (uint256)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function getRemainingTokens() view returns (uint256)',
  'function getRemainingRedemptions() view returns (uint256)',
  'function getBalance() view returns (uint256)',
  'function paused() view returns (bool)',
  'function redeemTokens() external',
  'function redeemForUser(address user) external',
  'function authorizedPaymasters(address) view returns (bool)'
])

// Paymaster contract address - DEPLOYED!
export const PAYMASTER_CONTRACT_ADDRESS: `0x${string}` = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'

// Simple test function to verify paymaster contract connection
export async function testPaymasterConnection() {
  console.log('🧪 TESTING PAYMASTER CONNECTION')
  console.log('==============================')
  console.log('📍 Paymaster Address:', PAYMASTER_CONTRACT_ADDRESS)
  console.log('🌐 PublicClient Chain ID:', publicClient.chain?.id)
  console.log('🔗 PublicClient RPC URL:', publicClient.transport?.url || 'Unknown')
  
  try {
    // Test basic contract existence
    const code = await publicClient.getBytecode({ address: PAYMASTER_CONTRACT_ADDRESS })
    console.log('📊 Contract bytecode length:', code?.length || 0)
    
    if (!code || code === '0x') {
      console.error('❌ CRITICAL: Paymaster contract has no bytecode!')
      return { error: 'Contract not deployed', address: PAYMASTER_CONTRACT_ADDRESS }
    }
    
    console.log('✅ Paymaster contract exists and has bytecode')
    return { success: true, address: PAYMASTER_CONTRACT_ADDRESS, bytecodeLength: code.length }
  } catch (error) {
    console.error('❌ Failed to test paymaster connection:', error)
    return { error: error.message, address: PAYMASTER_CONTRACT_ADDRESS }
  }
}

// ENHANCED GASLESS GRANT ABI (with whitelist and gasless functionality)
export const gaslessGrantABI = parseAbi([
  'function owner() view returns (address)',
  'function totalTokensAvailable() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)',
  'function tokensRedeemed() view returns (uint256)',
  'function paused() view returns (bool)',
  'function isWhitelistMode() view returns (bool)',
  'function hasRedeemed(address) view returns (bool)',
  'function whitelist(address) view returns (bool)',
  'function authorizedPaymasters(address) view returns (bool)',
  'function getBalance() view returns (uint256)',
  'function getRemainingTokens() view returns (uint256)',
  'function getRemainingRedemptions() view returns (uint256)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function isWhitelisted(address) view returns (bool)',
  'function canUserRedeem(address) view returns (bool)',
  'function getGrantInfo() view returns (uint256, uint256, uint256, uint256, bool, bool)',
  'function redeemTokens() external',
  'function redeemForUser(address user) external',
  'function authorizePaymaster(address) external',
  'function revokePaymaster(address) external',
  'function addToWhitelist(address) external',
  'function addMultipleToWhitelist(address[]) external',
  'function removeFromWhitelist(address) external',
  'function setWhitelistMode(bool) external',
  'function updateGrant(uint256) external',
  'function fundGrant() external payable',
  'function emergencyWithdraw() external',
  'function pause() external',
  'function unpause() external'
])

// ENHANCED TOKEN GRANT ABI (with whitelist functionality)
export const ENHANCED_TOKEN_GRANT_ABI = parseAbi([
  'function owner() view returns (address)',
  'function totalTokensAvailable() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)',
  'function tokensRedeemed() view returns (uint256)',
  'function paused() view returns (bool)',
  'function isWhitelistMode() view returns (bool)',
  'function hasRedeemed(address) view returns (bool)',
  'function whitelist(address) view returns (bool)',
  'function getBalance() view returns (uint256)',
  'function getRemainingTokens() view returns (uint256)',
  'function getRemainingRedemptions() view returns (uint256)',
  'function getTotalRedemptionAmount() view returns (uint256)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function isWhitelisted(address) view returns (bool)',
  'function canUserRedeem(address) view returns (bool)',
  'function getGrantInfo() view returns (uint256, uint256, uint256, uint256, bool, bool)',
  'function redeemTokens() external',
  'function addToWhitelist(address) external',
  'function addMultipleToWhitelist(address[]) external',
  'function removeFromWhitelist(address) external',
  'function setWhitelistMode(bool) external',
  'function updateGrant(uint256) external',
  'function fundGrant() external payable',
  'function emergencyWithdraw() external',
  'function pause() external',
  'function unpause() external'
])

// Grant Registry - Add new grants here
export interface GrantConfig {
  id: string
  name: string
  description: string
  contractAddress: `0x${string}`
  deployedAt: string
  category: 'genesis' | 'community' | 'developer' | 'special'
  isActive: boolean
  contractType?: 'simple' | 'enhanced' | 'enhanced-gasless' // Add contract type support
  isWhitelistOnly?: boolean // Add whitelist indicator
}

export const GRANTS_REGISTRY: GrantConfig[] = [
  {
    id: 'intract-campaign-winners',
    name: 'Intract Campaign Reward Distribution',
    description: 'A targeted incentive program rewarding the top 10,000 participants of the Intract campaign. Each qualifying address will receive 500 MARS tokens, totaling 5,000,000 MARS in distribution. This grant aims to recognize community engagement and drive awareness of Mars Credit through the Intract platform.',
    contractAddress: '0x43dCc37b47C3E4372227a5a75c46e9bAC459ba15' as `0x${string}`,
    deployedAt: '2025-07-02T01:59:00.000Z',
    category: 'community',
    isActive: true,
    contractType: 'enhanced-gasless',
    isWhitelistOnly: false
  },
  {
    id: 'coingecko-listing-bounty',
    name: 'CoinGecko Listing Bounty',
    description: 'A 1,000,000 MARS token grant allocated to secure Mars Credit\'s official listing on CoinGecko. This strategic listing will enhance visibility and legitimacy across the crypto community, making token information publicly accessible to millions of CoinGecko users.',
    contractAddress: '0xa41B1fd3b51E041144c58AA7cCeD5BDA5D3Ea1e3' as `0x${string}`,
    deployedAt: '2025-07-02T01:48:00.000Z',
    category: 'special',
    isActive: true,
    contractType: 'enhanced',
    isWhitelistOnly: true
  },
  {
    id: 'coinmarketcap-listing-bounty',
    name: 'CoinMarketCap Listing Bounty',
    description: 'A 1,000,000 MARS reward grant dedicated to achieving a successful listing of Mars Credit on CoinMarketCap. This listing is crucial for driving traffic, increasing discoverability, and enabling global price tracking, ultimately boosting investor confidence and transparency.',
    contractAddress: '0x0A2620840FA64aF740dcE448AD2EE4c4BB64ba47' as `0x${string}`,
    deployedAt: '2025-07-02T01:48:30.000Z',
    category: 'special',
    isActive: true,
    contractType: 'enhanced',
    isWhitelistOnly: true
  },
  {
    id: 'mining-pool-integration',
    name: 'Mining Pool Integration Grant',
    description: 'A 2,500,000 MARS grant to incentivize integration of Mars Credit into established mining pools. By supporting this listing, Mars aims to expand mining capacity, improve network stability, and attract more miners, enhancing decentralization and hash power availability.',
    contractAddress: '0xe6F14950cfBe2E746784636c00a9F98E66767fF6' as `0x${string}`,
    deployedAt: '2025-07-02T01:49:00.000Z',
    category: 'developer',
    isActive: true,
    contractType: 'enhanced',
    isWhitelistOnly: true
  },
  {
    id: 'early-supporter-faucet',
    name: 'Early Supporter Faucet',
    description: 'A 500,000 MARS grant to incentivize early supporters to deploy smart contract. Each wallet is eligible for 25 MARS.',
    contractAddress: '0x86a81bc61877ad37735FC03B4E7736ff6716EE6b' as `0x${string}`,
    deployedAt: '2025-07-02T01:49:30.000Z',
    category: 'genesis',
    isActive: true,
    contractType: 'enhanced',
    isWhitelistOnly: false
  }
]

// Live grant data loaded from blockchain
export interface LiveGrantData {
  id: string
  name: string
  description: string
  contractAddress: string
  category: string
  isActive: boolean
  deployedAt: string
  contractType?: 'simple' | 'enhanced' | 'enhanced-gasless'
  isWhitelistOnly?: boolean
  
  // Live blockchain data
  totalPool: string // in MARS
  perAddress: string // in MARS  
  remaining: string // in MARS
  claimsLeft: number
  progress: number // percentage
  isPaused: boolean
  
  // Status
  status: 'Active' | 'Completed' | 'Paused'
}

export async function loadGrantData(contractAddress: `0x${string}`, contractType: 'simple' | 'enhanced' | 'enhanced-gasless' = 'simple') {
  try {
    console.log(`📖 Loading grant data from contract: ${contractAddress} (type: ${contractType})`)
    
    if (contractType === 'enhanced' || contractType === 'enhanced-gasless') {
      // Use the correct ABI based on contract type
      const abi = contractType === 'enhanced-gasless' ? gaslessGrantABI : ENHANCED_TOKEN_GRANT_ABI
      
      const [totalTokensAvailable, redemptionAmount, remainingTokens, isWhitelistMode, isPaused] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: abi,
          functionName: 'totalTokensAvailable'
        }).catch(() => 0n),
        publicClient.readContract({
          address: contractAddress,
          abi: abi,
          functionName: 'redemptionAmountPerUser'
        }).catch(() => 0n),
        publicClient.readContract({
          address: contractAddress,
          abi: abi,
          functionName: 'getRemainingTokens'
        }).catch(() => 0n),
        publicClient.readContract({
          address: contractAddress,
          abi: abi,
          functionName: 'isWhitelistMode'
        }).catch(() => false),
        publicClient.readContract({
          address: contractAddress,
          abi: abi,
          functionName: 'paused'
        }).catch(() => false)
      ])
      
      console.log(`💰 Total tokens available: ${formatEther(totalTokensAvailable)} MARS`)
      console.log(`🎁 Redemption amount: ${formatEther(redemptionAmount)} MARS`)
      console.log(`📊 Remaining tokens: ${formatEther(remainingTokens)} MARS`)
      console.log(`🔒 Whitelist mode: ${isWhitelistMode}`)
      console.log(`⏸️ Paused: ${isPaused}`)
      
      return {
        balance: formatEther(totalTokensAvailable),
        redemptionAmount: formatEther(redemptionAmount),
        remainingTokens: formatEther(remainingTokens),
        totalUsers: Math.floor(Number(formatEther(remainingTokens)) / Number(formatEther(redemptionAmount))),
        isActive: remainingTokens > 0n && !isPaused,
        isWhitelistMode: isWhitelistMode,
        isPaused: isPaused
      }
    } else {
      // Use simple contract ABI (existing logic)
      const [totalTokensAvailable, redemptionAmount, remainingTokens] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: SIMPLE_TOKEN_GRANT_ABI,
          functionName: 'totalTokensAvailable'
        }).catch(() => 0n),
        publicClient.readContract({
          address: contractAddress,
          abi: SIMPLE_TOKEN_GRANT_ABI,
          functionName: 'redemptionAmountPerUser'
        }).catch(() => 0n),
        publicClient.readContract({
          address: contractAddress,
          abi: SIMPLE_TOKEN_GRANT_ABI,
          functionName: 'getRemainingTokens'
        }).catch(() => 0n)
      ])
      
      console.log(`💰 Total tokens available: ${formatEther(totalTokensAvailable)} MARS`)
      console.log(`🎁 Redemption amount: ${formatEther(redemptionAmount)} MARS`)
      console.log(`📊 Remaining tokens: ${formatEther(remainingTokens)} MARS`)
      
      return {
        balance: formatEther(totalTokensAvailable),
        redemptionAmount: formatEther(redemptionAmount),
        remainingTokens: formatEther(remainingTokens),
        totalUsers: Math.floor(Number(formatEther(remainingTokens)) / Number(formatEther(redemptionAmount))),
        isActive: remainingTokens > 0n,
        isWhitelistMode: false,
        isPaused: false
      }
    }
  } catch (error) {
    console.error(`❌ Error loading grant data for ${contractAddress}:`, error)
    return {
      balance: '0',
      redemptionAmount: '0', 
      remainingTokens: '0',
      totalUsers: 0,
      isActive: false,
      isWhitelistMode: false,
      isPaused: false
    }
  }
}

export async function loadAllGrants(): Promise<LiveGrantData[]> {
  const activeGrants = GRANTS_REGISTRY.filter(grant => grant.isActive)
  
  // Load all grant data in parallel and map to proper structure
  const grantsWithData = await Promise.all(
    activeGrants.map(async (grant) => {
      const liveData = await loadGrantData(grant.contractAddress, grant.contractType || 'simple')
      
      return {
        id: grant.id,
        name: grant.name,
        description: grant.description,
        contractAddress: grant.contractAddress,
        category: grant.category,
        isActive: grant.isActive,
        deployedAt: grant.deployedAt,
        contractType: grant.contractType || 'simple',
        isWhitelistOnly: grant.isWhitelistOnly || liveData.isWhitelistMode,
        
        // Live blockchain data properly formatted
        totalPool: `${liveData.balance} MARS`,
        perAddress: `${liveData.redemptionAmount} MARS`,
        remaining: `${liveData.remainingTokens} MARS`,
        claimsLeft: liveData.totalUsers,
        progress: liveData.balance !== '0' 
          ? Math.round(((Number(liveData.balance) - Number(liveData.remainingTokens)) / Number(liveData.balance)) * 100)
          : 0,
        isPaused: liveData.isPaused,
        
        // Status based on activity
        status: liveData.isActive ? 'Active' : 'Completed'
      } as LiveGrantData
    })
  )
  
  return grantsWithData
}

// Check if user has redeemed from a specific grant
export async function hasUserRedeemed(grantAddress: `0x${string}`, userAddress: `0x${string}`, contractType: 'simple' | 'enhanced' | 'enhanced-gasless' = 'simple'): Promise<boolean> {
  try {
    let abi
    if (contractType === 'enhanced-gasless') {
      abi = gaslessGrantABI
    } else if (contractType === 'enhanced') {
      abi = ENHANCED_TOKEN_GRANT_ABI
    } else {
      abi = SIMPLE_TOKEN_GRANT_ABI
    }
    
    const hasRedeemed = await publicClient.readContract({
      address: grantAddress,
      abi: abi,
      functionName: 'hasAddressRedeemed',
      args: [userAddress]
    })
    
    console.log(`🔍 User ${userAddress} redemption status for ${grantAddress}: ${hasRedeemed}`)
    return hasRedeemed as boolean
  } catch (error) {
    console.error('Error checking redemption status:', error)
    return false // Assume not redeemed on error to allow attempt
  }
}

// Check if user is whitelisted (enhanced contracts only)
export async function isUserWhitelisted(grantAddress: `0x${string}`, userAddress: `0x${string}`, contractType: 'enhanced' | 'enhanced-gasless' = 'enhanced'): Promise<boolean> {
  try {
    const abi = contractType === 'enhanced-gasless' ? gaslessGrantABI : ENHANCED_TOKEN_GRANT_ABI
    
    const isWhitelisted = await publicClient.readContract({
      address: grantAddress,
      abi: abi,
      functionName: 'isWhitelisted',
      args: [userAddress]
    })
    
    console.log(`🔍 User ${userAddress} whitelist status for ${grantAddress}: ${isWhitelisted}`)
    return isWhitelisted as boolean
  } catch (error) {
    console.error('Error checking whitelist status:', error)
    return false
  }
}

// Check if user can redeem (enhanced contracts only)
export async function canUserRedeem(grantAddress: `0x${string}`, userAddress: `0x${string}`, contractType: 'enhanced' | 'enhanced-gasless' = 'enhanced'): Promise<boolean> {
  try {
    const abi = contractType === 'enhanced-gasless' ? gaslessGrantABI : ENHANCED_TOKEN_GRANT_ABI
    
    const canRedeem = await publicClient.readContract({
      address: grantAddress,
      abi: abi,
      functionName: 'canUserRedeem',
      args: [userAddress]
    })
    
    console.log(`🔍 User ${userAddress} can redeem from ${grantAddress}: ${canRedeem}`)
    return canRedeem as boolean
  } catch (error) {
    console.error('Error checking redemption eligibility:', error)
    return false
  }
}

// Find grant configuration by contract address
export function findGrantByAddress(contractAddress: string): GrantConfig | undefined {
  return GRANTS_REGISTRY.find(grant => 
    grant.contractAddress.toLowerCase() === contractAddress.toLowerCase()
  )
}

// Load single grant data by contract address
export async function loadGrantByAddress(contractAddress: string): Promise<LiveGrantData | null> {
  const grantConfig = findGrantByAddress(contractAddress)
  if (!grantConfig) {
    console.error('Grant not found for address:', contractAddress)
    return null
  }

  try {
    const liveData = await loadGrantData(grantConfig.contractAddress, grantConfig.contractType || 'simple')
    return {
      id: grantConfig.id,
      name: grantConfig.name,
      description: grantConfig.description,
      contractAddress: grantConfig.contractAddress,
      category: grantConfig.category,
      isActive: grantConfig.isActive,
      deployedAt: grantConfig.deployedAt,
      contractType: grantConfig.contractType || 'simple',
      isWhitelistOnly: grantConfig.isWhitelistOnly || liveData.isWhitelistMode,
      
      totalPool: `${liveData.balance} MARS`,
      perAddress: `${liveData.redemptionAmount} MARS`,
      remaining: `${liveData.remainingTokens} MARS`,
      claimsLeft: liveData.totalUsers,
      progress: liveData.balance !== '0' 
        ? Math.round(((Number(liveData.balance) - Number(liveData.remainingTokens)) / Number(liveData.balance)) * 100)
        : 0,
      isPaused: liveData.isPaused,
      
      status: liveData.isActive ? 'Active' : 'Completed'
    }
  } catch (error) {
    console.error('Error loading grant by address:', error)
    return null
  }
}

// Check if user can use gasless transaction through paymaster
export async function canUseGaslessTransaction(userAddress: `0x${string}`): Promise<boolean> {
  if (PAYMASTER_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return false // Paymaster not deployed yet
  }

  try {
    const canUse = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'canUseSponsoredTransaction',
      args: [userAddress]
    })
    
    return canUse as boolean
  } catch (error) {
    console.error('Failed to check gasless transaction eligibility:', error)
    return false
  }
}

// Get blocks until user can use gasless transaction again
export async function getBlocksUntilGasless(userAddress: `0x${string}`): Promise<number> {
  if (PAYMASTER_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return 0
  }

  try {
    const blocks = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'getBlocksUntilNextSponsorship',
      args: [userAddress]
    })
    
    return Number(blocks)
  } catch (error) {
    console.error('Failed to get blocks until gasless:', error)
    return 0
  }
}

// Check if grant contract is authorized with paymaster
export async function isGrantAuthorizedForGasless(grantAddress: `0x${string}`): Promise<boolean> {
  if (PAYMASTER_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return false
  }

  try {
    const isAuthorized = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'authorizedContracts',
      args: [grantAddress]
    })
    
    return isAuthorized as boolean
  } catch (error) {
    console.error('Failed to check grant authorization:', error)
    return false
  }
}

// Debug functions for paymaster
export async function debugPaymasterStatus() {
  console.log('🔍 DEBUGGING PAYMASTER STATUS')
  console.log('============================')
  console.log('💰 Paymaster Address:', PAYMASTER_CONTRACT_ADDRESS)
  console.log('📋 ABI Functions:', MARS_GRANT_PAYMASTER_ABI.length, 'functions loaded')
  
  try {
    // Test each function individually to see which ones fail
    let balance, totalSponsored, rateLimit
    
    try {
      console.log('🧪 Testing getBalance()...')
      balance = await publicClient.readContract({
        address: PAYMASTER_CONTRACT_ADDRESS,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'getBalance'
      })
      console.log('✅ getBalance() successful:', formatEther(balance), 'MARS')
    } catch (error) {
      console.error('❌ getBalance() failed:', error)
      balance = 0n
    }
    
    try {
      console.log('🧪 Testing totalGasSponsored()...')
      totalSponsored = await publicClient.readContract({
        address: PAYMASTER_CONTRACT_ADDRESS,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'totalGasSponsored'
      })
      console.log('✅ totalGasSponsored() successful:', formatEther(totalSponsored), 'MARS')
    } catch (error) {
      console.error('❌ totalGasSponsored() failed:', error)
      totalSponsored = 0n
    }
    
    try {
      console.log('🧪 Testing rateLimitBlocks()...')
      rateLimit = await publicClient.readContract({
        address: PAYMASTER_CONTRACT_ADDRESS,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'rateLimitBlocks'
      })
      console.log('✅ rateLimitBlocks() successful:', rateLimit.toString())
    } catch (error) {
      console.error('❌ rateLimitBlocks() failed:', error)
      rateLimit = 0n
    }

    return {
      isDeployed: true,
      balance: formatEther(balance),
      totalSponsored: formatEther(totalSponsored),
      rateLimit: rateLimit.toString()
    }
  } catch (error) {
    console.error('❌ Critical paymaster debug error:', error)
    return { error: 'Failed to read paymaster data', details: error.message }
  }
}

export async function debugGrantAuthorization(grantAddress: `0x${string}`) {
  console.log('🔍 DEBUGGING GRANT AUTHORIZATION')
  console.log('===============================')
  console.log('💰 Paymaster Address:', PAYMASTER_CONTRACT_ADDRESS)
  console.log('🎯 Grant Address:', grantAddress)
  
  try {
    console.log('🧪 Testing authorizedContracts()...')
    const isAuthorized = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'authorizedContracts',
      args: [grantAddress]
    })
    
    console.log('✅ authorizedContracts() successful:', isAuthorized)
    return { isAuthorized }
  } catch (error) {
    console.error('❌ Grant authorization check failed:', error)
    console.error('Error details:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack
    })
    return { error: 'Failed to check authorization', details: error.message }
  }
}

export async function debugUserGaslessEligibility(userAddress: `0x${string}`) {
  console.log('🔍 DEBUGGING USER GASLESS ELIGIBILITY')
  console.log('====================================')
  console.log('💰 Paymaster Address:', PAYMASTER_CONTRACT_ADDRESS)
  console.log('👤 User Address:', userAddress)
  
  try {
    let canUse, blocksUntilNext
    
    try {
      console.log('🧪 Testing canUseSponsoredTransaction()...')
      canUse = await publicClient.readContract({
        address: PAYMASTER_CONTRACT_ADDRESS,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'canUseSponsoredTransaction',
        args: [userAddress]
      })
      console.log('✅ canUseSponsoredTransaction() successful:', canUse)
    } catch (error) {
      console.error('❌ canUseSponsoredTransaction() failed:', error)
      canUse = false
    }
    
    try {
      console.log('🧪 Testing getBlocksUntilNextSponsorship()...')
      blocksUntilNext = await publicClient.readContract({
        address: PAYMASTER_CONTRACT_ADDRESS,
        abi: MARS_GRANT_PAYMASTER_ABI,
        functionName: 'getBlocksUntilNextSponsorship',
        args: [userAddress]
      })
      console.log('✅ getBlocksUntilNextSponsorship() successful:', Number(blocksUntilNext))
    } catch (error) {
      console.error('❌ getBlocksUntilNextSponsorship() failed:', error)
      blocksUntilNext = 0n
    }

    return {
      canUse,
      blocksUntilNext: Number(blocksUntilNext)
    }
  } catch (error) {
    console.error('❌ Critical user eligibility error:', error)
    console.error('Error details:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack
    })
    return { error: 'Failed to check user eligibility', details: error.message }
  }
}

// Enhanced Grant Contract (using existing working contract with enhanced features)
const enhancedGrantABI = [
  "function owner() external view returns (address)",
  "function redemptionAmountPerUser() external view returns (uint256)",
  "function isActive() external view returns (bool)",
  "function hasRedeemed(address user) external view returns (bool)",
  "function redeemTokens() external",
  "function setActive(bool _isActive) external",
  "function fundGrant() external payable",
  "function withdrawFunds(uint256 amount) external",
  "event TokensRedeemed(address indexed user, uint256 amount)"
] as const;

// Production Grant Contracts for Today's Deployment
export const PRODUCTION_GRANTS = {
  // Enhanced Grant #1 - Using existing working contract with enhanced features
  ENHANCED_GRANT_1: {
    address: "0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174" as Address,
    name: "Enhanced MARS Grant #1",
    description: "Enhanced grant with owner controls and fund management - 10 MARS per user",
    redemptionAmount: "10",
    type: "enhanced" as const,
    abi: enhancedGrantABI,
    isActive: true,
    maxUsers: 1000,
    currentUsers: 0,
    features: ["owner_controls", "fund_management", "active_toggle"]
  },
  
  // Additional grants - will deploy once geth issue is resolved
  ENHANCED_GRANT_2: {
    address: "" as Address, // To be deployed
    name: "MARS Ecosystem Grant",
    description: "Large grant for ecosystem participants - 5000 MARS per user",
    redemptionAmount: "5000",
    type: "enhanced" as const,
    abi: enhancedGrantABI,
    isActive: false, // Will activate after deployment
    maxUsers: 100,
    currentUsers: 0,
    features: ["whitelist", "owner_controls", "fund_management"]
  },
  
  ENHANCED_GRANT_3: {
    address: "" as Address, // To be deployed
    name: "Developer Incentive Grant",
    description: "Grant for developers building on Mars Credit - 2500 MARS per user",
    redemptionAmount: "2500",
    type: "enhanced" as const,
    abi: enhancedGrantABI,
    isActive: false,
    maxUsers: 200,
    currentUsers: 0,
    features: ["whitelist", "owner_controls", "gasless"]
  },
  
  ENHANCED_GRANT_4: {
    address: "" as Address, // To be deployed
    name: "Community Airdrop Grant",
    description: "Community members airdrop - 1000 MARS per user",
    redemptionAmount: "1000",
    type: "enhanced" as const,
    abi: enhancedGrantABI,
    isActive: false,
    maxUsers: 500,
    currentUsers: 0,
    features: ["whitelist", "batch_processing"]
  },
  
  ENHANCED_GRANT_5: {
    address: "" as Address, // To be deployed
    name: "Strategic Partners Grant",
    description: "Strategic partners and VIP users - 10000 MARS per user",
    redemptionAmount: "10000",
    type: "enhanced" as const,
    abi: enhancedGrantABI,
    isActive: false,
    maxUsers: 50,
    currentUsers: 0,
    features: ["whitelist", "owner_controls", "vip_access"]
  }
} as const;

// Updated grants list - remove old test grants, add production grants
export const GRANTS_LIST = [
  // Production Enhanced Grant (using existing working contract)
  PRODUCTION_GRANTS.ENHANCED_GRANT_1,
  
  // Gasless Grant (existing)
  {
    address: "0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6" as Address,
    name: "Gasless MARS Grant",
    description: "Gasless grant redemption for seamless user experience - 5000 MARS per user",
    redemptionAmount: "5000",
    type: "gasless" as const,
    abi: gaslessGrantABI,
    isActive: true,
    maxUsers: 1000,
    currentUsers: 0,
    features: ["gasless", "paymaster", "owner_controls"]
  }
] as const;

// Additional production grants (to be added after deployment)
export const PENDING_PRODUCTION_GRANTS = [
  PRODUCTION_GRANTS.ENHANCED_GRANT_2,
  PRODUCTION_GRANTS.ENHANCED_GRANT_3,
  PRODUCTION_GRANTS.ENHANCED_GRANT_4,
  PRODUCTION_GRANTS.ENHANCED_GRANT_5
] as const; 