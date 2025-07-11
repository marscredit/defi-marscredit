'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { marsCreditNetwork } from '@/lib/web3'

interface BridgeWalletManagerProps {
  direction: {
    from: 'L1' | 'Solana'
    to: 'L1' | 'Solana'
  }
}

export function BridgeWalletManager({ direction }: BridgeWalletManagerProps) {
  const [mounted, setMounted] = useState(false)

  // EVM wallet (MetaMask)
  const { address: l1Address, isConnected: l1Connected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect: disconnectL1 } = useDisconnect()
  const { switchChain } = useSwitchChain()

  // Solana wallet (Phantom)
  const { 
    publicKey: solanaAddress, 
    connected: solanaConnected, 
    disconnect: disconnectSolana,
    wallet: solanaWallet,
    select: selectWallet,
    wallets
  } = useWallet()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isCorrectNetwork = chainId === marsCreditNetwork.id

  // Auto-switch to Mars Credit Network when L1 wallet connects
  useEffect(() => {
    if (mounted && l1Connected && !isCorrectNetwork && direction.from === 'L1') {
      console.log('🔗 Auto-switching to Mars Credit Network...')
      switchChain({ chainId: marsCreditNetwork.id })
        .catch((error) => console.warn('Failed to auto-switch chain:', error.message))
    }
  }, [mounted, l1Connected, isCorrectNetwork, direction.from, switchChain])

  const handleL1Connect = async () => {
    const metaMaskConnector = connectors.find(c => c.name === 'MetaMask')
    if (metaMaskConnector) {
      try {
        await connect({ connector: metaMaskConnector })
      } catch (error) {
        console.error('MetaMask connection failed:', error)
      }
    }
  }

  const handleSolanaConnect = async () => {
    try {
      console.log('🔗 Attempting to connect Solana wallet...')
      console.log('Available wallets:', wallets.map(w => w.adapter.name))
      
      // Find Phantom wallet specifically
      const phantomWallet = wallets.find(wallet => 
        wallet.adapter.name === 'Phantom' || 
        wallet.adapter.name.toLowerCase().includes('phantom')
      )
      
      if (phantomWallet) {
        console.log('📱 Found Phantom wallet, connecting...')
        selectWallet(phantomWallet.adapter.name)
      } else {
        console.error('Phantom wallet not found in available wallets')
        // Fallback to first available wallet
        if (wallets.length > 0) {
          console.log('🔄 Falling back to first available wallet:', wallets[0].adapter.name)
          selectWallet(wallets[0].adapter.name)
        }
      }
    } catch (error) {
      console.error('Failed to connect Solana wallet:', error)
    }
  }

  const handleL1Disconnect = () => {
    disconnectL1()
  }

  const handleSolanaDisconnect = () => {
    disconnectSolana()
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: marsCreditNetwork.id })
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  const formatAddress = (address: string | undefined) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!mounted) {
    return (
      <div className="mb-6 p-4 bg-black/30 rounded-xl border border-red-600/20">
        <span className="text-red-400/60">Loading wallet...</span>
      </div>
    )
  }

  // L1 → Solana: Show MetaMask connection
  if (direction.from === 'L1') {
    return (
      <div className="mb-6 p-4 bg-black/30 rounded-xl border border-red-600/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-red-400 font-medium">MetaMask (Mars Credit Network)</h3>
          <div className="text-xs text-red-400/60">Required for L1 → Solana</div>
        </div>

        {l1Connected ? (
          <div className="space-y-3">
            {/* Network Status */}
            {!isCorrectNetwork ? (
              <div className="flex items-center justify-between p-3 bg-orange-900/20 border border-orange-600/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-orange-400 text-sm">Wrong Network</span>
                </div>
                <button
                  onClick={handleSwitchNetwork}
                  className="text-orange-400 hover:text-orange-300 text-sm underline"
                >
                  Switch to Mars Credit
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Connected to Mars Credit Network</span>
              </div>
            )}

            {/* Wallet Info */}
            <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">M</span>
                </div>
                <div>
                  <div className="text-green-400 font-medium">MetaMask Connected</div>
                  <div className="text-green-300/80 text-sm font-mono">{formatAddress(l1Address)}</div>
                </div>
              </div>
              <button
                onClick={handleL1Disconnect}
                className="text-red-400/60 hover:text-red-300 text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleL1Connect}
            className="w-full flex items-center justify-center space-x-3 p-4 bg-red-900/20 border border-red-600/30 rounded-lg hover:bg-red-900/30 transition-colors"
          >
            <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-red-300 font-medium">Connect MetaMask</span>
          </button>
        )}
      </div>
    )
  }

  // Solana → L1: Show Phantom connection
  if (direction.from === 'Solana') {
    return (
      <div className="mb-6 p-4 bg-black/30 rounded-xl border border-red-600/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-red-400 font-medium">Solana Wallet (Phantom)</h3>
          <div className="text-xs text-red-400/60">Required for Solana → L1</div>
        </div>

        {solanaConnected ? (
          <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <div>
                <div className="text-green-400 font-medium">
                  {solanaWallet?.adapter?.name || 'Solana Wallet'} Connected
                </div>
                <div className="text-green-300/80 text-sm font-mono">
                  {formatAddress(solanaAddress?.toString())}
                </div>
              </div>
            </div>
            <button
              onClick={handleSolanaDisconnect}
              className="text-red-400/60 hover:text-red-300 text-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleSolanaConnect}
            className="w-full flex items-center justify-center space-x-3 p-4 bg-red-900/20 border border-red-600/30 rounded-lg hover:bg-red-900/30 transition-colors"
          >
            <div className="w-6 h-6 bg-purple-500 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-red-300 font-medium">Connect Solana Wallet</span>
          </button>
        )}
      </div>
    )
  }

  return null
} 