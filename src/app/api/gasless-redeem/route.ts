import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://rpc.marscredit.xyz',
  chainId: 110110
}

// CRITICAL: In-memory protection against race conditions
const pendingRedemptions = new Set<string>() // Track pending redemptions by userAddress
const redemptionLocks = new Map<string, Promise<any>>() // Prevent concurrent requests per user

const PAYMASTER_ADDRESS = '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
const DEPLOYER_PRIVATE_KEY = '0x702f0b3c12108a7341cc1c94ac83a4a4732df139fb75880d13568883244082ea' // From previous deployment

const PAYMASTER_ABI = [
  'function sponsoredRedemption(address grantContract) external',
  'function canUseSponsoredTransaction(address user) view returns (bool)',
  'function authorizedContracts(address) view returns (bool)'
]

const GRANT_ABI = [
  'function hasAddressRedeemed(address) view returns (bool)',
  'function canUserRedeem(address) view returns (bool)',
  'function redeemForUser(address user) external',
  'function authorizedPaymasters(address) view returns (bool)'
]

interface GaslessRedeemRequest {
  userAddress: string
  grantAddress: string
  signature?: string // For future meta-transaction support
}

export async function POST(req: NextRequest) {
  try {
    const body: GaslessRedeemRequest = await req.json()
    const { userAddress, grantAddress } = body

    console.log('🚀 Processing gasless redemption request:')
    console.log('👤 User:', userAddress)
    console.log('🎯 Grant:', grantAddress)

    // Validate inputs
    if (!userAddress || !grantAddress) {
      return NextResponse.json({ 
        error: 'Missing required parameters: userAddress, grantAddress' 
      }, { status: 400 })
    }

    if (!ethers.isAddress(userAddress) || !ethers.isAddress(grantAddress)) {
      return NextResponse.json({ 
        error: 'Invalid address format' 
      }, { status: 400 })
    }

    // 🚨 CRITICAL: Prevent race condition attacks
    const userKey = `${userAddress.toLowerCase()}_${grantAddress.toLowerCase()}`
    
    if (pendingRedemptions.has(userKey)) {
      console.log(`⛔ BLOCKED: User ${userAddress} already has pending redemption for grant ${grantAddress}`)
      return NextResponse.json({ 
        error: 'Redemption already in progress for this user and grant. Please wait for current transaction to complete.',
        details: { userAddress, grantAddress, note: 'Protection against double-redemption attacks' }
      }, { status: 429 }) // Too Many Requests
    }

    // Lock this user+grant combination
    pendingRedemptions.add(userKey)
    console.log(`🔒 LOCKED: User ${userAddress} for grant ${grantAddress}`)

    try {

    // Setup blockchain connection
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl)
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider)
    
    console.log('💳 Backend wallet:', wallet.address)
    
    // Check backend wallet balance
    const walletBalance = await provider.getBalance(wallet.address)
    console.log('💰 Backend wallet balance:', ethers.formatEther(walletBalance), 'MARS')
    
    if (walletBalance < ethers.parseEther('0.1')) {
      return NextResponse.json({
        error: 'Backend wallet has insufficient funds',
        details: `Backend wallet balance: ${ethers.formatEther(walletBalance)} MARS (minimum 0.1 required)`
      }, { status: 500 })
    }

    // Create contract instances
    const paymaster = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, wallet)
    const grant = new ethers.Contract(grantAddress, GRANT_ABI, wallet) // Use wallet, not provider!

    // Validation checks
    console.log('🔍 Performing validation checks...')

    // Check paymaster balance first
    const paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS)
    console.log('💳 Paymaster balance:', ethers.formatEther(paymasterBalance), 'MARS')
    
    if (paymasterBalance < ethers.parseEther('0.1')) {
      return NextResponse.json({
        error: 'Paymaster has insufficient funds',
        details: `Paymaster balance: ${ethers.formatEther(paymasterBalance)} MARS (minimum 0.1 required)`
      }, { status: 500 })
    }

    // 1. Check if backend wallet is authorized as paymaster on grant contract
    const isBackendAuthorized = await grant.authorizedPaymasters(wallet.address)
    if (!isBackendAuthorized) {
      return NextResponse.json({
        error: 'Backend wallet not authorized as paymaster on grant contract',
        details: { 
          backendWallet: wallet.address, 
          grantAddress,
          note: 'Backend wallet must be authorized as paymaster on the grant contract'
        }
      }, { status: 500 })
    }
    console.log('✅ Backend wallet is authorized as paymaster on grant contract')

    // 2. Check if user has already redeemed
    const hasRedeemed = await grant.hasAddressRedeemed(userAddress)
    if (hasRedeemed) {
      return NextResponse.json({
        error: 'User has already redeemed from this grant',
        details: { userAddress, grantAddress }
      }, { status: 400 })
    }
    console.log('✅ User has not redeemed yet')

    // 3. Basic rate limiting (optional - implement custom logic if needed)
    console.log('✅ Skipping paymaster rate limit (using direct grant call)')

    // 4. Check if user can redeem from grant (whitelist, funds, etc.)
    const canRedeem = await grant.canUserRedeem(userAddress)
    if (!canRedeem) {
      return NextResponse.json({
        error: 'User cannot redeem from grant (insufficient funds, not whitelisted, or paused)',
        details: { userAddress, grantAddress }
      }, { status: 400 })
    }
    console.log('✅ User can redeem from grant')

    // All checks passed - execute gasless redemption
    console.log('⚡ Executing gasless redemption...')
    console.log('📝 Calling grant.redeemForUser with params:')
    console.log('  - User Address:', userAddress)
    console.log('  - Grant Address:', grantAddress)
    console.log('  - Backend Wallet (Paymaster):', wallet.address)

    try {
      // Estimate gas first to get better error messages
      console.log('🔍 Estimating gas...')
      const gasEstimate = await grant.redeemForUser.estimateGas(userAddress)
      console.log('⛽ Estimated gas:', gasEstimate.toString())
      
      // Execute transaction - call grant directly as authorized paymaster
      const tx = await grant.redeemForUser(userAddress, {
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
      })
      console.log('📝 Transaction submitted:', tx.hash)

      // Wait for confirmation
      const receipt = await tx.wait()
      console.log('✅ Transaction confirmed!')
      console.log('⛽ Gas used:', receipt.gasUsed.toString())
      console.log('📊 Transaction status:', receipt.status)
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed with status 0 (reverted)')
      }
      
      // Return success response inside the try block where tx and receipt are in scope
      return NextResponse.json({
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        userAddress,
        grantAddress,
        message: 'Gasless redemption successful! Tokens transferred to user wallet.'
      })
      
    } catch (txError: any) {
      console.error('❌ Transaction execution failed:', txError)
      console.error('Error details:', {
        message: txError.message,
        code: txError.code,
        reason: txError.reason,
        data: txError.data
      })
      
      // Try to decode the revert reason
      if (txError.data) {
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], txError.data)
          console.log('🔍 Decoded revert reason:', decoded[0])
        } catch (decodeError) {
          console.log('🔍 Could not decode revert reason from:', txError.data)
        }
      }
      
      throw txError // Re-throw to be caught by outer try-catch
    }

    } finally {
      // 🔓 CRITICAL: Always unlock user, even on error
      pendingRedemptions.delete(userKey)
      console.log(`🔓 UNLOCKED: User ${userAddress} for grant ${grantAddress}`)
    }

  } catch (error: any) {
    console.error('❌ Gasless redemption failed:', error)
    
    // Handle specific error types
    if (error.code === 'CALL_EXCEPTION') {
      return NextResponse.json({
        error: 'Contract call failed',
        details: error.reason || error.message,
        code: error.code
      }, { status: 400 })
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({
        error: 'Backend wallet has insufficient funds to pay gas',
        details: 'Please contact administrator to fund the backend wallet'
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
} 