'use client'

import React, { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { marsCreditNetwork } from '@/lib/web3'

export function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  // Check if user is on the correct network
  const isCorrectNetwork = chainId === marsCreditNetwork.id

  // Auto-switch to Mars Credit Network when wallet connects
  useEffect(() => {
    if (isConnected && !isCorrectNetwork) {
      console.log(`🔗 Auto-switching from chain ${chainId} to Mars Credit Network (${marsCreditNetwork.id})`)
      switchChain({ chainId: marsCreditNetwork.id })
        .catch((error) => {
          console.warn('Failed to auto-switch chain:', error.message)
        })
    }
  }, [isConnected, isCorrectNetwork, chainId, switchChain])

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector })
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: marsCreditNetwork.id })
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-4">
        {/* Network Status Indicator */}
        {!isCorrectNetwork && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <button
              onClick={handleSwitchNetwork}
              className="text-orange-400 hover:text-orange-300 text-sm transition-colors"
            >
              Switch to Mars Credit
            </button>
          </div>
        )}
        
        {isCorrectNetwork && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-400 text-sm">Mars Credit Network</span>
          </div>
        )}

        {/* Wallet Address */}
        <div className="flex items-center space-x-2 bg-red-900/20 border border-red-600/30 rounded-lg px-4 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-red-300 font-mono text-sm">
            {formatAddress(address)}
          </span>
          <button
            onClick={() => disconnect()}
            className="text-red-400/60 hover:text-red-300 ml-2 text-sm"
            title="Disconnect"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex space-x-2">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => handleConnect(connector)}
            className="mars-button px-4 py-2 text-white font-medium rounded-lg text-sm"
          >
            Connect {connector.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// Helper function to format address
function formatAddress(address?: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
} 