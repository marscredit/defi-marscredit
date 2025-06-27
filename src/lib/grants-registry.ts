'use client'

import { createPublicClient, http, formatEther, parseAbi } from 'viem'
import { marsCreditNetwork } from './web3'

// Public client for reading blockchain data (no wallet required)
export const publicClient = createPublicClient({
  chain: marsCreditNetwork,
  transport: http()
})

// SimpleTokenGrant contract ABI
export const SIMPLE_TOKEN_GRANT_ABI = parseAbi([
  'function owner() view returns (address)',
  'function totalTokensAvailable() view returns (uint256)',
  'function redemptionAmountPerUser() view returns (uint256)', 
  'function tokensRedeemed() view returns (uint256)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function getRemainingTokens() view returns (uint256)',
  'function getRemainingRedemptions() view returns (uint256)',
  'function getBalance() view returns (uint256)',
  'function paused() view returns (bool)'
])

// MarsGrantPaymaster contract ABI
export const MARS_GRANT_PAYMASTER_ABI = parseAbi([
  'function sponsoredRedemption(address grantContract) external',
  'function canUseSponsoredTransaction(address user) view returns (bool)',
  'function getBlocksUntilNextSponsorship(address user) view returns (uint256)',
  'function getStats() view returns (uint256 balance, uint256 totalSponsored, uint256 rateLimit)',
  'function authorizedContracts(address) view returns (bool)'
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

// Grant Registry - Add new grants here
export interface GrantConfig {
  id: string
  name: string
  description: string
  contractAddress: `0x${string}`
  deployedAt: string
  category: 'genesis' | 'community' | 'developer' | 'special'
  isActive: boolean
}

export const GRANTS_REGISTRY: GrantConfig[] = [
  {
    id: 'live-token-grant-001',
    name: 'Live Mars Token Grant',
    description: 'First deployed token grant on Mars Credit Network - claim your MARS tokens!',
    contractAddress: '0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174',
    deployedAt: '2025-06-27T03:27:30.862Z',
    category: 'genesis',
    isActive: false
  },
  {
    id: 'grant-1750997516910',
    name: 'Genesis MARS Grant - 5000 Per User',
    description: 'Large genesis grant offering 5000 MARS tokens per address - first deployed with native token support',
    contractAddress: '0xda6E412aa3810Ec3C185611e9C39dDa77ecd4a81',
    deployedAt: '2025-06-27T04:11:56.910Z',
    category: 'genesis',
    isActive: true
  },
  {
    id: 'gasless-grant-001',
    name: '⚡ Gasless MARS Grant - 5000 Per User',
    description: 'Revolutionary gasless grant! Redeem 5000 MARS tokens with ZERO gas fees. No MARS needed to start!',
    contractAddress: '0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6',
    deployedAt: '2025-06-27T14:07:13.000Z',
    category: 'special',
    isActive: true
  }
  // Add more grants here as you deploy them
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

export async function loadGrantData(grantConfig: GrantConfig): Promise<LiveGrantData> {
  try {
    // Read contract data from blockchain
    const [
      totalTokensAvailable,
      redemptionAmountPerUser,
      tokensRedeemed,
      remainingTokens,
      remainingRedemptions,
      isPaused
    ] = await Promise.all([
      publicClient.readContract({
        address: grantConfig.contractAddress,
        abi: SIMPLE_TOKEN_GRANT_ABI,
        functionName: 'totalTokensAvailable'
      }),
      publicClient.readContract({
        address: grantConfig.contractAddress,
        abi: SIMPLE_TOKEN_GRANT_ABI,
        functionName: 'redemptionAmountPerUser'
      }),
      publicClient.readContract({
        address: grantConfig.contractAddress,
        abi: SIMPLE_TOKEN_GRANT_ABI,
        functionName: 'tokensRedeemed'
      }),
      publicClient.readContract({
        address: grantConfig.contractAddress,
        abi: SIMPLE_TOKEN_GRANT_ABI,
        functionName: 'getRemainingTokens'
      }),
      publicClient.readContract({
        address: grantConfig.contractAddress,
        abi: SIMPLE_TOKEN_GRANT_ABI,
        functionName: 'getRemainingRedemptions'
      }),
      publicClient.readContract({
        address: grantConfig.contractAddress,
        abi: SIMPLE_TOKEN_GRANT_ABI,
        functionName: 'paused'
      })
    ])

    // Convert BigInt values to strings for display
    const totalPool = formatEther(totalTokensAvailable as bigint)
    const perAddress = formatEther(redemptionAmountPerUser as bigint)
    const remaining = formatEther(remainingTokens as bigint)
    const claimsLeft = Number(remainingRedemptions)
    
    // Calculate progress percentage
    const totalTokens = Number(totalPool)
    const remainingTokensNum = Number(remaining)
    const progress = totalTokens > 0 ? Math.round(((totalTokens - remainingTokensNum) / totalTokens) * 100) : 0
    
    // Determine status
    let status: 'Active' | 'Completed' | 'Paused' = 'Active'
    if (isPaused) status = 'Paused'
    else if (remainingTokensNum <= 0) status = 'Completed'
    
    return {
      id: grantConfig.id,
      name: grantConfig.name,
      description: grantConfig.description,
      contractAddress: grantConfig.contractAddress,
      category: grantConfig.category,
      isActive: grantConfig.isActive,
      deployedAt: grantConfig.deployedAt,
      
      totalPool: `${totalPool} MARS`,
      perAddress: `${perAddress} MARS`,
      remaining: `${remaining} MARS`,
      claimsLeft,
      progress,
      isPaused: isPaused as boolean,
      
      status
    }
    
  } catch (error) {
    console.error(`Failed to load grant data for ${grantConfig.id}:`, error)
    
    // Return fallback data if blockchain read fails
    return {
      id: grantConfig.id,
      name: grantConfig.name,
      description: grantConfig.description,
      contractAddress: grantConfig.contractAddress,
      category: grantConfig.category,
      isActive: grantConfig.isActive,
      deployedAt: grantConfig.deployedAt,
      
      totalPool: 'Loading...',
      perAddress: 'Loading...',
      remaining: 'Loading...',
      claimsLeft: 0,
      progress: 0,
      isPaused: false,
      
      status: 'Active'
    }
  }
}

export async function loadAllGrants(): Promise<LiveGrantData[]> {
  const activeGrants = GRANTS_REGISTRY.filter(grant => grant.isActive)
  
  // Load all grant data in parallel
  const grantsData = await Promise.all(
    activeGrants.map(grant => loadGrantData(grant))
  )
  
  return grantsData
}

// Check if user has redeemed from a specific grant
export async function hasUserRedeemed(contractAddress: `0x${string}`, userAddress: `0x${string}`): Promise<boolean> {
  try {
    const hasRedeemed = await publicClient.readContract({
      address: contractAddress,
      abi: SIMPLE_TOKEN_GRANT_ABI,
      functionName: 'hasAddressRedeemed',
      args: [userAddress]
    })
    
    return hasRedeemed as boolean
  } catch (error) {
    console.error('Failed to check redemption status:', error)
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
    const liveData = await loadGrantData(grantConfig)
    return liveData
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

// Debug function to check paymaster status
export async function debugPaymasterStatus(): Promise<{
  isDeployed: boolean
  balance: string
  totalSponsored: string
  rateLimit: string
  error?: string
}> {
  if (PAYMASTER_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return {
      isDeployed: false,
      balance: '0',
      totalSponsored: '0',
      rateLimit: '0',
      error: 'Paymaster not deployed'
    }
  }

  try {
    // Get paymaster stats
    const [balance, totalSponsored, rateLimit] = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'getStats'
    }) as [bigint, bigint, bigint]

    return {
      isDeployed: true,
      balance: formatEther(balance),
      totalSponsored: formatEther(totalSponsored),
      rateLimit: rateLimit.toString(),
    }
  } catch (error) {
    return {
      isDeployed: false,
      balance: '0',
      totalSponsored: '0',
      rateLimit: '0',
      error: error.message
    }
  }
}

// Debug function to check specific grant authorization
export async function debugGrantAuthorization(grantAddress: `0x${string}`): Promise<{
  isAuthorized: boolean
  error?: string
}> {
  try {
    const isAuthorized = await isGrantAuthorizedForGasless(grantAddress)
    return { isAuthorized }
  } catch (error) {
    return {
      isAuthorized: false,
      error: error.message
    }
  }
}

// Check user's gasless transaction eligibility with detailed info
export async function debugUserGaslessEligibility(userAddress: `0x${string}`): Promise<{
  canUse: boolean
  blocksUntilNext: number
  error?: string
}> {
  try {
    const [canUse, blocksUntilNext] = await Promise.all([
      canUseGaslessTransaction(userAddress),
      getBlocksUntilGasless(userAddress)
    ])

    return {
      canUse,
      blocksUntilNext
    }
  } catch (error) {
    return {
      canUse: false,
      blocksUntilNext: 0,
      error: error.message
    }
  }
} 