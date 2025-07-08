'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { WalletDropdown } from '@/components/WalletDropdown'

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/grants', label: 'Grants' },
    { href: '/bridge', label: 'Bridge' },
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 mars-gradient border-b border-red-600/30 backdrop-blur-md">
      <div className="mars-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="group">
            <div className="relative w-[108px] h-12">
              <Image
                src="/mars_network_logo.png"
                alt="Mars Credit Logo"
                width={108}
                height={48}
                className="object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-red-400 hover:text-red-300 transition-colors font-medium relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          {/* Network Status & Wallet Connection */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Network Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-600/20 border border-red-600/30 rounded-full">
              <div className="relative w-5 h-5">
                <Image
                  src="/marscredit_square_transparent_256.png"
                  alt="Mars Network"
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              <span className="text-xs text-red-300 font-medium">Mars Network</span>
            </div>
            
            <WalletDropdown />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-300 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-red-600/30 py-4">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-red-400 hover:text-red-300 transition-colors font-medium px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Wallet Connection */}
              <div className="pt-4 border-t border-red-600/30 flex flex-col items-center space-y-3">
                {/* Network Indicator - Mobile */}
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-600/20 border border-red-600/30 rounded-full">
                  <div className="relative w-5 h-5">
                    <Image
                      src="/marscredit_square_transparent_256.png"
                      alt="Mars Network"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xs text-red-300 font-medium">Mars Network</span>
                </div>
                
                <WalletDropdown />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation 