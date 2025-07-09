import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check database/file system access
    const queueFile = path.join(process.cwd(), 'data/bridge-queue.json');
    let queueStatus = 'healthy';
    let queueStats = null;
    
    try {
      await fs.access(path.dirname(queueFile));
      
      try {
        const queueData = await fs.readFile(queueFile, 'utf8');
        const queue = JSON.parse(queueData);
        
        queueStats = {
          total: queue.length,
          pending: queue.filter(item => item.status === 'pending').length,
          completed: queue.filter(item => item.status === 'completed').length,
          failed: queue.filter(item => item.status === 'failed').length,
        };
      } catch (error) {
        // Queue file doesn't exist yet - that's OK
        queueStats = { total: 0, pending: 0, completed: 0, failed: 0 };
      }
    } catch (error) {
      queueStatus = 'error';
      queueStats = { error: error.message };
    }
    
    // Check environment variables (matching Railway config)
    const envStatus = {
      RELAYER_PRIVATE_KEY: !!process.env.RELAYER_PRIVATE_KEY,
      RPC_URL: !!process.env.RPC_URL,
      MARS_MINT_ADDRESS: !!process.env.MARS_MINT_ADDRESS,
      BRIDGE_CONTRACT_ADDRESS: !!process.env.BRIDGE_CONTRACT_ADDRESS,
    };
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'mars-bridge-api',
      responseTime: `${responseTime}ms`,
      queue: {
        status: queueStatus,
        stats: queueStats,
      },
      environment: envStatus,
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
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
 