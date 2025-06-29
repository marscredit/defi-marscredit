'use client'

import React, { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { marsCreditNetwork } from '@/lib/web3'

export function WalletDropdown() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-switch to Mars Credit Network when wallet connects
  const isCorrectNetwork = chainId === marsCreditNetwork.id
  useEffect(() => {
    if (mounted && isConnected && !isCorrectNetwork) {
      console.log(`🔗 Auto-switching from chain ${chainId} to Mars Credit Network (${marsCreditNetwork.id})`)
      switchChain({ chainId: marsCreditNetwork.id })
        .catch((error) => {
          console.warn('Failed to auto-switch chain:', error.message)
        })
    }
  }, [mounted, isConnected, isCorrectNetwork, chainId, switchChain])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.wallet-dropdown')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector })
      setIsOpen(false)
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

  const handleDisconnect = () => {
    disconnect()
    setIsOpen(false)
  }

  // Show loading state during SSR
  if (!mounted) {
    return (
      <div className="bg-red-900/20 px-4 py-2 rounded-lg border border-red-600/30">
        <span className="text-red-400/60 text-sm">Loading...</span>
      </div>
    )
  }

  // Connected state
  if (isConnected) {
    return (
      <div className="relative wallet-dropdown">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 bg-red-900/20 border border-red-600/30 rounded-lg px-4 py-2 hover:bg-red-900/30 transition-all"
        >
          {/* Network Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`}></div>
            <span className="text-red-300 font-mono text-sm">
              {formatAddress(address)}
            </span>
          </div>
          
          {/* Dropdown Arrow */}
          <svg className={`w-4 h-4 text-red-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-black border border-red-600/30 rounded-lg shadow-xl z-50">
            <div className="p-4">
              {/* Wallet Info */}
              <div className="flex items-center space-x-3 pb-3 border-b border-red-600/30">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-300 font-medium">Connected</p>
                  <p className="text-red-400/80 text-sm font-mono">{formatAddress(address)}</p>
                </div>
              </div>

              {/* Network Status */}
              <div className="py-3 border-b border-red-600/30">
                {!isCorrectNetwork ? (
                  <button
                    onClick={handleSwitchNetwork}
                    className="flex items-center space-x-2 w-full text-left text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Switch to Mars Credit Network</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 text-sm">Mars Credit Network</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3">
                <button
                  onClick={handleDisconnect}
                  className="flex items-center space-x-2 w-full text-left text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm">Disconnect Wallet</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Disconnected state with wallet options dropdown
  return (
    <div className="relative wallet-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mars-button px-4 py-2 text-white font-medium rounded-lg text-sm flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <span>Connect Wallet</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-black border border-red-600/30 rounded-lg shadow-xl z-50">
          <div className="p-2">
            <div className="pb-2 px-2">
              <p className="text-red-300 font-medium text-sm">Choose Wallet</p>
              <p className="text-red-400/60 text-xs">Connect to Mars Credit Network</p>
            </div>
            
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-900/20 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  {connector.name === 'MetaMask' ? (
                    <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-xs font-bold">M</span>
                    </div>
                  ) : connector.name === 'Brave Wallet' ? (
                    <div className="w-6 h-6 bg-orange-600 rounded-md flex items-center justify-center">
                      <span className="text-white text-xs font-bold">B</span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                      <span className="text-white text-xs font-bold">W</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-red-300 font-medium text-sm">{connector.name}</p>
                  <p className="text-red-400/60 text-xs">
                    {connector.name === 'MetaMask' ? 'Browser extension' : 
                     connector.name === 'Brave Wallet' ? 'Brave browser' :
                     'Browser wallet'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to format address
function formatAddress(address?: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
} 