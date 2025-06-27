#!/usr/bin/env node

const { createPublicClient, http, formatEther, parseAbi } = require('viem')

// Mars Credit Network configuration
const marsCreditNetwork = {
  id: 110110,
  name: 'Mars Credit Network',
  rpcUrls: {
    default: { http: ['https://rpc.marscredit.xyz'] }
  },
  blockExplorers: {
    default: { name: 'Mars Credit Explorer', url: 'https://blockscan.marscredit.xyz' }
  }
}

// Contract addresses
const DEPLOYED_CONTRACTS = {
  simpleTokenGrant: '0x3D8a86688bBfD56903F6ace6f6B0B84b006C2174',
  gaslessGrant: '0x262622B66cB6fB6b1AAb0F22Dcf57b84c66f27B6',
  paymaster: '0x0adA42cefCa7e464D4aC91d39c9C2E1F51b6B2F4'
}

// ABIs
const SIMPLE_TOKEN_GRANT_ABI = parseAbi([
  'function owner() view returns (address)',
  'function rewardPerUser() view returns (uint256)',
  'function totalUsers() view returns (uint256)',
  'function hasRedeemed(address) view returns (bool)',
  'function balance() view returns (uint256)',
  'function redeem() external',
  'event Redemption(address indexed user, uint256 amount)'
])

const PAYMASTER_ABI = parseAbi([
  'function owner() view returns (address)',
  'function balance() view returns (uint256)',
  'function totalSponsored() view returns (uint256)',
  'function rateLimit() view returns (uint256)',
  'function authorizedGrants(address) view returns (bool)',
  'function lastGaslessRedemption(address) view returns (uint256)',
  'function canUseGasless(address) view returns (bool)',
  'function sponsoredRedemption(address grantAddress) external',
  'event GaslessRedemption(address indexed user, address indexed grant, uint256 amount, uint256 gasSaved)'
])

// Create client
const client = createPublicClient({
  chain: marsCreditNetwork,
  transport: http()
})

async function getNetworkInfo() {
  console.log('\n🌐 MARS CREDIT NETWORK STATUS')
  console.log('=' .repeat(50))
  
  try {
    const [blockNumber, gasPrice, chainId] = await Promise.all([
      client.getBlockNumber(),
      client.getGasPrice(),
      client.getChainId()
    ])
    
    console.log(`📊 Chain ID: ${chainId}`)
    console.log(`🔢 Latest Block: ${blockNumber.toLocaleString()}`)
    console.log(`⛽ Gas Price: ${formatEther(gasPrice)} MARS (${gasPrice.toString()} wei)`)
    
    // Get latest block details
    const latestBlock = await client.getBlock({ blockNumber })
    console.log(`⏰ Block Timestamp: ${new Date(Number(latestBlock.timestamp) * 1000).toISOString()}`)
    console.log(`📦 Transactions in Block: ${latestBlock.transactions.length}`)
    
  } catch (error) {
    console.error('❌ Error fetching network info:', error.message)
  }
}

