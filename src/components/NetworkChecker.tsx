'use client'

import React from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { marsCreditNetwork } from '@/lib/web3'

interface NetworkCheckerProps {
  showAlways?: boolean
  className?: string
}

export function NetworkChecker({ showAlways = false, className = '' }: NetworkCheckerProps) {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isCorrectNetwork = chainId === marsCreditNetwork.id

  // Don't show if not connected (unless showAlways is true)
  if (!isConnected && !showAlways) {
    return null
  }

  // Don't show if on correct network
  if (isCorrectNetwork) {
    return null
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: marsCreditNetwork.id })
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  return (
    <div className={`bg-orange-900/30 border border-orange-600/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-orange-300 font-semibold mb-1">Wrong Network</h3>
          <p className="text-orange-400/80 text-sm mb-3">
            You're currently connected to {chainId ? `Chain ${chainId}` : 'an unsupported network'}. 
            Please switch to Mars Credit Network to use this application.
          </p>
          
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-700 disabled:cursor-not-allowed 
                       text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          >
            {isSwitching ? (
              <span className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Switching...
              </span>
            ) : (
              `Switch to Mars Credit Network (${marsCreditNetwork.id})`
            )}
          </button>
          
          <div className="mt-3 text-xs text-orange-400/60">
            <div>🚀 Network: Mars Credit Network</div>
            <div>🔗 Chain ID: {marsCreditNetwork.id}</div>
            <div>📡 RPC: {marsCreditNetwork.rpcUrls.default.http[0]}</div>
          </div>
        </div>
      </div>
    </div>
  )
} 