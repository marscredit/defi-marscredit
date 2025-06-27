'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseAbi } from 'viem'
import Layout from '@/components/Layout'
import { formatMarsAmount, truncateAddress } from '@/lib/contracts'
import { ConnectWallet } from '@/components/ConnectWallet'
import GaslessRedemption from '@/components/GaslessRedemption'
import { loadGrantByAddress, hasUserRedeemed, LiveGrantData } from '@/lib/grants-registry'

interface TransactionStatus {
  hash?: string
  status: 'idle' | 'pending' | 'success' | 'error'
  error?: string
}

// SimpleTokenGrant ABI for redemption
const REDEMPTION_ABI = parseAbi([
  'function redeemTokens() external'
])

export default function GrantDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const router = useRouter()
  const { address: userAddress, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [grant, setGrant] = useState<LiveGrantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasRedeemed, setHasRedeemed] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [transaction, setTransaction] = useState<TransactionStatus>({ status: 'idle' })
  const [contractAddress, setContractAddress] = useState<string>('')

  // Load grant data from blockchain
  const loadGrantData = async (address: string) => {
    try {
      setLoading(true)
      console.log('🔍 Loading grant data for contract:', address)
      
      const grantData = await loadGrantByAddress(address)
      
      if (grantData) {
        console.log('✅ Loaded grant data:', grantData)
        setGrant(grantData)
        
        // Check if user has already redeemed
        if (userAddress) {
          console.log('🔍 Checking redemption status for user:', userAddress)
          const userHasRedeemed = await hasUserRedeemed(
            address as `0x${string}`, 
            userAddress as `0x${string}`
          )
          console.log('✅ User redemption status:', userHasRedeemed)
          setHasRedeemed(userHasRedeemed)
        }
      } else {
        console.log('❌ Grant not found for address:', address)
        setGrant(null)
      }
    } catch (error) {
      console.error('❌ Failed to load grant data:', error)
      setGrant(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Handle async params in Next.js 15
    const initializeData = async () => {
      const resolvedParams = await params
      setContractAddress(resolvedParams.address)
      await loadGrantData(resolvedParams.address)
    }
    
    initializeData()
  }, []) // Remove params from dependency array since it's a Promise

  // Separate effect for user address changes
  useEffect(() => {
    if (contractAddress && userAddress) {
      loadGrantData(contractAddress)
    }
  }, [userAddress, contractAddress])

  const handleRedeemClick = () => {
    if (!isConnected || !userAddress) return
    setShowConfirmation(true)
  }

  const handleConfirmRedeem = async () => {
    if (!grant || !userAddress || !walletClient) return

    setShowConfirmation(false)
    setTransaction({ status: 'pending' })

    try {
      console.log('🚀 Calling redeemTokens() on contract:', contractAddress)
      
      // Call the smart contract redeemTokens function
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: REDEMPTION_ABI,
        functionName: 'redeemTokens'
      })

      console.log('📝 Transaction submitted:', hash)
      setTransaction({ 
        status: 'pending',
        hash: hash 
      })

      // Wait for transaction confirmation
      if (publicClient) {
        console.log('⏳ Waiting for transaction confirmation...')
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: hash 
        })

        console.log('✅ Transaction confirmed:', receipt)
        setTransaction({ 
          status: 'success',
          hash: hash
        })
        setHasRedeemed(true)
        
        // Reload grant data to get updated numbers
        await loadGrantData(contractAddress)
      }
    } catch (error: any) {
      console.error('❌ Transaction failed:', error)
      
      let errorMessage = 'Transaction failed'
      
      // Parse common error types
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient MARS for gas fees'
      } else if (error.message?.includes('already redeemed')) {
        errorMessage = 'Address has already redeemed'
      } else if (error.message?.includes('Insufficient tokens')) {
        errorMessage = 'Grant fully redeemed'
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage
      }
      
      setTransaction({ 
        status: 'error',
        error: errorMessage
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
              <p className="text-red-400">Loading grant details from blockchain...</p>
              <p className="text-red-400/60 text-sm mt-2">Reading contract: {contractAddress || 'Loading...'}</p>
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
            <p className="text-red-400/80 mb-4">The grant contract you're looking for doesn't exist in our registry.</p>
            <p className="text-red-400/60 text-sm mb-8 font-mono">Contract: {contractAddress}</p>
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
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    grant.status === 'Active' 
                      ? 'bg-green-900/30 text-green-400 border border-green-600/30'
                      : grant.status === 'Paused'
                      ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/30'
                      : 'bg-red-900/30 text-red-400 border border-red-600/30'
                  }`}>
                    {grant.status}
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
                  {grant.totalPool}
                </div>
                <div className="text-red-400/80 text-sm">Total Pool</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {grant.perAddress}
                </div>
                <div className="text-red-400/80 text-sm">Per Address</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {grant.remaining}
                </div>
                <div className="text-red-400/80 text-sm">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {grant.claimsLeft.toLocaleString()}
                </div>
                <div className="text-red-400/80 text-sm">Claims Left</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-red-400/80 text-sm">Progress</span>
                <span className="text-red-400/80 text-sm">{grant.progress}%</span>
              </div>
              <div className="w-full bg-red-900/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${grant.progress}%` }}
                ></div>
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
                    <span className="text-red-300 font-mono">{userAddress}</span>
                  </div>
                </div>

                {/* Redemption Amount */}
                <div className="mb-6">
                  <label className="block text-red-400/80 text-sm mb-2">Redemption Amount</label>
                  <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                    <span className="text-red-300 text-lg font-semibold">
                      {grant.perAddress}
                    </span>
                  </div>
                </div>

                {/* Gas Fees Included Notice */}
                {!hasRedeemed && grant.status === 'Active' && grant.claimsLeft > 0 && (
                  <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-300 font-medium">Gas Fees Included</span>
                    </div>
                    <p className="text-green-400/80 text-sm mt-1">
                      Your redemption includes an extra 0.01 MARS for gas fees. No additional MARS needed!
                    </p>
                  </div>
                )}

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

                {grant.status === 'Completed' && (
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

                {grant.status === 'Paused' && (
                  <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-yellow-300 font-medium">Grant Paused</span>
                    </div>
                    <p className="text-yellow-400/80 text-sm mt-1">
                      This grant is temporarily paused and not accepting redemptions.
                    </p>
                  </div>
                )}

                {grant.claimsLeft <= 0 && grant.status === 'Active' && (
                  <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-300 font-medium">No Claims Left</span>
                    </div>
                    <p className="text-red-400/80 text-sm mt-1">
                      All available claims have been redeemed from this grant.
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
                      Please confirm in your wallet and wait for blockchain confirmation...
                    </p>
                    {transaction.hash && (
                      <p className="text-blue-400/80 text-sm font-mono mt-2">
                        TX: {truncateAddress(transaction.hash, 8)}
                      </p>
                    )}
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
                      You have successfully redeemed {grant.perAddress}.
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

                {/* Gasless Redemption Option */}
                <div className="mb-6">
                  <GaslessRedemption 
                    grantAddress={contractAddress as `0x${string}`}
                    redemptionAmount={grant.perAddress}
                    onSuccess={() => {
                      setHasRedeemed(true)
                      loadGrantData(contractAddress)
                    }}
                  />
                </div>

                {/* Alternative: Regular Redemption (with gas fees) */}
                <div className="border-t border-red-600/20 pt-6">
                  <h3 className="text-lg font-semibold text-red-300 mb-4">Alternative: Regular Redemption</h3>
                  <p className="text-red-400/60 text-sm mb-4">
                    Prefer to pay gas fees yourself? Use the regular redemption below.
                  </p>
                  
                  {/* Action Button */}
                  <button
                    onClick={handleRedeemClick}
                    disabled={
                      hasRedeemed || 
                      grant.status !== 'Active' || 
                      grant.claimsLeft <= 0 ||
                      transaction.status === 'pending' ||
                      transaction.status === 'success'
                    }
                    className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                      hasRedeemed || 
                      grant.status !== 'Active' || 
                      grant.claimsLeft <= 0 ||
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
                      : grant.status === 'Completed'
                      ? 'Grant Completed'
                      : grant.status === 'Paused'
                      ? 'Grant Paused'
                      : grant.claimsLeft <= 0
                      ? 'No Claims Left'
                      : `Redeem ${grant.perAddress} (Pay Gas)`
                    }
                  </button>
                </div>
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
              <div className="flex justify-between items-center">
                <span className="text-red-400/80">Category:</span>
                <span className="text-red-300 capitalize">{grant.category}</span>
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
            <p className="text-red-400/80 mb-4">
              You are about to redeem <span className="text-red-300 font-semibold">{grant.perAddress}</span> from {grant.name}.
            </p>
            <p className="text-green-400/80 text-sm mb-6">
              ✅ Gas fees included - you'll receive an extra 0.01 MARS for future transactions!
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