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
export function formatMarsAmount(amount: string | number): string {
  const formatted = Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  })
  return `${formatted} MARS`
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`
} 