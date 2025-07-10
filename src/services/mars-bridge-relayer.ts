import { ethers } from 'ethers'
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { createMintToInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token'
import * as bs58 from 'bs58'

export interface BridgeTransaction {
  id: string
  type: 'lock' | 'burn'
  amount: string
  recipient: string
  txHash: string
  timestamp: number
  processed: boolean
}

interface BridgeConfig {
  // L1 Configuration
  l1RpcUrl: string
  l1PrivateKey: string
  bridgeContractAddress: string
  
  // Solana Configuration
  solanaRpcUrl: string
  solanaPrivateKey: string
  marsMintAddress: string
  
  // Bridge Settings
  confirmations: number
  batchSize: number
  pollInterval: number
}

interface BridgeEvent {
  user: string
  amount: string
  solanaRecipient: string
  bridgeId: string
  txHash: string
  blockNumber: number
}

interface BurnEvent {
  user: string
  amount: string
  l1Recipient: string
  txHash: string
  blockNumber: number
}

export class MarsBridgeRelayer {
  private l1Provider: ethers.JsonRpcProvider
  private l1Wallet: ethers.Wallet
  private l1BridgeContract: ethers.Contract
  
  private solanaConnection: Connection
  private solanaKeypair: any
  private marsMint: PublicKey
  private marsTokenAccount: PublicKey
  
  private isRunning: boolean = false
  private config: BridgeConfig
  private processedTxs: Set<string> = new Set()
  
  constructor(config: BridgeConfig) {
    this.config = config
    this.initializeL1()
    this.initializeSolana()
  }
  
  private initializeL1(): void {
    // Initialize L1 provider and wallet
    this.l1Provider = new ethers.JsonRpcProvider(this.config.l1RpcUrl)
    this.l1Wallet = new ethers.Wallet(this.config.l1PrivateKey, this.l1Provider)
    
    // Initialize bridge contract
    const bridgeABI = [
      'event TokensLocked(address indexed user, uint256 amount, string solanaRecipient, uint256 indexed bridgeId)',
      'event TokensUnlocked(address indexed recipient, uint256 amount, bytes32 indexed solanaTxId, uint256 indexed bridgeId)',
      'function unlockTokens(address indexed recipient, uint256 amount, bytes32 solanaTxId) external',
      'function getBridgeStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
      'function isSolanaTxProcessed(bytes32 solanaTxId) external view returns (bool)'
    ]
    
    this.l1BridgeContract = new ethers.Contract(
      this.config.bridgeContractAddress,
      bridgeABI,
      this.l1Wallet
    )
    
    console.log('✅ L1 Bridge initialized with NEW secure contract:', this.config.bridgeContractAddress)
  }
  
  private initializeSolana(): void {
    // Initialize Solana connection
    this.solanaConnection = new Connection(this.config.solanaRpcUrl, 'confirmed')
    
    // Initialize wallet from private key
    const secretKey = Uint8Array.from(JSON.parse(this.config.solanaPrivateKey))
    this.solanaKeypair = bs58.decode(this.config.solanaPrivateKey) // Assuming solanaPrivateKey is base58 encoded
    this.solanaKeypair = bs58.decode(this.config.solanaPrivateKey) // Assuming solanaPrivateKey is base58 encoded
    
    this.marsMint = new PublicKey(this.config.marsMintAddress)
    this.marsTokenAccount = new PublicKey(this.config.marsTokenAccount)
    
    console.log('✅ Solana Bridge initialized')
    console.log('   Mars Mint:', this.config.marsMintAddress)
    console.log('   Relayer Address:', this.solanaKeypair.publicKey.toString())
  }
  
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Relayer already running')
      return
    }
    
    this.isRunning = true
    console.log('🚀 Mars Bridge Relayer starting...')
    
    // Start monitoring both chains
    this.startL1Monitoring()
    this.startSolanaMonitoring()
    
    console.log('✅ Mars Bridge Relayer started successfully')
  }
  
  public async stop(): Promise<void> {
    this.isRunning = false
    console.log('⏹️ Mars Bridge Relayer stopped')
  }
  
  private async startL1Monitoring(): Promise<void> {
    console.log('👁️ Starting L1 monitoring...')
    
    // Listen for TokensLocked events
    this.l1BridgeContract.on('TokensLocked', async (user, amount, solanaRecipient, bridgeId, event) => {
      console.log('🔒 L1 Lock detected:', {
        user,
        amount: ethers.formatEther(amount),
        solanaRecipient,
        bridgeId: bridgeId.toString(),
        txHash: event.transactionHash
      })
      
      try {
        await this.handleL1Lock({
          user,
          amount,
          solanaRecipient,
          bridgeId,
          txHash: event.transactionHash
        })
      } catch (error) {
        console.error('❌ Error handling L1 lock:', error)
      }
    })
    
    console.log('✅ L1 monitoring active')
  }
  
  private async startSolanaMonitoring(): Promise<void> {
    console.log('👁️ Starting Solana monitoring...')
    
    // Poll for burn events by monitoring token account changes
    setInterval(async () => {
      if (!this.isRunning) return
      
      try {
        await this.checkSolanaBurnEvents()
      } catch (error) {
        console.error('❌ Error checking Solana burn events:', error)
      }
    }, this.config.pollInterval)
    
    console.log('✅ Solana monitoring active')
  }
  
  private async handleL1Lock(lockData: any): Promise<void> {
    console.log('🔄 Processing L1 lock -> Solana mint...')
    
    try {
      // Get user's Solana token account
      const userPubkey = new PublicKey(lockData.solanaRecipient)
      const userTokenAccount = await getAssociatedTokenAddress(
        this.marsMint,
        userPubkey
      )
      
      // Check if token account exists
      const accountInfo = await this.solanaConnection.getAccountInfo(userTokenAccount)
      
      // Build transaction
      const transaction = new Transaction()
      
      // Create token account if it doesn't exist
      if (!accountInfo) {
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          this.solanaKeypair.publicKey, // payer
          userTokenAccount, // associated token account
          userPubkey, // owner
          this.marsMint // mint
        )
        transaction.add(createATAInstruction)
      }
      
      // Add mint instruction
      const mintInstruction = createMintToInstruction(
        this.marsMint, // mint
        userTokenAccount, // destination
        this.solanaKeypair.publicKey, // authority
        BigInt(lockData.amount.toString()) // amount
      )
      
      transaction.add(mintInstruction)
      
      // Send transaction
      const signature = await sendAndConfirmTransaction(
        this.solanaConnection,
        transaction,
        [this.solanaKeypair],
        { commitment: 'confirmed' }
      )
      
      console.log('✅ Solana mint successful:', signature)
      
    } catch (error) {
      console.error('❌ L1 lock processing failed:', error)
      throw error
    }
  }
  
  private async checkSolanaBurnEvents(): Promise<void> {
    // Monitor for burn transactions (simplified approach)
    // In production, you'd want to store state and monitor specific events
    console.log('👁️ Checking for Solana burn events...')
    
    // Get recent signatures for our wallet
    const signatures = await this.solanaConnection.getSignaturesForAddress(
      this.solanaKeypair.publicKey,
      { limit: 10 }
    )
    
    for (const sig of signatures) {
      if (this.processedTxs.has(sig.signature)) {
        continue
      }
      
      try {
        const tx = await this.solanaConnection.getTransaction(sig.signature, {
          commitment: 'confirmed'
        })
        
        if (tx?.meta?.logMessages) {
          // Look for burn operations in the transaction
          const burnEvent = this.parseBurnFromLogs(tx.meta.logMessages)
          if (burnEvent) {
            await this.handleSolanaBurn(burnEvent, sig.signature)
            this.processedTxs.add(sig.signature)
          }
        }
      } catch (error) {
        console.error('❌ Error processing Solana transaction:', error)
      }
    }
  }
  
  private parseBurnFromLogs(logs: string[]): any | null {
    // This is a simplified parser - in production you'd want more robust parsing
    for (const log of logs) {
      if (log.includes('burn') && log.includes('amount')) {
        try {
          // Extract burn information from logs
          // This is a placeholder - implement based on your transaction structure
          return {
            amount: '1000000000000000000', // placeholder
            l1_recipient: '0x1234567890123456789012345678901234567890' // placeholder
          }
        } catch (error) {
          console.error('❌ Error parsing burn event:', error)
        }
      }
    }
    return null
  }
  
  private async handleSolanaBurn(burnData: any, solanaTxId: string): Promise<void> {
    console.log('🔄 Processing Solana burn -> L1 unlock...')
    
    try {
      // Check if already processed
      const isProcessed = await this.l1BridgeContract.isSolanaTxProcessed(
        ethers.id(solanaTxId)
      )
      
      if (isProcessed) {
        console.log('⏭️ Transaction already processed:', solanaTxId)
        return
      }
      
      // Execute unlock on L1
      const tx = await this.l1BridgeContract.unlockTokens(
        burnData.l1_recipient,
        burnData.amount,
        ethers.id(solanaTxId),
        {
          gasLimit: 21000, // Default gas limit for unlock
          gasPrice: ethers.parseUnits('0.1', 'gwei') // Mars Credit Network gas price
        }
      )
      
      const receipt = await tx.wait()
      console.log('✅ L1 unlock successful:', receipt.transactionHash)
      
    } catch (error) {
      console.error('❌ Solana burn processing failed:', error)
      throw error
    }
  }
  
  public async getBridgeStats(): Promise<any> {
    try {
      // Get L1 stats
      const l1Stats = await this.l1BridgeContract.getBridgeStats()
      
      // Get Solana mint info
      const mintInfo = await getAccount(this.solanaConnection, this.marsMint)
      
      return {
        l1: {
          totalLocked: ethers.formatEther(l1Stats[0]),
          contractBalance: ethers.formatEther(l1Stats[1]),
          bridgeCount: l1Stats[2].toString(),
          minAmount: ethers.formatEther(l1Stats[3]),
          maxAmount: ethers.formatEther(l1Stats[4]),
          feePercentage: l1Stats[5].toString()
        },
        solana: {
          totalSupply: mintInfo.supply.toString(),
          mintAuthority: mintInfo.mintAuthority?.toString(),
          freezeAuthority: mintInfo.freezeAuthority?.toString(),
          isInitialized: mintInfo.isInitialized
        }
      }
    } catch (error) {
      console.error('❌ Error getting bridge stats:', error)
      throw error
    }
  }
} 