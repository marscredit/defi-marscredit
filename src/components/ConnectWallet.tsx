'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState } from 'react'

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showConnectors, setShowConnectors] = useState(false)

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-red-400">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 hover:border-red-500 transition-all font-medium rounded-lg text-sm"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConnectors(!showConnectors)}
        disabled={isPending}
        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      {showConnectors && (
        <div className="absolute top-full mt-2 right-0 bg-black border border-red-600/30 rounded-lg shadow-lg min-w-48 z-50">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector })
                setShowConnectors(false)
              }}
              disabled={isPending}
              className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-600/10 hover:text-red-300 transition-colors first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 