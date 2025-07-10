'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { parseEther, formatEther } from 'viem'
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createBurnInstruction, getAccount } from '@solana/spl-token'

interface BridgeDirection {
  from: 'L1' | 'Solana'
  to: 'L1' | 'Solana'
}

interface BridgeStats {
  l1: {
    totalLocked: string
    contractBalance: string
    bridgeCount: string
    minAmount: string
    maxAmount: string
    feePercentage: string
  }
  solana: {
    totalSupply: string
    decimals: number
    mintAuthority: string | null
  }
}

export function MarsBridge() {
  // State
  const [direction, setDirection] = useState<BridgeDirection>({ from: 'L1', to: 'Solana' })
  const [amount, setAmount] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [stats, setStats] = useState<BridgeStats | null>(null)
  const [error, setError] = useState('')
  const [bridgeConfig, setBridgeConfig] = useState<{
    bridgeContract: string
    marsMint: string
  } | null>(null)

  // Wallet connections
  const { address: l1Address, isConnected: l1Connected } = useAccount()
  
  // Solana wallet - handle case where provider might not be available
  const walletContext = useWallet()
  const solanaAddress = walletContext?.publicKey
  const solanaConnected = walletContext?.connected || false
  const signTransaction = walletContext?.signTransaction

  // Load bridge configuration from environment variables
  useEffect(() => {
    const loadBridgeConfig = async () => {
      try {
        // Use Next.js environment variables (NEXT_PUBLIC_ prefix makes them available in browser)
        const bridgeContract = process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS || '0x483c7120e93651a0f2b0085Fa50FBB6217aA87ec';
        const marsMint = process.env.NEXT_PUBLIC_SOLANA_MINT_ADDRESS || '5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs';
        
        setBridgeConfig({
          bridgeContract,
          marsMint
        });
        
        console.log('✅ Bridge config loaded from environment variables');
        console.log('   Bridge Contract:', bridgeContract);
        console.log('   Solana Mint:', marsMint);
        
      } catch (error) {
        console.warn('Failed to load bridge config, using fallback:', error);
        // Fallback to new secure contract
        setBridgeConfig({
          bridgeContract: '0x483c7120e93651a0f2b0085Fa50FBB6217aA87ec',
          marsMint: '5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs'
        });
      }
    };

    loadBridgeConfig();
  }, []);

  // Constants - Now using environment variables
  const BRIDGE_CONTRACT_ADDRESS = bridgeConfig?.bridgeContract || '0x483c7120e93651a0f2b0085Fa50FBB6217aA87ec';
  const MARS_MINT_ADDRESS = bridgeConfig?.marsMint || '5Crb9yCXHGiib5nn6tZAA5qChD8F1tARY9GkSSbgGpAs';
  const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  // Note: MARS is the native currency of Mars Credit Network (like ETH), not an ERC-20 token

  // Bridge contract ABI - for native MARS coin bridging
  const bridgeABI = [
    {
      "inputs": [
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "string", "name": "solanaRecipient", "type": "string"}
      ],
      "name": "lockTokens",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "recipient", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "bytes32", "name": "solanaTxId", "type": "bytes32"}
      ],
      "name": "unlockTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const

  // Wagmi hooks
  const { writeContract, data: hash, error: contractError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Load bridge stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/bridge/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (err) {
        console.error('Failed to fetch bridge stats:', err)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Auto-fill recipient address based on connected wallets
  useEffect(() => {
    if (direction.from === 'L1' && direction.to === 'Solana') {
      // L1 → Solana: Use Solana address if available, otherwise keep manual input
      if (solanaAddress && !recipientAddress) {
        setRecipientAddress(solanaAddress.toString())
      }
    } else if (direction.from === 'Solana' && direction.to === 'L1') {
      // Solana → L1: Use L1 address if available, otherwise keep manual input
      if (l1Address && !recipientAddress) {
        setRecipientAddress(l1Address)
      }
    }
  }, [direction, solanaAddress, l1Address, recipientAddress])

  // Handle direction change
  const handleDirectionChange = () => {
    setDirection(prev => ({
      from: prev.to,
      to: prev.from
    }))
    setAmount('')
    setRecipientAddress('')
    setError('')
  }

  // Get required wallet connection status
  const getWalletRequirement = () => {
    if (direction.from === 'L1') {
      return {
        required: 'L1 wallet (MetaMask)',
        connected: l1Connected,
        optional: 'Solana wallet (for auto-fill address)'
      }
    } else {
      return {
        required: 'Solana wallet (Phantom)',
        connected: solanaConnected,
        optional: 'L1 wallet (for auto-fill address)'
      }
    }
  }

  // Handle bridge transaction
  const handleBridge = async () => {
    if (!amount || !recipientAddress) {
      setError('Please fill in all fields')
      return
    }

    if (!bridgeConfig) {
      setError('Bridge configuration not loaded yet, please wait...')
      return
    }

    // Validate recipient address format
    if (direction.to === 'Solana') {
      try {
        new PublicKey(recipientAddress)
      } catch {
        setError('Invalid Solana address format')
        return
      }
    } else {
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
        setError('Invalid L1 address format')
        return
      }
    }

    setIsProcessing(true)
    setError('')

    try {
      if (direction.from === 'L1') {
        // L1 to Solana bridge
        if (!l1Connected) {
          setError('Please connect your L1 wallet (MetaMask)')
          return
        }

        const bridgeAmount = parseEther(amount)
        
        console.log('🌉 Bridging to new secure contract:', BRIDGE_CONTRACT_ADDRESS)
        
        // Call bridge contract - send native MARS coins as value
        writeContract({
          address: BRIDGE_CONTRACT_ADDRESS as `0x${string}`,
          abi: bridgeABI,
          functionName: 'lockTokens',
          args: [bridgeAmount, recipientAddress],
          value: bridgeAmount // Send native MARS coins
        })

      } else {
        // Solana to L1 bridge
        if (!solanaConnected || !signTransaction) {
          setError('Please connect your Solana wallet (Phantom)')
          return
        }

        const connection = new Connection(SOLANA_RPC_URL)
        const fromPubkey = new PublicKey(solanaAddress!.toString())
        const mintPubkey = new PublicKey(MARS_MINT_ADDRESS)
        
        // Get associated token account
        const tokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey)
        
        // Create burn instruction (9 decimals for new MARS token)
        const burnAmount = BigInt(Math.floor(parseFloat(amount) * 1e9))
        const burnInstruction = createBurnInstruction(
          tokenAccount,
          mintPubkey,
          fromPubkey,
          burnAmount
        )

        // Create transaction
        const transaction = new Transaction().add(burnInstruction)
        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = fromPubkey

        // Sign and send transaction
        const signedTransaction = await signTransaction(transaction)
        const signature = await connection.sendRawTransaction(signedTransaction.serialize())
        
        setTxHash(signature)
        console.log('Burn transaction sent:', signature)
      }
    } catch (err) {
      console.error('Bridge error:', err)
      setError(err instanceof Error ? err.message : 'Bridge transaction failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle successful L1 transaction
  useEffect(() => {
    if (isSuccess && hash) {
      setTxHash(hash)
      setAmount('')
      setRecipientAddress('')
      setIsProcessing(false)
    }
  }, [isSuccess, hash])

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      setError(contractError.message)
      setIsProcessing(false)
    }
  }, [contractError])

  const walletReq = getWalletRequirement()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Bridge Direction Toggle */}
      <div className="mb-8">
        <div className="mars-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-300">Mars Credit Network</h3>
              <p className="text-red-400/60 text-sm">Native MARS</p>
            </div>
            
            <button
              onClick={handleDirectionChange}
              className="mars-button p-3 rounded-xl hover:bg-red-700 transition-all"
              title="Switch Direction"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-300">Solana</h3>
              <p className="text-red-400/60 text-sm">Wrapped MARS</p>
            </div>
          </div>
          
          <div className="text-center">
            <span className="text-red-400 font-medium">
              {direction.from} → {direction.to}
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Contract Info */}
      {bridgeConfig && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-600/30 rounded-xl">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-400 text-sm font-medium">New Secure Bridge Active</span>
          </div>
          <div className="text-green-300/80 text-xs font-mono">{bridgeConfig.bridgeContract}</div>
        </div>
      )}

      {/* Main Bridge Interface */}
      <div className="mars-card p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-6 mars-glow-text">Bridge MARS</h2>
        
        {/* Wallet Connection Status - Only show required wallet */}
        <div className="mb-6 p-4 bg-black/30 rounded-xl border border-red-600/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-400">Required:</span>
            <span className={walletReq.connected ? 'text-green-400' : 'text-red-400'}>
              {walletReq.required} {walletReq.connected ? '✅' : '❌'}
            </span>
          </div>
          {!walletReq.connected && (
            <div className="text-red-400/80 text-sm">
              Connect your {walletReq.required} to continue
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-red-400/60 mt-2">
            <span>Optional:</span>
            <span>{walletReq.optional}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-red-400 text-sm font-medium mb-2">
            Amount (MARS)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-black/50 border border-red-600/30 rounded-xl px-4 py-3 text-white placeholder-red-400/50 focus:outline-none focus:border-red-500"
            step="0.000001"
            min="0"
          />
          <div className="mt-2 text-xs text-red-400/60">
            Min: {stats?.l1.minAmount || '10'} MARS • Max: {stats?.l1.maxAmount || '1,000,000'} MARS • Fee: {stats?.l1.feePercentage || '0.1'}%
          </div>
        </div>

        {/* Recipient Address */}
        <div className="mb-6">
          <label className="block text-red-400 text-sm font-medium mb-2">
            Recipient Address ({direction.to === 'Solana' ? 'Solana' : 'L1'})
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder={direction.to === 'Solana' ? 'Solana address (e.g., 9WzDXwBbmkg...)' : 'L1 address (e.g., 0x123...)'}
            className="w-full bg-black/50 border border-red-600/30 rounded-xl px-4 py-3 text-white placeholder-red-400/50 focus:outline-none focus:border-red-500"
          />
          <div className="mt-2 text-xs text-red-400/60">
            {direction.to === 'Solana' && solanaConnected && (
              <span>✅ Auto-filled from connected Solana wallet</span>
            )}
            {direction.to === 'L1' && l1Connected && (
              <span>✅ Auto-filled from connected L1 wallet</span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-xl">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {txHash && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-600/50 rounded-xl">
            <p className="text-green-300 text-sm mb-2">Transaction submitted!</p>
            <a
              href={direction.from === 'L1' 
                ? `https://blockscan.marscredit.xyz/tx/${txHash}`
                : `https://explorer.solana.com/tx/${txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 text-xs font-mono break-all"
            >
              {txHash}
            </a>
          </div>
        )}

        {/* Bridge Button */}
        <button
          onClick={handleBridge}
          disabled={isProcessing || isPending || isConfirming || !amount || !recipientAddress || !walletReq.connected || !bridgeConfig}
          className="w-full mars-button py-4 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!bridgeConfig ? 'Loading bridge configuration...' :
           isProcessing || isPending || isConfirming 
            ? 'Processing...' 
            : `Bridge ${direction.from} → ${direction.to}`
          }
        </button>

        {/* Bridge Instructions */}
        <div className="mt-6 p-4 bg-black/30 rounded-xl border border-red-600/20">
          <h3 className="text-red-400 font-medium mb-2">How it works:</h3>
          <div className="text-sm text-red-400/80 space-y-1">
            {direction.from === 'L1' ? (
               <>
                 <p>1. Connect your L1 wallet (MetaMask)</p>
                 <p>2. Enter Solana recipient address</p>
                 <p>3. Send native MARS coins to bridge contract</p>
                 <p>4. Relayer mints MARS tokens on Solana (~2-5 min)</p>
                 <p className="text-red-300 text-xs mt-2">💡 No approval needed - native coins!</p>
               </>
             ) : (
               <>
                 <p>1. Connect your Solana wallet (Phantom)</p>
                 <p>2. Enter L1 recipient address</p>
                 <p>3. Bridge burns MARS tokens on Solana</p>
                 <p>4. Relayer releases native MARS coins on L1 (~2-5 min)</p>
                 <p className="text-red-300 text-xs mt-2">💡 No L1 wallet connection needed!</p>
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}