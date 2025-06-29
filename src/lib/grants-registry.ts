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
  'function redemptionAmountPerUser() view returns (uint256)',
  'function hasAddressRedeemed(address) view returns (bool)',
  'function getRemainingTokens() view returns (uint256)',
  'function redeemTokens() external'
] as const

export const MARS_GRANT_PAYMASTER_ABI = [
  'function owner() view returns (address)',
  'function getBalance() view returns (uint256)',
  'function totalGasSponsored() view returns (uint256)',
  'function rateLimitBlocks() view returns (uint256)',
  'function authorizedContracts(address) view returns (bool)',
  'function lastSponsoredBlock(address) view returns (uint256)',
  'function canUseSponsoredTransaction(address) view returns (bool)',
  'function getBlocksUntilNextSponsorship(address) view returns (uint256)',
  'function sponsoredRedemption(address) external'
] as const

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

export async function loadGrantData(contractAddress: `0x${string}`) {
  try {
    console.log(`📖 Loading grant data from contract: ${contractAddress}`)
    
    // Read contract data using correct function names
    const [balance, redemptionAmount, remainingTokens] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: SIMPLE_TOKEN_GRANT_ABI,
        functionName: 'getBalance'
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
    
    console.log(`💰 Contract balance: ${formatEther(balance)} MARS`)
    console.log(`🎁 Redemption amount: ${formatEther(redemptionAmount)} MARS`)
    console.log(`📊 Remaining tokens: ${formatEther(remainingTokens)} MARS`)
    
    return {
      balance: formatEther(balance),
      redemptionAmount: formatEther(redemptionAmount),
      remainingTokens: formatEther(remainingTokens),
      totalUsers: Math.floor(Number(formatEther(balance)) / Number(formatEther(redemptionAmount))),
      isActive: remainingTokens > 0n
    }
  } catch (error) {
    console.error(`❌ Error loading grant data for ${contractAddress}:`, error)
    return {
      balance: '0',
      redemptionAmount: '0', 
      remainingTokens: '0',
      totalUsers: 0,
      isActive: false
    }
  }
}

export async function loadAllGrants(): Promise<LiveGrantData[]> {
  const activeGrants = GRANTS_REGISTRY.filter(grant => grant.isActive)
  
  // Load all grant data in parallel and map to proper structure
  const grantsWithData = await Promise.all(
    activeGrants.map(async (grant) => {
      const liveData = await loadGrantData(grant.contractAddress)
      
      return {
        id: grant.id,
        name: grant.name,
        description: grant.description,
        contractAddress: grant.contractAddress,
        category: grant.category,
        isActive: grant.isActive,
        deployedAt: grant.deployedAt,
        
        // Live blockchain data properly formatted
        totalPool: `${liveData.balance} MARS`,
        perAddress: `${liveData.redemptionAmount} MARS`,
        remaining: `${liveData.remainingTokens} MARS`,
        claimsLeft: liveData.totalUsers,
        progress: liveData.balance !== '0' 
          ? Math.round(((Number(liveData.balance) - Number(liveData.remainingTokens)) / Number(liveData.balance)) * 100)
          : 0,
        isPaused: false,
        
        // Status based on activity
        status: liveData.isActive ? 'Active' : 'Completed'
      } as LiveGrantData
    })
  )
  
  return grantsWithData
}

// Check if user has redeemed from a specific grant
export async function hasUserRedeemed(grantAddress: `0x${string}`, userAddress: `0x${string}`): Promise<boolean> {
  try {
    const hasRedeemed = await publicClient.readContract({
      address: grantAddress,
      abi: SIMPLE_TOKEN_GRANT_ABI,
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
    const liveData = await loadGrantData(grantConfig.contractAddress)
    return {
      id: grantConfig.id,
      name: grantConfig.name,
      description: grantConfig.description,
      contractAddress: grantConfig.contractAddress,
      category: grantConfig.category,
      isActive: grantConfig.isActive,
      deployedAt: grantConfig.deployedAt,
      
      totalPool: `${liveData.balance} MARS`,
      perAddress: `${liveData.redemptionAmount} MARS`,
      remaining: `${liveData.remainingTokens} MARS`,
      claimsLeft: liveData.totalUsers,
      progress: Math.round((Number(liveData.remainingTokens) / Number(liveData.balance)) * 100),
      isPaused: false,
      
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
  try {
    const balance = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'getBalance'
    })
    
    const totalSponsored = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'totalGasSponsored'
    })
    
    const rateLimit = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'rateLimitBlocks'
    })

    return {
      isDeployed: true,
      balance: formatEther(balance),
      totalSponsored: formatEther(totalSponsored),
      rateLimit: rateLimit.toString()
    }
  } catch (error) {
    console.error('Error debugging paymaster:', error)
    return { error: 'Failed to read paymaster data' }
  }
}

export async function debugGrantAuthorization(grantAddress: `0x${string}`) {
  try {
    const isAuthorized = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'authorizedContracts',
      args: [grantAddress]
    })

    return { isAuthorized }
  } catch (error) {
    console.error('Error checking grant authorization:', error)
    return { error: 'Failed to check authorization' }
  }
}

export async function debugUserGaslessEligibility(userAddress: `0x${string}`) {
  try {
    const canUse = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'canUseSponsoredTransaction',
      args: [userAddress]
    })
    
    const blocksUntilNext = await publicClient.readContract({
      address: PAYMASTER_CONTRACT_ADDRESS,
      abi: MARS_GRANT_PAYMASTER_ABI,
      functionName: 'getBlocksUntilNextSponsorship',
      args: [userAddress]
    })

    return {
      canUse,
      blocksUntilNext: Number(blocksUntilNext)
    }
  } catch (error) {
    console.error('Error checking user gasless eligibility:', error)
    return { error: 'Failed to check user eligibility' }
  }
} 