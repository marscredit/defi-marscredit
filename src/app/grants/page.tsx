'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import Layout from '@/components/Layout'
import { formatMarsAmount } from '@/lib/contracts'

import { loadAllGrants, LiveGrantData } from '@/lib/grants-registry'

export default function GrantsPage() {
  const { isConnected } = useAccount()
  const [grants, setGrants] = useState<LiveGrantData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load grants from blockchain
  const loadGrants = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Loading grants from blockchain...')
      
      const grantsData = await loadAllGrants()
      console.log('✅ Loaded grants:', grantsData)
      
      setGrants(grantsData)
    } catch (err) {
      console.error('❌ Failed to load grants:', err)
      setError('Failed to load grants from blockchain')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGrants()
    
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(loadGrants, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Layout>
        <div className="py-20">
          <div className="mars-container">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 mars-spinner"></div>
              <p className="text-red-400">Loading grants from Mars Credit Network...</p>
              <p className="text-red-400/60 text-sm mt-2">Reading contract data from blockchain...</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="py-20">
          <div className="mars-container">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-red-300">Failed to Load Grants</h3>
              <p className="text-red-400/80 mb-4">{error}</p>
              <button
                onClick={loadGrants}
                className="mars-button px-6 py-2 text-white rounded-lg"
              >
                Try Again
              </button>
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
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 mars-glow-text">
              Mars Token Grants
            </h1>
            <p className="text-lg text-red-400/80 max-w-3xl mx-auto mb-6">
              Live token grants on Mars Credit Network. Data loads directly from blockchain contracts.
              Each address can claim tokens once per grant on a first-come, first-serve basis.
            </p>
            
            {/* Live Data Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center space-x-2 bg-red-900/20 px-4 py-2 rounded-lg border border-red-600/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-red-400/80 text-sm">Live Blockchain Data</span>
              </div>
              
              <button
                onClick={loadGrants}
                disabled={loading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all ${
                  loading 
                    ? 'bg-red-900/20 text-red-400/50 cursor-not-allowed' 
                    : 'bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-600/30'
                }`}
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
            
            {grants.length > 0 && (
              <p className="text-red-400/60 text-sm">
                Auto-refreshes every 30 seconds • {grants.length} active grant{grants.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="mars-card rounded-xl p-6 mb-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-red-300">Connect Your Wallet</h3>
              <p className="text-red-400/80 mb-4">
                Connect your wallet using the button in the top-right corner to view and redeem grants
              </p>
            </div>
          )}

          {/* Grants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {grants.map((grant) => (
              <div key={grant.id} className="mars-card rounded-xl p-6 group hover:mars-red-glow transition-all duration-300">
                {/* Grant Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    grant.status === 'Active' 
                      ? 'bg-green-900/30 text-green-400 border border-green-600/30'
                      : grant.status === 'Paused'
                      ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/30'
                      : 'bg-red-900/30 text-red-400 border border-red-600/30'
                  }`}>
                    {grant.status}
                  </span>
                  <span className="text-red-400/60 text-sm">
                    {formatDate(grant.deployedAt)}
                  </span>
                </div>

                {/* Grant Info */}
                <h3 className="text-xl font-semibold mb-3 text-red-300 group-hover:text-red-200 transition-colors">
                  {grant.name}
                </h3>
                
                <p className="text-red-400/80 text-sm mb-4 line-clamp-2">
                  {grant.description}
                </p>

                {/* Grant Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-red-400/80 text-sm">Total Pool:</span>
                    <span className="text-red-300 font-medium">{grant.totalPool}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-red-400/80 text-sm">Per Address:</span>
                    <span className="text-red-300 font-medium">{grant.perAddress}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-red-400/80 text-sm">Remaining:</span>
                    <span className="text-red-300 font-medium">{grant.remaining}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-red-400/80 text-sm">Claims Left:</span>
                    <span className="text-red-300 font-medium">{grant.claimsLeft.toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
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

                {/* Action Button */}
                <Link 
                  href={`/grants/${grant.contractAddress}`}
                  className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-all ${
                    grant.status === 'Active' && isConnected
                      ? 'mars-button text-white hover:scale-105'
                      : 'bg-red-900/30 text-red-400/60 border border-red-600/30 cursor-not-allowed'
                  }`}
                >
                  {!isConnected 
                    ? 'Connect Wallet' 
                    : grant.status === 'Active' 
                    ? 'View Details' 
                    : grant.status === 'Paused'
                    ? 'Grant Paused'
                    : 'Grant Completed'
                  }
                </Link>

                {/* Contract Address */}
                <div className="mt-4 pt-4 border-t border-red-600/30">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400/60 text-xs">Contract:</span>
                    <span className="text-red-400/80 text-xs font-mono">
                      {grant.contractAddress.slice(0, 8)}...{grant.contractAddress.slice(-6)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Grants Message */}
          {grants.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-6 flex items-center justify-center opacity-50">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-red-300">No Grants Available</h3>
              <p className="text-red-400/80 max-w-md mx-auto">
                There are currently no active grants. Check back later for new opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
} 