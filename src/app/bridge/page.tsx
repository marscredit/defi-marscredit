'use client'

import React from 'react'
import Layout from '@/components/Layout'
import { MarsBridge } from '@/components/bridge/MarsBridge'

export default function BridgePage() {
  return (
    <Layout>
      <div className="py-20">
        <div className="mars-container">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 mars-glow-text">
              Mars Bridge
            </h1>
            <p className="text-lg text-red-400/80 max-w-3xl mx-auto mb-6">
              Seamlessly bridge native MARS between Mars Credit Network and Solana. 
              Our automated relayer ensures fast, secure cross-chain transfers with minimal fees.
            </p>
            
            {/* Live Data Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center space-x-2 bg-red-900/20 px-4 py-2 rounded-xl border border-red-600/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-red-400/80 text-sm">Live Bridge Status</span>
              </div>
              
              <div className="flex items-center space-x-2 bg-red-900/20 px-4 py-2 rounded-xl border border-red-600/30">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-red-400/80 text-sm">Automated Relayer Active</span>
              </div>
            </div>
            
            <p className="text-red-400/60 text-sm">
              Connect both MetaMask (Mars Credit Network) and Phantom (Solana) to begin bridging
            </p>
          </div>

          {/* Bridge Component */}
          <MarsBridge />

          {/* Additional Information */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="mars-card rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-red-300">Fast & Secure</h3>
              <p className="text-red-400/80 text-sm">
                Automated relayer processes transactions within 2-5 minutes. No manual intervention required.
              </p>
            </div>

            <div className="mars-card rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-red-300">Low Fees</h3>
              <p className="text-red-400/80 text-sm">
                Only 0.1% bridge fee. Bridge between 10 and 1,000,000 MARS tokens per transaction.
              </p>
            </div>

            <div className="mars-card rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-red-300">Production Ready</h3>
              <p className="text-red-400/80 text-sm">
                Battle-tested smart contracts with ReentrancyGuard protection and pause functionality.
              </p>
            </div>
          </div>

          {/* Network Information */}
          <div className="mt-16 mars-card rounded-xl p-8">
            <h3 className="text-2xl font-bold text-red-300 mb-6 text-center">Supported Networks</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-red-300 mb-3">Mars Credit Network</h4>
                <div className="space-y-2 text-sm text-red-400/80">
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="text-red-300">Mainnet</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chain ID:</span>
                    <span className="text-red-300">110110</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RPC:</span>
                    <span className="text-red-300">rpc.marscredit.xyz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Explorer:</span>
                    <span className="text-red-300">blockscan.marscredit.xyz</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-red-300 mb-3">Solana</h4>
                <div className="space-y-2 text-sm text-red-400/80">
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="text-red-300">Mainnet</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RPC:</span>
                    <span className="text-red-300">api.mainnet-beta.solana.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MARS Mint:</span>
                    <span className="text-red-300 font-mono text-xs">uNcM3H...hUF4b</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Explorer:</span>
                    <span className="text-red-300">explorer.solana.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 mars-card rounded-xl p-8">
            <h3 className="text-2xl font-bold text-red-300 mb-8 text-center">Frequently Asked Questions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-red-300 mb-2">How long does bridging take?</h4>
                <p className="text-red-400/80 text-sm mb-4">
                  Bridge transactions are typically processed within 2-5 minutes by our automated relayer service.
                </p>
                
                <h4 className="font-semibold text-red-300 mb-2">What are the fees?</h4>
                <p className="text-red-400/80 text-sm mb-4">
                  A 0.1% bridge fee applies to all transactions, plus standard network gas fees for each chain.
                </p>
                
                <h4 className="font-semibold text-red-300 mb-2">Are there limits?</h4>
                <p className="text-red-400/80 text-sm">
                  Minimum: 10 MARS per transaction. Maximum: 1,000,000 MARS per transaction.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-red-300 mb-2">Is bridging secure?</h4>
                <p className="text-red-400/80 text-sm mb-4">
                  Yes! Our smart contracts include ReentrancyGuard protection, pause functionality, and have been thoroughly tested.
                </p>
                
                <h4 className="font-semibold text-red-300 mb-2">What if something goes wrong?</h4>
                <p className="text-red-400/80 text-sm mb-4">
                  All transactions are monitored 24/7. If issues occur, our team can manually process stuck transactions.
                </p>
                
                <h4 className="font-semibold text-red-300 mb-2">Do I need both wallets?</h4>
                <p className="text-red-400/80 text-sm">
                  Yes, you need MetaMask for Mars Credit Network and a Solana wallet (like Phantom) to use the bridge.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 