async function checkTransaction(txHash) {
  if (!txHash) return
  
  console.log(`\n🔍 TRANSACTION ANALYSIS: ${txHash}`)
  console.log('=' .repeat(80))
  
  try {
    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({ hash: txHash })
    console.log(`✅ Status: ${receipt.status === 'success' ? 'SUCCESS' : 'FAILED'}`)
    console.log(`🔢 Block Number: ${receipt.blockNumber.toLocaleString()}`)
    console.log(`📍 Transaction Index: ${receipt.transactionIndex}`)
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toLocaleString()} / ${receipt.cumulativeGasUsed.toLocaleString()}`)
    console.log(`💰 Effective Gas Price: ${formatEther(receipt.effectiveGasPrice)} MARS`)
    
    // Calculate total cost
    const totalCost = receipt.gasUsed * receipt.effectiveGasPrice
    console.log(`💸 Total Cost: ${formatEther(totalCost)} MARS`)
    
    // Get transaction details
    const tx = await client.getTransaction({ hash: txHash })
    console.log(`👤 From: ${tx.from}`)
    console.log(`🎯 To: ${tx.to}`)
    console.log(`💎 Value: ${formatEther(tx.value)} MARS`)
    
    // Analyze logs
    if (receipt.logs.length > 0) {
      console.log(`\n📋 EVENT LOGS (${receipt.logs.length} events):`)
      receipt.logs.forEach((log, index) => {
        console.log(`  ${index + 1}. Contract: ${log.address}`)
        console.log(`     Topics: ${log.topics.length}`)
        log.topics.forEach((topic, i) => {
          console.log(`       [${i}]: ${topic}`)
        })
        if (log.data && log.data !== '0x') {
          console.log(`     Data: ${log.data}`)
        }
      })
    }
    
    return receipt
    
  } catch (error) {
    console.error('❌ Error fetching transaction:', error.message)
    return null
  }
}

async function checkContract(contractAddress, abi, name) {
  console.log(`\n📋 ${name.toUpperCase()} CONTRACT: ${contractAddress}`)
  console.log('=' .repeat(80))
  
  try {
    // Check if contract exists
    const code = await client.getBytecode({ address: contractAddress })
    if (!code || code === '0x') {
      console.log('❌ Contract not deployed or has no code')
      return null
    }
    
    console.log('✅ Contract deployed and has code')
    
    // Get contract info
    const [owner, balance, rewardPerUser, totalUsers] = await Promise.all([
      client.readContract({
        address: contractAddress,
        abi,
        functionName: 'owner'
      }).catch(() => 'N/A'),
      client.readContract({
        address: contractAddress,
        abi,
        functionName: 'balance'
      }).catch(() => 'N/A'),
      client.readContract({
        address: contractAddress,
        abi,
        functionName: 'rewardPerUser'
      }).catch(() => 'N/A'),
      client.readContract({
        address: contractAddress,
        abi,
        functionName: 'totalUsers'
      }).catch(() => 'N/A')
    ])
    
    console.log(`👑 Owner: ${owner}`)
    console.log(`💰 Contract Balance: ${balance !== 'N/A' ? formatEther(balance) : 'N/A'} MARS`)
    console.log(`🎁 Reward Per User: ${rewardPerUser !== 'N/A' ? formatEther(rewardPerUser) : 'N/A'} MARS`)
    console.log(`👥 Total Users: ${totalUsers !== 'N/A' ? totalUsers.toString() : 'N/A'}`)
    
    return { owner, balance, rewardPerUser, totalUsers }
    
  } catch (error) {
    console.error(`❌ Error checking ${name} contract:`, error.message)
    return null
  }
}

async function checkPaymaster() {
  console.log(`\n⚡ PAYMASTER CONTRACT: ${DEPLOYED_CONTRACTS.paymaster}`)
  console.log('=' .repeat(80))
  
  try {
    const code = await client.getBytecode({ address: DEPLOYED_CONTRACTS.paymaster })
    if (!code || code === '0x') {
      console.log('❌ Paymaster not deployed')
      return null
    }
    
    console.log('✅ Paymaster deployed and has code')
    
    const [owner, balance, totalSponsored, rateLimit] = await Promise.all([
      client.readContract({
        address: DEPLOYED_CONTRACTS.paymaster,
        abi: PAYMASTER_ABI,
        functionName: 'owner'
      }).catch(() => 'N/A'),
      client.readContract({
        address: DEPLOYED_CONTRACTS.paymaster,
        abi: PAYMASTER_ABI,
        functionName: 'balance'
      }).catch(() => 'N/A'),
      client.readContract({
        address: DEPLOYED_CONTRACTS.paymaster,
        abi: PAYMASTER_ABI,
        functionName: 'totalSponsored'
      }).catch(() => 'N/A'),
      client.readContract({
        address: DEPLOYED_CONTRACTS.paymaster,
        abi: PAYMASTER_ABI,
        functionName: 'rateLimit'
      }).catch(() => 'N/A')
    ])
    
    console.log(`👑 Owner: ${owner}`)
    console.log(`💰 Balance: ${balance !== 'N/A' ? formatEther(balance) : 'N/A'} MARS`)
    console.log(`📊 Total Sponsored: ${totalSponsored !== 'N/A' ? formatEther(totalSponsored) : 'N/A'} MARS`)
    console.log(`⏱️ Rate Limit: ${rateLimit !== 'N/A' ? rateLimit.toString() : 'N/A'} blocks`)
    
    // Test grant authorization
    console.log('\n🎯 Grant Authorization Status:')
    for (const [name, address] of Object.entries(DEPLOYED_CONTRACTS)) {
      if (name === 'paymaster') continue
      try {
        const isAuthorized = await client.readContract({
          address: DEPLOYED_CONTRACTS.paymaster,
          abi: PAYMASTER_ABI,
          functionName: 'authorizedGrants',
          args: [address]
        })
        console.log(`  ${name}: ${isAuthorized ? '✅ Authorized' : '❌ Not Authorized'}`)
      } catch (error) {
        console.log(`  ${name}: ❌ Error checking authorization`)
      }
    }
    
    return { owner, balance, totalSponsored, rateLimit }
    
  } catch (error) {
    console.error('❌ Error checking paymaster:', error.message)
    return null
  }
}

async function checkUserStatus(userAddress) {
  if (!userAddress) return
  
  console.log(`\n👤 USER STATUS: ${userAddress}`)
  console.log('=' .repeat(80))
  
  try {
    // Get user balance
    const balance = await client.getBalance({ address: userAddress })
    console.log(`💰 MARS Balance: ${formatEther(balance)} MARS`)
    
    // Check redemption status for each grant
    console.log('\n🎁 Grant Redemption Status:')
    for (const [name, address] of Object.entries(DEPLOYED_CONTRACTS)) {
      if (name === 'paymaster') continue
      try {
        const hasRedeemed = await client.readContract({
          address,
          abi: SIMPLE_TOKEN_GRANT_ABI,
          functionName: 'hasRedeemed',
          args: [userAddress]
        })
        console.log(`  ${name}: ${hasRedeemed ? '✅ Already Redeemed' : '⭕ Available'}`)
      } catch (error) {
        console.log(`  ${name}: ❌ Error checking status`)
      }
    }
    
    // Check gasless eligibility
    if (DEPLOYED_CONTRACTS.paymaster !== '0x0000000000000000000000000000000000000000') {
      try {
        const [canUseGasless, lastRedemption] = await Promise.all([
          client.readContract({
            address: DEPLOYED_CONTRACTS.paymaster,
            abi: PAYMASTER_ABI,
            functionName: 'canUseGasless',
            args: [userAddress]
          }),
          client.readContract({
            address: DEPLOYED_CONTRACTS.paymaster,
            abi: PAYMASTER_ABI,
            functionName: 'lastGaslessRedemption',
            args: [userAddress]
          })
        ])
        
        console.log('\n⚡ Gasless Transaction Status:')
        console.log(`  Can Use Gasless: ${canUseGasless ? '✅ Yes' : '❌ No'}`)
        console.log(`  Last Redemption Block: ${lastRedemption.toString()}`)
        
        if (!canUseGasless && lastRedemption > 0n) {
          const currentBlock = await client.getBlockNumber()
          const blocksLeft = 1000n - (currentBlock - lastRedemption) // Rate limit is 1000 blocks
          if (blocksLeft > 0n) {
            const hoursLeft = Math.ceil(Number(blocksLeft) * 14.3 / 3600)
            console.log(`  Blocks Until Next: ${blocksLeft.toString()} (~${hoursLeft}h)`)
          }
        }
        
      } catch (error) {
        console.log('⚡ Gasless Status: ❌ Error checking gasless eligibility')
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking user status:', error.message)
  }
}

async function getRecentTransactions(contractAddress, fromBlock = 'latest') {
  console.log(`\n📋 RECENT TRANSACTIONS: ${contractAddress}`)
  console.log('=' .repeat(80))
  
  try {
    // Get recent blocks to search for transactions
    const latestBlock = await client.getBlockNumber()
    const searchFromBlock = typeof fromBlock === 'string' ? latestBlock - 1000n : fromBlock
    
    // Get redemption events
    const redemptionLogs = await client.getLogs({
      address: contractAddress,
      event: {
        type: 'event',
        name: 'Redemption',
        inputs: [
          { indexed: true, name: 'user', type: 'address' },
          { indexed: false, name: 'amount', type: 'uint256' }
        ]
      },
      fromBlock: searchFromBlock,
      toBlock: latestBlock
    })
    
    console.log(`Found ${redemptionLogs.length} redemption events in last 1000 blocks`)
    
    redemptionLogs.slice(-10).forEach((log, index) => {
      console.log(`  ${index + 1}. Block ${log.blockNumber}: ${log.topics[1]} redeemed`)
      console.log(`     Tx: ${log.transactionHash}`)
    })
    
    return redemptionLogs
    
  } catch (error) {
    console.error('❌ Error fetching recent transactions:', error.message)
    return []
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  console.log('🚀 MARS CREDIT NETWORK BLOCKCHAIN QUERY TOOL')
  console.log('=' .repeat(60))
  
  // Always show network status
  await getNetworkInfo()
  
  switch (command) {
    case 'tx':
      const txHash = args[1]
      if (!txHash) {
        console.log('\nUsage: node scripts/query-blockchain.js tx <transaction_hash>')
        break
      }
      await checkTransaction(txHash)
      break
      
    case 'user':
      const userAddress = args[1]
      if (!userAddress) {
        console.log('\nUsage: node scripts/query-blockchain.js user <user_address>')
        break
      }
      await checkUserStatus(userAddress)
      break
      
    case 'contracts':
      await checkContract(DEPLOYED_CONTRACTS.simpleTokenGrant, SIMPLE_TOKEN_GRANT_ABI, 'Simple Token Grant')
      await checkContract(DEPLOYED_CONTRACTS.gaslessGrant, SIMPLE_TOKEN_GRANT_ABI, 'Gasless Grant')
      await checkPaymaster()
      break
      
    case 'recent':
      const contractAddr = args[1] || DEPLOYED_CONTRACTS.gaslessGrant
      await getRecentTransactions(contractAddr)
      break
      
    case 'full':
      await checkContract(DEPLOYED_CONTRACTS.simpleTokenGrant, SIMPLE_TOKEN_GRANT_ABI, 'Simple Token Grant')
      await checkContract(DEPLOYED_CONTRACTS.gaslessGrant, SIMPLE_TOKEN_GRANT_ABI, 'Gasless Grant')
      await checkPaymaster()
      if (args[1]) {
        await checkUserStatus(args[1])
      }
      break
      
    default:
      console.log('\n📖 AVAILABLE COMMANDS:')
      console.log('  tx <hash>          - Analyze specific transaction')
      console.log('  user <address>     - Check user status and balances')
      console.log('  contracts          - Check all deployed contracts')
      console.log('  recent [address]   - Show recent transactions')
      console.log('  full [user]        - Full system status + optional user check')
      console.log('\n💡 EXAMPLES:')
      console.log('  node scripts/query-blockchain.js tx 0x51df4a306e6804046b01000fac21d8c917796e6c6487092d26a238763af24f56')
      console.log('  node scripts/query-blockchain.js user 0xAb689a95Eb3a3f3cc06ba08a7770bF2410Dd80E8')
      console.log('  node scripts/query-blockchain.js full 0xAb689a95Eb3a3f3cc06ba08a7770bF2410Dd80E8')
  }
}

// Run the script
main().catch(console.error) 