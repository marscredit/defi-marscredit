# 🚀 Mars Bridge Production Deployment Guide

## Overview

The Mars Bridge production system now includes integrated background services that run alongside your Next.js application in Docker. This eliminates the need for separate containers or external process managers.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            Production Bridge Manager                    ││
│  │                                                         ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ ││
│  │  │   Next.js App   │  │ Queue Processor │  │ Bridge Relayer  │ ││
│  │  │   (Port 3000)   │  │  (Background)   │  │  (Background)   │ ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘ ││
│  │                                                         ││
│  │  ┌─────────────────────────────────────────────────────┐ ││
│  │  │              Health Monitoring                      │ ││
│  │  │         (30-second intervals)                       │ ││
│  │  └─────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  File System                            ││
│  │                                                         ││
│  │  📁 /app/data/                                          ││
│  │    └── bridge-queue.json (Persistent queue)            ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Setup Instructions

### 1. Environment Variables

Ensure your production environment has all required variables:

```bash
# Required for Next.js
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Required for Bridge Services
RELAYER_PRIVATE_KEY=your,private,key,array
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MARS_MINT=uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b
BRIDGE_CONTRACT_ADDRESS=0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba

# Optional
BRIDGE_API_URL=https://your-domain.com
```

### 2. Docker Deployment

The updated `Dockerfile` automatically includes the production bridge manager:

```dockerfile
# The new CMD runs the integrated bridge system
CMD ["node", "scripts/production-bridge-manager.js"]
```

### 3. Build and Deploy

```bash
# Build the Docker image
docker build -t mars-bridge-production .

# Run with environment variables
docker run -d \
  --name mars-bridge \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e RELAYER_PRIVATE_KEY="your,private,key,array" \
  -e SOLANA_RPC_URL="https://api.mainnet-beta.solana.com" \
  -e MARS_MINT="uNcM3H28XL12sZL2LXnrUG5EnfTRQx9wb2ULh5hUF4b" \
  -e BRIDGE_CONTRACT_ADDRESS="0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba" \
  -v mars-bridge-data:/app/data \
  mars-bridge-production
```

### 4. Railway/Render Deployment

For Railway, Render, or similar platforms:

1. **Set environment variables** in your platform dashboard
2. **Deploy from GitHub** - the platform will automatically use the Dockerfile
3. **The bridge services will start automatically** with the Next.js app

## 🔍 Monitoring

### Health Checks

The system provides comprehensive health monitoring:

```bash
# Check service health
curl https://your-domain.com/api/health

# Check bridge monitor
curl https://your-domain.com/api/bridge/monitor
```

### Production Monitoring Script

Run the production monitor locally to check your deployment:

```bash
# One-time check
npm run bridge:monitor:production

# Continuous monitoring
npm run bridge:monitor:watch

# Or with custom URL
BRIDGE_API_URL=https://your-domain.com npm run bridge:monitor:production
```

### Example Monitor Output

```
🔍 Mars Bridge Production Monitor
=================================
🔍 Monitoring bridge at: https://your-domain.com
📅 Check time: 1/15/2025, 2:30:00 PM

💓 Checking service health...
✅ Service is healthy
⏱️  Response time: 45ms
🔢 Node version: v18.19.0
📦 App version: 1.0.0

🌐 Environment variables:
  RELAYER_PRIVATE_KEY: ✅
  SOLANA_RPC_URL: ✅
  MARS_MINT: ✅
  BRIDGE_CONTRACT_ADDRESS: ✅

📋 Queue status:
  Status: ✅ healthy
  Total: 15
  Pending: 2
  Completed: 12
  Failed: 1

🌉 Checking bridge monitor...
✅ Bridge monitor is working

📊 Bridge statistics:
  Total transactions: 15
  Pending: 2
  Completed: 12
  Failed: 1
  Processing: 0

💰 Relayer wallet:
  Address: Dn1KtSuW3reCNBVHPq7Wxubhqwr7dqa5kijVaLiQUF5k
  SOL balance: 0.255123 SOL

🚨 Alerts:
  ❌ 1 failed transactions
  ⏳ 1 pending retries

⏰ Next retry: 1/15/2025, 2:35:00 PM
🕐 Oldest pending: 1/15/2025, 2:25:00 PM

==================================================
⚠️  Issues detected - please review alerts above
```

## 🚨 Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check environment variables
   - Verify Docker logs: `docker logs mars-bridge`
   - Ensure port 3000 is available

2. **Queue Not Processing**
   - Check relayer wallet SOL balance
   - Verify `RELAYER_PRIVATE_KEY` format
   - Check Solana RPC endpoint

3. **Bridge Relayer Failing**
   - Confirm bridge contract address
   - Check L1 network connectivity
   - Verify contract deployment

### Logs and Debugging

```bash
# View container logs
docker logs -f mars-bridge

# Check specific service logs
docker exec mars-bridge tail -f /app/data/bridge-queue.json

# Monitor queue file
docker exec mars-bridge cat /app/data/bridge-queue.json | jq
```

## 🔄 Process Management

### Automatic Restart

The production manager includes automatic restart logic:

- **Queue Processor**: Restarts after 5 seconds if it fails
- **Bridge Relayer**: Restarts after 10 seconds if it fails
- **Health Monitoring**: Runs every 30 seconds

### Graceful Shutdown

The system handles graceful shutdown on:
- `SIGTERM` (Docker stop)
- `SIGINT` (Ctrl+C)
- `SIGQUIT`

### Manual Management

```bash
# Restart the container
docker restart mars-bridge

# Check process status
docker exec mars-bridge ps aux

# Manual queue processing
docker exec mars-bridge npm run bridge:queue
```

## 📈 Scaling

### Horizontal Scaling

For multiple instances:

1. **Use shared storage** for queue persistence
2. **Implement queue locking** to prevent conflicts
3. **Load balance** API requests
4. **Monitor relayer wallet** balance across instances

### Vertical Scaling

- **CPU**: Each background service uses minimal CPU
- **Memory**: ~100MB per service
- **Storage**: Queue file grows with transaction history

## 🔐 Security

### Environment Variables

- **Never commit** private keys to version control
- **Use encrypted storage** for sensitive env vars
- **Rotate keys regularly**
- **Monitor wallet balance** for unusual activity

### Network Security

- **Restrict API access** to authorized IPs
- **Use HTTPS** for all communication
- **Monitor failed requests** for attacks
- **Implement rate limiting** on bridge endpoints

## 📊 Performance

### Expected Performance

- **Queue Processing**: 10-second intervals
- **Health Checks**: 30-second intervals
- **API Response Time**: < 100ms typical
- **Transaction Processing**: 1-2 minutes per transaction

### Optimization

- **Batch processing** for multiple transactions
- **Connection pooling** for Solana RPC
- **Cache frequent queries**
- **Optimize retry intervals** based on success rate

---

## 🎯 Next Steps

1. **Deploy to production** using updated Dockerfile
2. **Set up monitoring** with production monitor script
3. **Configure alerts** for failed transactions
4. **Monitor relayer wallet** balance
5. **Test queue processing** with small transactions

Your bridge queue system is now fully integrated and production-ready! 🚀 