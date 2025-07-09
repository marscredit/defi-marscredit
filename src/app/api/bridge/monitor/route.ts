import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Connection, PublicKey } from '@solana/web3.js';

export async function GET() {
  try {
    const queueFile = path.join(process.cwd(), 'data/bridge-queue.json');
    let queue = [];
    
    try {
      const queueData = await fs.readFile(queueFile, 'utf8');
      queue = JSON.parse(queueData);
    } catch (error) {
      // Queue file doesn't exist yet
    }
    
    // Calculate statistics
    const stats = {
      total: queue.length,
      pending: queue.filter(item => item.status === 'pending').length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length,
      processing: queue.filter(item => item.status === 'processing').length,
    };
    
    // Get recent transactions (last 10)
    const recentTransactions = queue
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(tx => ({
        id: tx.id,
        status: tx.status,
        amount: tx.amount,
        recipient: tx.recipient,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
        attempts: tx.attempts,
        lastError: tx.lastError,
        solanaTransaction: tx.solanaTransaction,
      }));
    
    // Check relayer wallet balance
    let relayerBalance = null;
    try {
      const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
      const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      
      if (RELAYER_PRIVATE_KEY) {
        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
        const relayerKeypair = Buffer.from(RELAYER_PRIVATE_KEY.split(',').map(num => parseInt(num)));
        const relayerPubkey = new PublicKey(relayerKeypair.slice(32, 64));
        
        const balance = await connection.getBalance(relayerPubkey);
        relayerBalance = {
          sol: balance / 1e9,
          lamports: balance,
          address: relayerPubkey.toBase58(),
        };
      }
    } catch (error) {
      console.error('Error checking relayer balance:', error);
    }
    
    // Check failed transactions that need attention
    const failedTransactions = queue.filter(item => item.status === 'failed');
    const pendingRetries = queue.filter(item => 
      item.status === 'pending' && 
      item.attempts > 0 && 
      item.nextAttempt > Date.now()
    );
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      statistics: stats,
      relayerWallet: relayerBalance,
      recentTransactions,
      alerts: {
        failedTransactions: failedTransactions.length,
        pendingRetries: pendingRetries.length,
        lowSOLBalance: relayerBalance && relayerBalance.sol < 0.01,
      },
      queue: {
        nextRetryTime: pendingRetries.length > 0 
          ? new Date(Math.min(...pendingRetries.map(tx => tx.nextAttempt))).toISOString()
          : null,
        oldestPending: stats.pending > 0 
          ? queue
              .filter(item => item.status === 'pending')
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0].createdAt
          : null,
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 500 }
    );
  }
} 