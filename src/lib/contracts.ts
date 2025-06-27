import { ethers } from 'ethers'

// TokenGrant contract ABI
export const TOKEN_GRANT_ABI = [
  {
    "inputs": [{"name": "_redemptionAmountPerUser", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "totalTokens", "type": "uint256"},
      {"indexed": false, "name": "redemptionAmount", "type": "uint256"}
    ],
    "name": "GrantCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{"indexed": false, "name": "amount", "type": "uint256"}],
    "name": "GrantFunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "amount", "type": "uint256"}
    ],
    "name": "TokensRedeemed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "totalTokens", "type": "uint256"},
      {"indexed": false, "name": "redemptionAmount", "type": "uint256"}
    ],
    "name": "GrantUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "fundGrant",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "redeemTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRemainingTokens",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRemainingRedemptions",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "hasAddressRedeemed",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalTokensAvailable",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "redemptionAmountPerUser",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokensRedeemed",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Contract addresses - will be populated from deployment
export const CONTRACT_ADDRESSES = {
  MARS_CREDIT_MAINNET: '',
  MARS_CREDIT_TESTNET: '',
  LOCAL: ''
}

// Grant interface
export interface Grant {
  id: string
  name: string
  contractAddress: string
  totalTokens: string
  redemptionAmount: string
  remainingTokens: string
  remainingRedemptions: number
  isActive: boolean
}

// Contract interaction helpers
export class TokenGrantContract {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer

  constructor(contractAddress: string, provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider
    this.signer = signer
    this.contract = new ethers.Contract(
      contractAddress,
      TOKEN_GRANT_ABI,
      signer || provider
    )
  }

  async getGrantInfo(): Promise<{
    totalTokens: string
    redemptionAmount: string
    tokensRedeemed: string
    remainingTokens: string
    remainingRedemptions: number
  }> {
    try {
      const [totalTokens, redemptionAmount, tokensRedeemed, remainingTokens, remainingRedemptions] = await Promise.all([
        this.contract.totalTokensAvailable(),
        this.contract.redemptionAmountPerUser(),
        this.contract.tokensRedeemed(),
        this.contract.getRemainingTokens(),
        this.contract.getRemainingRedemptions()
      ])

      return {
        totalTokens: ethers.formatEther(totalTokens),
        redemptionAmount: ethers.formatEther(redemptionAmount),
        tokensRedeemed: ethers.formatEther(tokensRedeemed),
        remainingTokens: ethers.formatEther(remainingTokens),
        remainingRedemptions: Number(remainingRedemptions)
      }
    } catch (error) {
      console.error('Error fetching grant info:', error)
      throw error
    }
  }

  async hasUserRedeemed(userAddress: string): Promise<boolean> {
    try {
      return await this.contract.hasAddressRedeemed(userAddress)
    } catch (error) {
      console.error('Error checking if user redeemed:', error)
      throw error
    }
  }

  async redeemTokens(): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for redemption')
    }

    try {
      const tx = await this.contract.redeemTokens()
      return tx
    } catch (error) {
      console.error('Error redeeming tokens:', error)
      throw error
    }
  }

  async getContractBalance(): Promise<string> {
    try {
      const balance = await this.contract.getBalance()
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Error fetching contract balance:', error)
      throw error
    }
  }

  // Event listeners
  onTokensRedeemed(callback: (user: string, amount: string) => void) {
    this.contract.on('TokensRedeemed', (user, amount) => {
      callback(user, ethers.formatEther(amount))
    })
  }

  onGrantFunded(callback: (amount: string) => void) {
    this.contract.on('GrantFunded', (amount) => {
      callback(ethers.formatEther(amount))
    })
  }

  removeAllListeners() {
    this.contract.removeAllListeners()
  }
}

