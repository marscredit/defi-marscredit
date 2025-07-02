'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { 
  MARS_GRANT_PAYMASTER_ABI, 
  PAYMASTER_CONTRACT_ADDRESS,
  canUseGaslessTransaction,
  getBlocksUntilGasless,
  isGrantAuthorizedForGasless,
  debugPaymasterStatus,
  debugGrantAuthorization,
  debugUserGaslessEligibility
} from '@/lib/grants-registry'
import { marsCreditNetwork } from '@/lib/web3'

interface GaslessRedemptionProps {
  grantAddress: `0x${string}`
  redemptionAmount: string
  onSuccess?: () => void
}

export default function GaslessRedemption({ 
  grantAddress, 
  redemptionAmount, 
  onSuccess 
}: GaslessRedemptionProps) {
  const { address: userAddress, isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [canUseGasless, setCanUseGasless] = useState(false)
  const [blocksUntilNext, setBlocksUntilNext] = useState(0)
  const [isGrantAuthorized, setIsGrantAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<{
    paymaster?: any
    grant?: any
    user?: any
  }>({})
  const [manualTxState, setManualTxState] = useState<{
    isPending: boolean
    hash?: string
    isSuccess: boolean
    error?: any
  }>({
    isPending: false,
    isSuccess: false
  })

  // Check if user is on correct network
  const isCorrectNetwork = chainId === marsCreditNetwork.id

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Load gasless transaction eligibility
  useEffect(() => {
    async function checkGaslessEligibility() {
      if (!userAddress || !isConnected) {
        setLoading(false)
        return
      }

      // Don't re-check if transaction was successful
      if (manualTxState.isSuccess) {
        setLoading(false)
        return
      }

      try {
        console.log('🔍 Checking gasless transaction eligibility...')
        
        // Debug paymaster status
        const paymasterDebug = await debugPaymasterStatus()
        console.log('💰 Paymaster Status:', paymasterDebug)
        
        // Debug grant authorization
        const grantDebug = await debugGrantAuthorization(grantAddress)
        console.log('🎯 Grant Authorization:', grantDebug)
        
        // Debug user eligibility
        const userDebug = await debugUserGaslessEligibility(userAddress)
        console.log('👤 User Eligibility:', userDebug)
        
        setDebugInfo({
          paymaster: paymasterDebug,
          grant: grantDebug,
          user: userDebug
        })

        // Set component state based on debug results
        setCanUseGasless(userDebug.canUse)
        setBlocksUntilNext(userDebug.blocksUntilNext)
        setIsGrantAuthorized(grantDebug.isAuthorized)
        
      } catch (error) {
        console.error('Error checking gasless eligibility:', error)
        setDebugInfo({
          paymaster: { error: 'Failed to check paymaster' },
          grant: { error: 'Failed to check grant' },
          user: { error: 'Failed to check user' }
        })
      } finally {
        setLoading(false)
      }
    }

    checkGaslessEligibility()
  }, [userAddress, isConnected, grantAddress, manualTxState.isSuccess])

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed && onSuccess) {
      onSuccess()
    }
  }, [isConfirmed, onSuccess])

  // Handle network switching
  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: marsCreditNetwork.id })
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  const handleGaslessRedemption = async () => {
    if (!userAddress || !isConnected) {
      console.error('❌ Wallet not connected properly')
      return
    }

    // Ensure user is on correct network first
    if (!isCorrectNetwork) {
      await handleSwitchNetwork()
      return
    }

    console.log('🚀 Initiating truly gasless redemption via backend...')
    console.log('👤 User Address:', userAddress)
    console.log('🎯 Grant Address:', grantAddress)

    try {
      // Set pending state
      setManualTxState({ isPending: true, isSuccess: false })
      
      // Call backend API for gasless redemption
      console.log('📡 Calling backend gasless redemption API...')
      
      const response = await fetch('/api/gasless-redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          grantAddress
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      console.log('✅ Gasless redemption successful!')
      console.log('📝 Transaction Hash:', result.transactionHash)
      console.log('⛽ Gas Used:', result.gasUsed)
      console.log('💰 Gas Paid By: Backend wallet (truly gasless for user!)')
      
      setManualTxState({ 
        isPending: false, 
        isSuccess: true, 
        hash: result.transactionHash 
      })
      
      // Add a delay before calling success callback to show the success state
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
      }, 3000) // Show success state for 3 seconds before potentially reloading
      
    } catch (error: any) {
      console.error('❌ Error with gasless redemption:', error)
      
      let errorMessage = error.message || 'Unknown error occurred'
      
      // Handle specific API errors
      if (error.message?.includes('already redeemed')) {
        errorMessage = 'You have already redeemed from this grant'
      } else if (error.message?.includes('rate limited')) {
        errorMessage = 'Please wait ~4 hours between gasless transactions'
      } else if (error.message?.includes('not authorized')) {
        errorMessage = 'Grant not authorized for gasless transactions'
      } else if (error.message?.includes('cannot redeem')) {
        errorMessage = 'You are not eligible to redeem from this grant'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Grant has insufficient tokens remaining'
      }
      
      setManualTxState({ 
        isPending: false, 
        isSuccess: false, 
        error: { message: errorMessage }
      })
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-red-400">Checking gasless eligibility...</span>
        </div>
      </div>
    )
  }

  // Paymaster not deployed yet
  if (PAYMASTER_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="bg-gray-900/50 backdrop-blur border border-yellow-500/20 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚡ Gasless Transactions</h3>
          <p className="text-yellow-300/80 mb-4">
            Free gas redemptions are coming soon! No MARS needed to claim MARS tokens.
          </p>
          <div className="text-sm text-yellow-300/60">
            🚀 Status: Paymaster deployment in progress
          </div>
        </div>
      </div>
    )
  }

  // Wrong network - show network switch prompt
  if (!isCorrectNetwork) {
    return (
      <div className="bg-gray-900/50 backdrop-blur border border-orange-500/20 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-orange-400 mb-2">🔗 Wrong Network</h3>
          <p className="text-orange-300/80 mb-4">
            Gasless transactions require Mars Credit Network. You're currently on {chainId ? `Chain ${chainId}` : 'an unsupported network'}.
          </p>
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 
                       disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed
                       text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 
                       transform hover:scale-105 disabled:hover:scale-100"
          >
            {isSwitching ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Switching Network...
              </span>
            ) : (
              `Switch to Mars Credit Network (${marsCreditNetwork.id})`
            )}
          </button>
          <div className="mt-4 text-xs text-orange-300/60">
            <p>🚀 Mars Credit Network (Chain ID: {marsCreditNetwork.id})</p>
            <p>🔗 RPC: {marsCreditNetwork.rpcUrls.default.http[0]}</p>
          </div>
        </div>
      </div>
    )
  }

  // Grant not authorized for gasless transactions
  if (!isGrantAuthorized) {
    return (
      <div className="bg-gray-900/50 backdrop-blur border border-yellow-500/20 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚡ Gasless Redemption</h3>
          <p className="text-yellow-300/80 mb-4">
            This grant is not yet authorized for gasless transactions.
          </p>
          <div className="text-sm text-yellow-300/60">
            Contact the grant administrator to enable gasless redemptions.
          </div>
        </div>
      </div>
    )
  }

  // User has rate limit active
  if (!canUseGasless && blocksUntilNext > 0) {
    const hoursLeft = Math.ceil((blocksUntilNext * 14.3) / 3600) // ~14.3 seconds per block
    
    return (
      <div className="bg-gray-900/50 backdrop-blur border border-orange-500/20 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-orange-400 mb-2">⏱️ Rate Limited</h3>
          <p className="text-orange-300/80 mb-4">
            You need to wait before using another gasless transaction.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-black/20 rounded p-2">
              <div className="text-orange-300/60">Blocks Left</div>
              <div className="text-orange-400 font-mono">{blocksUntilNext.toLocaleString()}</div>
            </div>
            <div className="bg-black/20 rounded p-2">
              <div className="text-orange-300/60">Approx. Time</div>
              <div className="text-orange-400 font-mono">~{hoursLeft}h</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ready for gasless transaction
  return (
    <div className="bg-gray-900/50 backdrop-blur border border-green-500/20 rounded-lg p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-green-400 mb-2">⚡ Gasless Redemption Available</h3>
        <p className="text-green-300/80 mb-4">
          Redeem {redemptionAmount} MARS with <strong>zero gas fees</strong>!
        </p>
        
        {writeError && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">
              Transaction failed: {writeError.message}
            </p>
          </div>
        )}

        {receiptError && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">
              Transaction error: {receiptError.message}
            </p>
          </div>
        )}

        {manualTxState.error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">
              Transaction failed: {manualTxState.error.message || 'Unknown error'}
            </p>
          </div>
        )}

        {manualTxState.hash && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 mb-4">
            <p className="text-blue-400 text-sm mb-2">
              <strong>Transaction Hash:</strong>
            </p>
            <p className="text-blue-300 text-xs font-mono break-all bg-black/20 p-2 rounded">
              {manualTxState.hash}
            </p>
            <p className="text-blue-400 text-sm mt-2">
              <a 
                href={`https://blockscan.marscredit.xyz/tx/${manualTxState.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300"
              >
                View on Block Explorer ↗
              </a>
            </p>
            {manualTxState.isPending && (
              <p className="text-blue-300/80 text-sm mt-1">Waiting for confirmation...</p>
            )}
          </div>
        )}

        {manualTxState.isSuccess && (
          <div className="bg-green-900/20 border border-green-500/30 rounded p-3 mb-4">
            <p className="text-green-400 text-sm font-semibold">
              ✅ Gasless redemption successful!
            </p>
            <p className="text-green-300/80 text-sm mt-1">
              {redemptionAmount} MARS transferred to your wallet with zero gas fees!
            </p>
          </div>
        )}

        <button
          onClick={handleGaslessRedemption}
          disabled={manualTxState.isPending || manualTxState.isSuccess || isSwitching}
          className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 text-white
                     ${!isCorrectNetwork 
                       ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400' 
                       : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
                     } 
                     disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed`}
        >
          {isSwitching ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Switching Network...
            </span>
          ) : manualTxState.isPending ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Sending Gasless Transaction...
            </span>
          ) : manualTxState.isSuccess ? (
            '✅ Redeemed Successfully!'
          ) : !isCorrectNetwork ? (
            `🔗 Switch to Mars Credit Network (${marsCreditNetwork.id})`
          ) : (
            '⚡ Redeem with Zero Gas Fees'
          )}
        </button>

        {/* Debug Information (for troubleshooting) */}
        {debugInfo.paymaster && (
          <div className="mt-4 p-3 bg-black/20 rounded-lg border border-gray-600/30">
            <details className="cursor-pointer">
              <summary className="text-sm text-gray-400 hover:text-gray-300">Debug Information</summary>
              <div className="mt-2 space-y-2 text-xs">
                <div>
                  <span className="text-gray-400">Paymaster Status:</span>
                  <div className="ml-2 text-gray-300">
                    {debugInfo.paymaster.error ? (
                      <span className="text-red-400">❌ {debugInfo.paymaster.error}</span>
                    ) : (
                      <>
                        <div>✅ Deployed: {debugInfo.paymaster.isDeployed ? 'Yes' : 'No'}</div>
                        <div>💰 Balance: {debugInfo.paymaster.balance} MARS</div>
                        <div>📊 Total Sponsored: {debugInfo.paymaster.totalSponsored} MARS</div>
                        <div>⏱️ Rate Limit: {debugInfo.paymaster.rateLimit} blocks</div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">Grant Authorization:</span>
                  <div className="ml-2 text-gray-300">
                    {debugInfo.grant?.error ? (
                      <span className="text-red-400">❌ {debugInfo.grant.error}</span>
                    ) : (
                      <span className={debugInfo.grant?.isAuthorized ? 'text-green-400' : 'text-red-400'}>
                        {debugInfo.grant?.isAuthorized ? '✅ Authorized' : '❌ Not Authorized'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">User Eligibility:</span>
                  <div className="ml-2 text-gray-300">
                    {debugInfo.user?.error ? (
                      <span className="text-red-400">❌ {debugInfo.user.error}</span>
                    ) : (
                      <>
                        <div className={debugInfo.user?.canUse ? 'text-green-400' : 'text-red-400'}>
                          {debugInfo.user?.canUse ? '✅ Can Use Gasless' : '❌ Cannot Use Gasless'}
                        </div>
                        <div>⏱️ Blocks Until Next: {debugInfo.user?.blocksUntilNext || 0}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        <div className="mt-4 text-xs text-green-300/60">
          <p>🎯 No MARS required for gas fees</p>
          <p>⏱️ Next gasless transaction available in ~4 hours after use</p>
        </div>
      </div>
    </div>
  )
} 