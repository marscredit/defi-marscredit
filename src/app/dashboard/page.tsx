'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount, useBalance } from 'wagmi'
import Layout from '@/components/Layout'
import { formatMarsAmount, truncateAddress, fetchTransactionHistory, BlockchainTransaction } from '@/lib/contracts'
import { marsCreditNetwork } from '@/lib/web3'


export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address,
    chainId: marsCreditNetwork.id,
  })
  
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real transaction history
  useEffect(() => {
    if (isConnected && address) {
      const loadTransactions = async () => {
        try {
          setLoading(true)
          setError(null)
          console.log('🔍 Loading transaction history from blockchain...')
          
          const realTransactions = await fetchTransactionHistory(address as `0x${string}`, 10)
          console.log('✅ Loaded transactions:', realTransactions)
          
          setTransactions(realTransactions)
        } catch (err) {
          console.error('❌ Failed to load transactions:', err)
          setError('Failed to load transaction history')
          setTransactions([]) // Fallback to empty array
        } finally {
          setLoading(false)
        }
      }

      loadTransactions()
    } else {
      setLoading(false)
      setTransactions([])
    }
  }, [isConnected, address])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown'
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'redemption':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      case 'transfer':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      case 'bridge':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className="py-20">
          <div className="mars-container">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-6 flex items-center justify-center opacity-50">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-4 text-red-300">Connect Your Wallet</h1>
              <p className="text-red-400/80 mb-8 max-w-md mx-auto">
                Connect your wallet using the button in the top-right corner to view your dashboard and account information.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="py-20">
        <div className="mars-container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 mars-glow-text">
              Dashboard
            </h1>
            <p className="text-lg text-red-400/80">
              Welcome back! Here's your Mars Credit Network account overview.
            </p>
          </div>

          {/* Account Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Wallet Balance */}
            <div className="lg:col-span-2 mars-card rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-red-300">Wallet Balance</h2>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-bold text-red-400 mb-2">
                  {balanceLoading ? (
                    <div className="w-32 h-10 bg-red-900/30 rounded animate-pulse"></div>
                  ) : (
                    formatMarsAmount(balance?.formatted || '0')
                  )}
                </div>
                <p className="text-red-400/80">Available MARS Tokens</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-red-400/80 mb-1">Network</p>
                  <p className="text-red-300 font-medium">Mars Credit Network</p>
                </div>
                <div>
                  <p className="text-red-400/80 mb-1">Chain ID</p>
                  <p className="text-red-300 font-medium">110110</p>
                </div>
                <div className="col-span-2">
                  <p className="text-red-400/80 mb-1">Wallet Address</p>
                  <p className="text-red-300 font-mono text-xs">{address}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mars-card rounded-xl p-8">
              <h2 className="text-xl font-bold text-red-300 mb-6">Quick Actions</h2>
              
              <div className="space-y-4">
                <button
                  onClick={() => window.open('https://latoken.com/exchange/MARS_USDT', '_blank')}
                  className="block w-full mars-button text-center py-3 px-4 text-white font-medium rounded-lg"
                >
                  Buy MARS
                </button>
                
                <Link
                  href="/grants"
                  className="block w-full bg-red-900/30 border border-red-600/30 text-red-400 text-center py-3 px-4 font-medium rounded-lg hover:bg-red-900/50 transition-all"
                >
                  View Grants
                </Link>
                
                <Link
                  href="/dashboard"
                  className="block w-full bg-red-900/30 border border-red-600/30 text-red-400 text-center py-3 px-4 font-medium rounded-lg hover:bg-red-900/50 transition-all"
                >
                  View Dashboard
                </Link>
                
                <Link
                  href="/bridge"
                  className="block w-full bg-red-900/30 border border-red-600/30 text-red-400 text-center py-3 px-4 font-medium rounded-lg hover:bg-red-900/50 transition-all"
                >
                  Bridge (Soon)
                </Link>
                
                <button
                  onClick={() => window.open(`https://blockscan.marscredit.xyz/address/${address}`, '_blank')}
                  className="block w-full bg-red-900/30 border border-red-600/30 text-red-400 text-center py-3 px-4 font-medium rounded-lg hover:bg-red-900/50 transition-all"
                >
                  View on Explorer
                </button>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="mars-card rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-red-300">Recent Activity</h2>
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              {/* View More on Explorer */}
              {isConnected && address && (
                <button
                  onClick={() => window.open(`https://blockscan.marscredit.xyz/address/${address}`, '_blank')}
                  className="flex items-center space-x-2 text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  <span>View More</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-red-300 font-medium">Failed to Load</span>
                </div>
                <p className="text-red-400/80 text-sm mt-1">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 bg-red-900/20 rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-red-900/40 rounded-full"></div>
                    <div className="flex-1">
                      <div className="w-32 h-4 bg-red-900/40 rounded mb-2"></div>
                      <div className="w-48 h-3 bg-red-900/40 rounded"></div>
                    </div>
                    <div className="w-20 h-4 bg-red-900/40 rounded"></div>
                  </div>
                ))}
                <div className="text-center py-4">
                  <p className="text-red-400/80 text-sm">Loading transaction history from blockchain...</p>
                </div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.hash} className="flex items-center space-x-4 p-4 bg-red-900/20 rounded-lg hover:bg-red-900/30 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.status === 'completed' ? 'bg-green-600' :
                      tx.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                    }`}>
                      {getTransactionIcon(tx.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-red-300 font-medium capitalize">{tx.type}</span>
                        {tx.grantName && (
                          <span className="text-red-400/80 text-sm">• {tx.grantName}</span>
                        )}
                        <span className="text-red-400/60 text-xs">Block #{tx.blockNumber}</span>
                      </div>
                      <div className="text-red-400/80 text-sm">
                        {tx.type === 'redemption' ? `Redeemed from grant` :
                         tx.type === 'transfer' ? `Transfer ${tx.from === address ? 'to' : 'from'} ${truncateAddress(tx.from === address ? (tx.to || '') : (tx.from || ''))}` :
                         `Bridge transfer`}
                      </div>
                      <div className="text-red-400/60 text-xs mt-1">
                        TX: {truncateAddress(tx.hash, 8)}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${
                        tx.type === 'redemption' || (tx.type === 'transfer' && tx.to === address) ? 'text-green-400' :
                        tx.type === 'transfer' && tx.from === address ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {tx.type === 'redemption' || (tx.type === 'transfer' && tx.to === address) ? '+' :
                         tx.type === 'transfer' && tx.from === address ? '-' : ''}
                        {formatMarsAmount(tx.amount)}
                      </div>
                      <div className="text-red-400/60 text-xs">
                        {formatDate(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* View More Button */}
                <div className="text-center pt-4 border-t border-red-600/30">
                  <button
                    onClick={() => window.open(`https://blockscan.marscredit.xyz/address/${address}`, '_blank')}
                    className="inline-flex items-center space-x-2 text-red-400 hover:text-red-300 text-sm transition-colors"
                  >
                    <span>View All Transactions on Block Explorer</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center opacity-50">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-300">No Transactions Yet</h3>
                <p className="text-red-400/80 mb-4">
                  {isConnected 
                    ? "No transaction history found for this wallet on Mars Credit Network. Start by redeeming tokens from available grants."
                    : "Connect your wallet to view your transaction history."
                  }
                </p>
                {isConnected ? (
                  <Link
                    href="/grants"
                    className="inline-block mars-button px-6 py-3 text-white font-medium rounded-lg"
                  >
                    Explore Grants
                  </Link>
                ) : (
                  <div className="text-red-400/60 text-sm">
                    Connect your wallet to view transactions
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
} 