// Utility functions
export const formatMarsAmount = (amount: string): string => {
  if (!amount || amount === '0') return '0 MARS'
  
  const num = parseFloat(amount)
  if (num < 0.0001) return '<0.0001 MARS'
  if (num < 1) return `${num.toFixed(4)} MARS`
  if (num < 1000) return `${num.toFixed(2)} MARS`
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K MARS`
  return `${(num / 1000000).toFixed(1)}M MARS`
}

export const truncateAddress = (address: string, chars: number = 6): string => {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

// Real transaction history interface
export interface BlockchainTransaction {
  hash: string
  type: 'redemption' | 'transfer' | 'bridge'
  amount: string
  from?: string
  to?: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
  grantName?: string
  blockNumber: number
  gasUsed?: string
  gasPrice?: string
}

// Fetch real transaction history from Mars Credit Network - Optimized Version
export const fetchTransactionHistory = async (
  address: `0x${string}`, 
  limit: number = 10
): Promise<BlockchainTransaction[]> => {
  try {
    console.log('🔍 Fetching transaction history for:', address)
    
    // Create public client for Mars Credit Network
    const { createPublicClient, http, formatEther, parseAbi } = await import('viem')
    const { marsCreditNetwork } = await import('./web3')
    
    const client = createPublicClient({
      chain: marsCreditNetwork,
      transport: http()
    })

    const transactions: BlockchainTransaction[] = []
    
    try {
      // Method 1: Fast approach - Get grant redemption events first
      console.log('🎯 Searching for grant redemption events...')
      const { GRANTS_REGISTRY } = await import('./grants-registry')
      
      // Define the event ABI for TokensRedeemed
      const redemptionEventAbi = parseAbi([
        'event TokensRedeemed(address indexed user, uint256 amount)'
      ])
      
      // Search for redemption events across all grant contracts
      for (const grant of GRANTS_REGISTRY) {
        try {
          console.log(`🔍 Checking grant: ${grant.name} at ${grant.contractAddress}`)
          
          const logs = await client.getLogs({
            address: grant.contractAddress as `0x${string}`,
            event: redemptionEventAbi[0],
            args: {
              user: address
            },
            fromBlock: 'earliest',
            toBlock: 'latest'
          })
          
          console.log(`📝 Found ${logs.length} redemption events for ${grant.name}`)
          
          for (const log of logs) {
            // Get the transaction details
            const tx = await client.getTransaction({ hash: log.transactionHash })
            const receipt = await client.getTransactionReceipt({ hash: log.transactionHash })
            const block = await client.getBlock({ blockNumber: log.blockNumber })
            
            transactions.push({
              hash: log.transactionHash,
              type: 'redemption',
              amount: formatEther(log.args.amount || 0n),
              from: tx.from,
              to: tx.to,
              timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
              status: receipt.status === 'success' ? 'completed' : 'failed',
              grantName: grant.name,
              blockNumber: Number(log.blockNumber),
              gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : undefined,
              gasPrice: tx.gasPrice ? tx.gasPrice.toString() : undefined
            })
          }
        } catch (grantError) {
          console.log(`⚠️ Could not search grant ${grant.name}:`, grantError.message)
        }
      }
      
      console.log(`✅ Found ${transactions.length} grant redemption transactions`)
      
    } catch (eventError) {
      console.log('⚠️ Event log search failed:', eventError.message)
    }
    
    // Method 2: Fallback - Search recent blocks more efficiently (last 500 blocks only)
    if (transactions.length < limit) {
      console.log('🔍 Searching recent blocks for other transactions...')
      
      const latestBlock = await client.getBlockNumber()
      const searchDepth = Math.min(500, Number(latestBlock)) // Much smaller search
      
      console.log(`📊 Latest block: ${latestBlock}, searching last ${searchDepth} blocks`)
      
      // Search recent blocks in parallel batches
      const batchSize = 50
      const batches = []
      
      for (let i = 0; i < searchDepth; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, searchDepth)
        batches.push({ start: i, end: batchEnd })
      }
      
      console.log(`🚀 Processing ${batches.length} batches in parallel...`)
      
      // Process batches in parallel for speed
      const batchPromises = batches.map(async (batch) => {
        const batchTransactions: BlockchainTransaction[] = []
        
        for (let i = batch.start; i < batch.end; i++) {
          const blockNumber = latestBlock - BigInt(i)
          
          try {
            const block = await client.getBlock({
              blockNumber,
              includeTransactions: true
            })
            
            if (!block.transactions?.length) continue
            
            for (const txData of block.transactions) {
              let tx: any
              
              if (typeof txData === 'string') {
                tx = await client.getTransaction({ hash: txData as `0x${string}` })
              } else {
                tx = txData
              }
              
              // Check if transaction involves our address and has value > 0
              if ((tx.from?.toLowerCase() === address.toLowerCase() || 
                   tx.to?.toLowerCase() === address.toLowerCase()) &&
                  tx.value && tx.value > 0n) {
                
                const receipt = await client.getTransactionReceipt({ hash: tx.hash })
                
                // Skip if this is already a known redemption
                const isDuplicate = transactions.some(existing => existing.hash === tx.hash)
                if (isDuplicate) continue
                
                batchTransactions.push({
                  hash: tx.hash,
                  type: 'transfer',
                  amount: formatEther(tx.value || 0n),
                  from: tx.from,
                  to: tx.to,
                  timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
                  status: receipt.status === 'success' ? 'completed' : 'failed',
                  blockNumber: Number(blockNumber),
                  gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : undefined,
                  gasPrice: tx.gasPrice ? tx.gasPrice.toString() : undefined
                })
              }
            }
          } catch (blockError) {
            // Skip problematic blocks
            continue
          }
        }
        
        return batchTransactions
      })
      
      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises)
      const recentTransactions = batchResults.flat()
      
      console.log(`✅ Found ${recentTransactions.length} recent transactions`)
      transactions.push(...recentTransactions)
    }
    
    // Sort by block number (most recent first) and limit
    transactions.sort((a, b) => b.blockNumber - a.blockNumber)
    const finalTransactions = transactions.slice(0, limit)
    
    console.log(`✅ Final result: ${finalTransactions.length} transactions for ${address}`)
    return finalTransactions
    
  } catch (error) {
    console.error('❌ Failed to fetch transaction history:', error)
    return []
  }
} 