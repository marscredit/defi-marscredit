'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import Layout from '@/components/Layout'
import { formatMarsAmount } from '@/lib/contracts'
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

export default function GrantsPage() {
  const { isConnected } = useAccount()
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock grants data - in a real app, this would come from the blockchain or a backend
    const mockGrants: Grant[] = [
      {
        id: '1',
        name: 'Genesis Mars Grant',
        description: 'Initial token distribution for early Mars Credit Network adopters',
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
        description: 'Rewards for active community members and contributors',
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
        description: 'Special grant for developers building on Mars Credit Network',
        contractAddress: '0xAbCdEf742d35Cc6634C0532925a3b8d123456789',
        totalTokens: '7500',
        redemptionAmount: '2',
        remainingTokens: '0',
        remainingRedemptions: 0,
        isActive: false,
        deployedAt: '2024-01-10T09:15:00Z'
      }
    ]

    // Simulate loading delay
    setTimeout(() => {
      setGrants(mockGrants)
      setLoading(false)
    }, 1000)
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
              <p className="text-red-400">Loading grants...</p>
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
            <p className="text-lg text-red-400/80 max-w-3xl mx-auto">
              Redeem MARS tokens through our grant system. Each address can claim tokens once per grant 
              on a first-come, first-serve basis. Connect your wallet to get started.
            </p>
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
                You need to connect your wallet to view and redeem grants
              </p>
                                  <ConnectWallet />
            </div>
          )}

          {/* Grants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {grants.map((grant) => (
              <div key={grant.id} className="mars-card rounded-xl p-6 group hover:mars-red-glow transition-all duration-300">
                {/* Grant Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${grant.isActive 
                    ? 'bg-green-900/30 text-green-400 border border-green-600/30' 
                    : 'bg-red-900/30 text-red-400 border border-red-600/30'
                  }`}>
                    {grant.isActive ? 'Active' : 'Completed'}
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
                    <span className="text-red-300 font-medium">{formatMarsAmount(grant.totalTokens)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-red-400/80 text-sm">Per Address:</span>
                    <span className="text-red-300 font-medium">{formatMarsAmount(grant.redemptionAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-red-400/80 text-sm">Remaining:</span>
                    <span className="text-red-300 font-medium">{formatMarsAmount(grant.remainingTokens)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-red-400/80 text-sm">Claims Left:</span>
                    <span className="text-red-300 font-medium">{grant.remainingRedemptions.toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-red-400/80 text-sm">Progress</span>
                    <span className="text-red-400/80 text-sm">
                      {Math.round(((parseFloat(grant.totalTokens) - parseFloat(grant.remainingTokens)) / parseFloat(grant.totalTokens)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-red-900/30 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-red-600 to-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${((parseFloat(grant.totalTokens) - parseFloat(grant.remainingTokens)) / parseFloat(grant.totalTokens)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Action Button */}
                <Link 
                  href={`/grants/${grant.id}`}
                  className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-all ${
                    grant.isActive && isConnected
                      ? 'mars-button text-white hover:scale-105'
                      : 'bg-red-900/30 text-red-400/60 border border-red-600/30 cursor-not-allowed'
                  }`}
                >
                  {!isConnected ? 'Connect Wallet' : grant.isActive ? 'View Details' : 'Grant Completed'}
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