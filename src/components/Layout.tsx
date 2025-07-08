'use client'

import React from 'react'
import Image from 'next/image'
import Navigation from './Navigation'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* Background Stars */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-10 left-10 w-1 h-1 bg-red-400 rounded-full floating-stars opacity-70"></div>
        <div className="absolute top-20 right-20 w-0.5 h-0.5 bg-red-300 rounded-full floating-stars opacity-50" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-32 left-1/4 w-0.5 h-0.5 bg-red-500 rounded-full floating-stars opacity-60" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-40 right-1/3 w-1 h-1 bg-red-400 rounded-full floating-stars opacity-40" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-60 left-3/4 w-0.5 h-0.5 bg-red-300 rounded-full floating-stars opacity-70" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/5 w-1 h-1 bg-red-500 rounded-full floating-stars opacity-50" style={{ animationDelay: '2.5s' }}></div>
        <div className="absolute bottom-32 right-1/4 w-0.5 h-0.5 bg-red-400 rounded-full floating-stars opacity-60" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-40 left-2/3 w-0.5 h-0.5 bg-red-300 rounded-full floating-stars opacity-40" style={{ animationDelay: '3.5s' }}></div>
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10 pt-16 min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/80 backdrop-blur-sm">
        <div className="mars-container py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative w-10 h-10">
                  <Image
                    src="/marscredit_square_transparent_256.png"
                    alt="Mars Credit Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-bold mars-glow-text">Mars Credit</span>
              </div>
              <p className="text-red-400/80 text-sm leading-relaxed max-w-md">
                The future of DeFi on Mars Credit Network. Redeem MARS tokens, explore cross-chain bridges, 
                and participate in the Mars economy.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-red-300 font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><a href="https://latoken.com/exchange/MARS_USDT" target="_blank" rel="noopener noreferrer" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Buy MARS</a></li>
                <li><a href="/grants" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Token Grants</a></li>
                <li><a href="/bridge" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Bridge MARS</a></li>
                <li><a href="/dashboard" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Dashboard</a></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-red-300 font-semibold mb-4">Community</h3>
              <ul className="space-y-2">
                <li><a href="https://discord.gg/57bg77dCV8" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Discord</a></li>
                <li><a href="https://www.tiktok.com/@marscreditofficial" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">TikTok</a></li>
                <li><a href="https://x.com/marscredit" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Twitter</a></li>
                <li><a href="https://t.me/marscreditxyz" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Telegram Channel</a></li>
                <li><a href="https://t.me/MarscreditOfficial" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">Telegram Group</a></li>
                <li><a href="https://github.com/marscredit" className="text-red-400/80 hover:text-red-300 text-sm transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-red-600/30 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center pb-8">
            <p className="text-red-400/60 text-sm">
              © 2025 Mars Credit Network. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-red-400/60 hover:text-red-300 text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-red-400/60 hover:text-red-300 text-sm transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout 