'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import Layout from '@/components/Layout'
import { formatMarsAmount, truncateAddress } from '@/lib/contracts'
import { ConnectWallet } from '@/components/ConnectWallet'

interface Grant {
  id: string
  name: string
  description: string
  contractAddress: string
  totalTokens: string
  redemptionAmount: string
  remainingTokens: string
  remainingRedemptions: number
  isActive: boolean
  deployedAt: string
}

interface TransactionStatus {
  hash?: string
  status: 'idle' | 'pending' | 'success' | 'error'
  error?: string
}

export default function GrantDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [grant, setGrant] = useState<Grant | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasRedeemed, setHasRedeemed] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [transaction, setTransaction] = useState<TransactionStatus>({ status: 'idle' })

  useEffect(() => {
    // Mock grant data - in a real app, this would come from the blockchain
    const mockGrants: Grant[] = [
      {
        id: '1',
        name: 'Genesis Mars Grant',
        description: 'Initial token distribution for early Mars Credit Network adopters. This grant marks the beginning of the Mars Credit Network ecosystem, providing the first opportunity for users to claim MARS tokens and participate in the network.',
        contractAddress: '0x742d35Cc6634C0532925a3b8d123456789AbCdEf',
        totalTokens: '10000',
        redemptionAmount: '1',
        remainingTokens: '8750',
        remainingRedemptions: 8750,
        isActive: true,
        deployedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        name: 'Community Rewards Grant',
        description: 'Rewards for active community members and contributors who have helped build and support the Mars Credit Network ecosystem.',
        contractAddress: '0x123456789AbCdEf742d35Cc6634C0532925a3b8d',
        totalTokens: '5000',
        redemptionAmount: '0.5',
        remainingTokens: '4200',
        remainingRedemptions: 8400,
        isActive: true,
        deployedAt: '2024-01-20T14:30:00Z'
      },
      {
        id: '3',
        name: 'Developer Incentive Grant',
        description: 'Special grant for developers building on Mars Credit Network. This completed grant was designed to incentivize early development.',
        contractAddress: '0xAbCdEf742d35Cc6634C0532925a3b8d123456789',
        totalTokens: '7500',
        redemptionAmount: '2',
        remainingTokens: '0',
        remainingRedemptions: 0,
        isActive: false,
        deployedAt: '2024-01-10T09:15:00Z'
      }
    ]

    const foundGrant = mockGrants.find(g => g.id === params.id)
    
    // Simulate loading delay
    setTimeout(() => {
      setGrant(foundGrant || null)
      setLoading(false)
      
      // Mock check if user has already redeemed
      if (foundGrant && address) {
        // In a real app, this would check the smart contract
        const mockHasRedeemed = Math.random() > 0.7 // 30% chance user has already redeemed
        setHasRedeemed(mockHasRedeemed)
      }
    }, 1000)
  }, [params.id, address])

  const handleRedeemClick = () => {
    if (!isConnected || !address) return
    setShowConfirmation(true)
  }

  const handleConfirmRedeem = async () => {
    if (!grant || !address) return

    setShowConfirmation(false)
    setTransaction({ status: 'pending' })

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Mock success or failure
      const success = Math.random() > 0.2 // 80% success rate
      
      if (success) {
        const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')
        setTransaction({ 
          status: 'success',
          hash: mockTxHash
        })
        setHasRedeemed(true)
        
        // Update grant remaining tokens
        const newRemainingTokens = (parseFloat(grant.remainingTokens) - parseFloat(grant.redemptionAmount)).toString()
        setGrant({
          ...grant,
          remainingTokens: newRemainingTokens,
          remainingRedemptions: grant.remainingRedemptions - 1
        })
      } else {
        const errors = [
          'Grant fully redeemed',
          'Insufficient contract balance',
          'Address has already redeemed',
          'Transaction rejected by user',
          'Network congestion - try again later'
        ]
        const randomError = errors[Math.floor(Math.random() * errors.length)]
        setTransaction({ 
          status: 'error',
          error: randomError
        })
      }
    } catch (error) {
      setTransaction({ 
        status: 'error',
        error: 'Unexpected error occurred'
      })
    }
  }

  const resetTransaction = () => {
    setTransaction({ status: 'idle' })
  }

  if (loading) {
    return (
      <Layout>
        <div className="py-20">
          <div className="mars-container">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 mars-spinner"></div>
              <p className="text-red-400">Loading grant details...</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!grant) {
    return (
      <Layout>
        <div className="py-20">
          <div className="mars-container text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-6 flex items-center justify-center opacity-50">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-red-300">Grant Not Found</h1>
            <p className="text-red-400/80 mb-8">The grant you're looking for doesn't exist or has been removed.</p>
            <button 
              onClick={() => router.push('/grants')}
              className="mars-button px-6 py-3 text-white font-medium rounded-lg"
            >
              Back to Grants
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="py-20">
        <div className="mars-container max-w-4xl mx-auto">
          {/* Back Button */}
          <button 
            onClick={() => router.push('/grants')}
            className="flex items-center text-red-400 hover:text-red-300 mb-8 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Grants
          </button>

          {/* Grant Header */}
          <div className="mars-card rounded-xl p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 mars-glow-text">
                  {grant.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${grant.isActive 
                    ? 'bg-green-900/30 text-green-400 border border-green-600/30' 
                    : 'bg-red-900/30 text-red-400 border border-red-600/30'
                  }`}>
                    {grant.isActive ? 'Active Grant' : 'Grant Completed'}
                  </span>
                  <span className="text-red-400/60">
                    Deployed {new Date(grant.deployedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-red-400/80 leading-relaxed mb-6">
              {grant.description}
            </p>

            {/* Grant Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {formatMarsAmount(grant.totalTokens)}
                </div>
                <div className="text-red-400/80 text-sm">Total Pool</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {formatMarsAmount(grant.redemptionAmount)}
                </div>
                <div className="text-red-400/80 text-sm">Per Address</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {formatMarsAmount(grant.remainingTokens)}
                </div>
                <div className="text-red-400/80 text-sm">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {grant.remainingRedemptions.toLocaleString()}
                </div>
                <div className="text-red-400/80 text-sm">Claims Left</div>
              </div>
            </div>
          </div>

          {/* Redemption Interface */}
          <div className="mars-card rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-red-300">Token Redemption</h2>

            {!isConnected ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-red-300">Connect Your Wallet</h3>
                <p className="text-red-400/80 mb-4">You need to connect your wallet to redeem tokens</p>
                                  <ConnectWallet />
              </div>
            ) : (
              <div>
                {/* Wallet Address */}
                <div className="mb-6">
                  <label className="block text-red-400/80 text-sm mb-2">Your Wallet Address</label>
                  <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                    <span className="text-red-300 font-mono">{address}</span>
                  </div>
                </div>

                {/* Redemption Amount */}
                <div className="mb-6">
                  <label className="block text-red-400/80 text-sm mb-2">Redemption Amount</label>
                  <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                    <span className="text-red-300 text-lg font-semibold">
                      {formatMarsAmount(grant.redemptionAmount)}
                    </span>
                  </div>
                </div>

                {/* Status Messages */}
                {hasRedeemed && (
                  <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-yellow-300 font-medium">Already Redeemed</span>
                    </div>
                    <p className="text-yellow-400/80 text-sm mt-1">
                      This address has already redeemed tokens from this grant.
                    </p>
                  </div>
                )}

                {!grant.isActive && (
                  <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-300 font-medium">Grant Completed</span>
                    </div>
                    <p className="text-red-400/80 text-sm mt-1">
                      This grant has been fully redeemed and is no longer active.
                    </p>
                  </div>
                )}

                {parseFloat(grant.remainingTokens) < parseFloat(grant.redemptionAmount) && grant.isActive && (
                  <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-300 font-medium">Insufficient Tokens</span>
                    </div>
                    <p className="text-red-400/80 text-sm mt-1">
                      Not enough tokens remaining in the grant for redemption.
                    </p>
                  </div>
                )}

                {/* Transaction Status */}
                {transaction.status === 'pending' && (
                  <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <div className="w-5 h-5 mars-spinner mr-2"></div>
                      <span className="text-blue-300 font-medium">Transaction Pending</span>
                    </div>
                    <p className="text-blue-400/80 text-sm mt-1">
                      Please wait while your transaction is being processed...
                    </p>
                  </div>
                )}

                {transaction.status === 'success' && (
                  <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-300 font-medium">Redemption Successful!</span>
                    </div>
                    <p className="text-green-400/80 text-sm mt-1 mb-2">
                      You have successfully redeemed {formatMarsAmount(grant.redemptionAmount)}.
                    </p>
                    {transaction.hash && (
                      <p className="text-green-400/80 text-sm font-mono">
                        TX: {truncateAddress(transaction.hash, 8)}
                      </p>
                    )}
                  </div>
                )}

                {transaction.status === 'error' && (
                  <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-300 font-medium">Transaction Failed</span>
                    </div>
                    <p className="text-red-400/80 text-sm mt-1">
                      {transaction.error || 'An error occurred during the transaction.'}
                    </p>
                    <button 
                      onClick={resetTransaction}
                      className="text-red-300 hover:text-red-200 text-sm mt-2 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={handleRedeemClick}
                  disabled={
                    hasRedeemed || 
                    !grant.isActive || 
                    parseFloat(grant.remainingTokens) < parseFloat(grant.redemptionAmount) ||
                    transaction.status === 'pending' ||
                    transaction.status === 'success'
                  }
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                    hasRedeemed || 
                    !grant.isActive || 
                    parseFloat(grant.remainingTokens) < parseFloat(grant.redemptionAmount) ||
                    transaction.status === 'pending' ||
                    transaction.status === 'success'
                      ? 'mars-button:disabled'
                      : 'mars-button text-white'
                  }`}
                >
                  {transaction.status === 'pending' 
                    ? 'Processing...' 
                    : transaction.status === 'success'
                    ? 'Redeemed Successfully'
                    : hasRedeemed 
                    ? 'Already Redeemed'
                    : !grant.isActive
                    ? 'Grant Completed'
                    : parseFloat(grant.remainingTokens) < parseFloat(grant.redemptionAmount)
                    ? 'Insufficient Tokens'
                    : `Redeem ${formatMarsAmount(grant.redemptionAmount)}`
                  }
                </button>
              </div>
            )}
          </div>

          {/* Contract Information */}
          <div className="mars-card rounded-xl p-6 mt-8">
            <h3 className="text-lg font-semibold mb-4 text-red-300">Contract Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-red-400/80">Contract Address:</span>
                <span className="text-red-300 font-mono text-sm">{grant.contractAddress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-400/80">Chain ID:</span>
                <span className="text-red-300">110110 (Mars Credit Network)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-400/80">Network:</span>
                <span className="text-red-300">Mars Credit Network</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="mars-card rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-red-300">Confirm Redemption</h3>
            <p className="text-red-400/80 mb-6">
              You are about to redeem <span className="text-red-300 font-semibold">{formatMarsAmount(grant.redemptionAmount)}</span> from {grant.name}. 
              This will require a blockchain transaction.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-3 px-4 bg-red-900/30 border border-red-600/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRedeem}
                className="flex-1 py-3 px-4 mars-button text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
} 