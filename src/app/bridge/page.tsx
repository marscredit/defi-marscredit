'use client'

import React, { useState } from 'react'
import Layout from '@/components/Layout'

export default function BridgePage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would submit to a backend
    setIsSubmitted(true)
    setEmail('')
  }

  return (
    <Layout>
      <div className="py-20">
        <div className="mars-container">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 mars-glow-text">
              Cross-Chain Bridge
            </h1>
            <p className="text-lg text-red-400/80 max-w-3xl mx-auto">
              Connect MARS across different blockchains seamlessly. 
              Our bridge functionality is under development and will be available soon.
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="max-w-4xl mx-auto">
            <div className="mars-card rounded-xl p-12 text-center">
              {/* Bridge Icon with Animation */}
              <div className="w-32 h-32 mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 rounded-full opacity-20 mars-planet"></div>
                <div className="absolute inset-4 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                {/* Connecting lines */}
                <div className="absolute -left-8 top-1/2 w-6 h-0.5 bg-red-500/60"></div>
                <div className="absolute -right-8 top-1/2 w-6 h-0.5 bg-red-500/60"></div>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-red-300">
                Coming Soon
              </h2>
              
              <p className="text-lg text-red-400/80 mb-8 max-w-2xl mx-auto leading-relaxed">
                We're building a revolutionary cross-chain bridge that will allow you to move assets 
                seamlessly between Mars Credit Network and other major blockchains including Ethereum, 
                Binance Smart Chain, and Polygon.
              </p>

              {/* Features Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-red-300">Fast Transfers</h3>
                  <p className="text-red-400/80 text-sm">Lightning-fast cross-chain transactions with minimal fees</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-red-300">Secure</h3>
                  <p className="text-red-400/80 text-sm">Advanced security protocols to protect your assets</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-red-300">Multi-Chain</h3>
                  <p className="text-red-400/80 text-sm">Support for multiple blockchain networks</p>
                </div>
              </div>

              {/* Waitlist Form */}
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-4 text-red-300">
                  Get Early Access
                </h3>
                <p className="text-red-400/80 text-sm mb-6">
                  Be the first to know when the bridge goes live. Join our waitlist for exclusive early access.
                </p>

                {isSubmitted ? (
                  <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4">
                    <div className="flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-300 font-medium">You're on the waitlist!</span>
                    </div>
                    <p className="text-green-400/80 text-sm mt-2 text-center">
                      We'll notify you as soon as the bridge is ready.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-red-900/20 border border-red-600/30 rounded-lg text-red-300 placeholder-red-400/60 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mars-button py-3 px-6 text-white font-semibold rounded-lg"
                    >
                      Join Waitlist
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Development Timeline */}
            <div className="mt-16">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center mars-glow-text">
                Development Roadmap
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="mars-card rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-red-300">Phase 1: Foundation</h3>
                  <p className="text-red-400/80 text-sm mb-3">Core infrastructure and security audits</p>
                  <span className="text-green-400 text-xs font-medium bg-green-900/30 px-2 py-1 rounded">Completed</span>
                </div>

                <div className="mars-card rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-yellow-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-red-300">Phase 2: Testing</h3>
                  <p className="text-red-400/80 text-sm mb-3">Testnet deployment and community testing</p>
                  <span className="text-yellow-400 text-xs font-medium bg-yellow-900/30 px-2 py-1 rounded">In Progress</span>
                </div>

                <div className="mars-card rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-red-300">Phase 3: Launch</h3>
                  <p className="text-red-400/80 text-sm mb-3">Mainnet launch with full functionality</p>
                  <span className="text-red-400/60 text-xs font-medium bg-red-900/30 px-2 py-1 rounded">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 