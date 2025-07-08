import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { Connection, PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'

// Bridge configuration
const BRIDGE_CONFIG = {
  l1: {
    contractAddress: '0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba',
    rpcUrl: 'https://rpc.marscredit.xyz',
  },
  solana: {
    mintAddress: 'uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b', // New MARS mint (9 decimals, supports billions of MARS)
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  }
}

// L1 Bridge Contract ABI
const BRIDGE_ABI = [
  'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function totalLocked() external view returns (uint256)',
  'function bridgeCount() external view returns (uint256)',
  'function minBridgeAmount() external view returns (uint256)',
  'function maxBridgeAmount() external view returns (uint256)',
  'function bridgeFeePercentage() external view returns (uint256)',
]

export async function GET() {
  try {
    // Initialize connections
    const l1Provider = new ethers.JsonRpcProvider(BRIDGE_CONFIG.l1.rpcUrl)
    const solanaConnection = new Connection(BRIDGE_CONFIG.solana.rpcUrl, 'confirmed')
    
    // Get L1 bridge stats
    const bridgeContract = new ethers.Contract(
      BRIDGE_CONFIG.l1.contractAddress,
      BRIDGE_ABI,
      l1Provider
    )
    
    let l1Stats
    try {
      // Try to get bridge stats from a single call
      const stats = await bridgeContract.getBridgeStats()
      l1Stats = {
        totalLocked: ethers.formatEther(stats[0]),
        contractBalance: ethers.formatEther(stats[1]),
        bridgeCount: stats[2].toString(),
        minAmount: ethers.formatEther(stats[3]),
        maxAmount: ethers.formatEther(stats[4]),
        feePercentage: stats[5].toString(),
      }
    } catch (error) {
      // Fallback to individual calls
      console.log('Using fallback method for L1 stats')
      const [totalLocked, bridgeCount, minAmount, maxAmount, feePercentage] = await Promise.all([
        bridgeContract.totalLocked().catch(() => '0'),
        bridgeContract.bridgeCount().catch(() => '0'),
        bridgeContract.minBridgeAmount().catch(() => ethers.parseEther('10')),
        bridgeContract.maxBridgeAmount().catch(() => ethers.parseEther('1000000')),
        bridgeContract.bridgeFeePercentage().catch(() => '10'), // 0.1% = 10 basis points
      ])
      
      l1Stats = {
        totalLocked: ethers.formatEther(totalLocked),
        contractBalance: ethers.formatEther(totalLocked),
        bridgeCount: bridgeCount.toString(),
        minAmount: ethers.formatEther(minAmount),
        maxAmount: ethers.formatEther(maxAmount),
        feePercentage: feePercentage.toString(),
      }
    }
    
    // Get Solana mint info
    let solanaStats
    try {
      const mintInfo = await getMint(solanaConnection, new PublicKey(BRIDGE_CONFIG.solana.mintAddress))
      solanaStats = {
        totalSupply: mintInfo.supply.toString(),
        mintAuthority: mintInfo.mintAuthority?.toString() || 'None',
        isInitialized: mintInfo.isInitialized,
      }
    } catch (error) {
      console.error('Error fetching Solana mint info:', error)
      solanaStats = {
        totalSupply: '0',
        mintAuthority: 'Error',
        isInitialized: false,
      }
    }
    
    return NextResponse.json({
      l1: l1Stats,
      solana: solanaStats,
    })
    
  } catch (error) {
    console.error('Error fetching bridge stats:', error)
    
    // Return fallback data
    return NextResponse.json({
      l1: {
        totalLocked: '0',
        contractBalance: '0',
        bridgeCount: '0',
        minAmount: '10',
        maxAmount: '1000000',
        feePercentage: '10',
      },
      solana: {
        totalSupply: '0',
        mintAuthority: 'Error',
        isInitialized: false,
      }
    })
  }
}

export async function POST() {
  // This endpoint could be used to trigger manual relayer operations
  return NextResponse.json({ message: 'Manual relayer operations not implemented yet' }, { status: 501 })
} 