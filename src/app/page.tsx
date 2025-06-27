'use client'

import React from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import Layout from '@/components/Layout'
import { ConnectWallet } from '@/components/ConnectWallet'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="mars-container relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Mars Planet Animation */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 md:w-48 md:h-48 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-full mars-planet mars-red-glow relative overflow-hidden">
                  {/* Planet surface details */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-red-400/20 to-red-800/40"></div>
                  <div className="absolute top-6 left-8 w-3 h-3 bg-red-400/60 rounded-full"></div>
                  <div className="absolute bottom-8 right-10 w-2 h-2 bg-red-300/40 rounded-full"></div>
                  <div className="absolute top-16 right-6 w-4 h-2 bg-red-600/80 rounded-full"></div>
                </div>
                {/* Orbital ring */}
                <div className="absolute inset-0 border-2 border-red-500/30 rounded-full w-40 h-40 md:w-56 md:h-56 -m-4 md:-m-4"></div>
              </div>
            </div>

            {/* Hero Text */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 mars-glow-text leading-tight">
              Welcome to
              <br />
              <span className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
                Mars Credit Network
              </span>
            </h1>

            <p className="text-lg md:text-xl text-red-400/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              Redeem MARS tokens and explore DeFi on our custom blockchain. 
              Welcome to the future of decentralized finance on Mars Credit Network.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/grants"
                className="px-8 py-4 mars-button text-white font-semibold rounded-lg text-lg"
              >
                View Grants
              </Link>
              
              <Link 
                href="/dashboard"
                className="px-8 py-4 mars-button text-white font-semibold rounded-lg text-lg"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-red-900/10 via-transparent to-transparent"></div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="mars-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 mars-glow-text">
              Discover Mars Credit Features
            </h2>
            <p className="text-red-400/80 text-lg max-w-2xl mx-auto">
              Explore the innovative DeFi ecosystem built for the Mars Credit Network
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Token Grants Feature */}
            <div className="mars-card rounded-xl p-8 text-center group hover:mars-red-glow transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-red-300">Token Grants</h3>
              <p className="text-red-400/80 mb-6">
                Redeem MARS tokens through our grant system. Each address can claim tokens once on a first-come, first-serve basis.
              </p>
              <Link href="/grants" className="text-red-400 hover:text-red-300 font-medium inline-flex items-center">
                Explore Grants
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Bridge Feature */}
            <div className="mars-card rounded-xl p-8 text-center group hover:mars-red-glow transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform opacity-50">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-red-300">Cross-Chain Bridge</h3>
              <p className="text-red-400/80 mb-6">
                Connect assets across different blockchains. Bridge functionality is under development and coming soon.
              </p>
              <Link href="/bridge" className="text-red-400/60 hover:text-red-300 font-medium inline-flex items-center">
                Coming Soon
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            </div>

            {/* Wallet Integration Feature */}
            <div className="mars-card rounded-xl p-8 text-center group hover:mars-red-glow transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-red-300">Wallet Integration</h3>
              <p className="text-red-400/80 mb-6">
                Connect seamlessly with MetaMask and Zerion wallets. Full support for Mars Credit Network chain.
              </p>
              <div className="text-red-400 hover:text-red-300 font-medium inline-flex items-center">
                Ready to Connect
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 border-t border-red-600/30">
        <div className="mars-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">110110</div>
              <div className="text-red-400/80">Chain ID</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">MARS</div>
              <div className="text-red-400/80">Native Token</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">24/7</div>
              <div className="text-red-400/80">Network Uptime</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">∞</div>
              <div className="text-red-400/80">Possibilities</div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}
