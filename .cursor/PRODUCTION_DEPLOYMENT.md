# Mars Bridge Production Deployment Guide

## Overview
The Mars Bridge requires two main components for production:
1. **Bridge Relayer** - A long-running service that monitors both chains
2. **Frontend Application** - The Next.js app for user interaction

## Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mars L1 Chain │    │  Bridge Relayer │    │   Solana Chain  │
│                 │◄──►│   (24/7 Service)│◄──►│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Frontend App   │
                       │   (Optional)    │
                       └─────────────────┘
```

## Deployment Options

### Option 1: Cloud Provider (Recommended)

**Best for**: Production environments with high availability needs

**Providers**: Railway, Render, Heroku, DigitalOcean, AWS, GCP

**Steps**:
1. Deploy relayer as a persistent service
2. Deploy frontend separately (optional)
3. Set up monitoring and alerts

### Option 2: VPS/Dedicated Server

**Best for**: Cost-conscious setups or existing infrastructure

**Requirements**:
- Ubuntu 20.04+ or similar
- Node.js 18+
- PM2 for process management
- Nginx (optional, for frontend)

### Option 3: Integrated with Existing App

**Best for**: Adding bridge to existing DeFi platform

**Steps**:
1. Integrate bridge components into existing app
2. Run relayer as separate microservice
3. Use existing infrastructure

## Environment Variables

Create a `.env.production` file:

```env
# Bridge Configuration
BRIDGE_CONTRACT_ADDRESS=0xe0b596B25c67B8d4c37646C19dbBFfc2bE38A7Ba
MARS_MINT_ADDRESS=A9jPcpg7zUVtcNgs3GQS88BrLNiBnNxw1kwX3JRJrsw8
MARS_TOKEN_ACCOUNT=2kG3G15oeJxAhUYFPs1CQs8TQZWGRzzPSoaAJCN4uEQN

# Network Configuration
L1_RPC_URL=https://rpc.marscredit.xyz
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Relayer Keys (KEEP SECURE!)
RELAYER_PRIVATE_KEY=YOUR_L1_PRIVATE_KEY
SOLANA_PRIVATE_KEY=[YOUR_SOLANA_PRIVATE_KEY_ARRAY]

# Application
NODE_ENV=production
PORT=3000
```

## Quick Deploy to Railway

1. **Connect Repository**:
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Deploy Relayer**:
   - Go to Railway.app
   - Connect your GitHub repo
   - Add environment variables
   - Deploy

3. **Deploy Frontend** (Optional):
   - Create new Railway service
   - Connect same repo
   - Set start command: `npm run build && npm start`

## VPS Deployment

### 1. Setup Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/defi-marscredit.git
cd defi-marscredit
npm install
```

### 2. Configure Environment
```bash
# Create production environment file
cp .env.example .env.production

# Edit with your values
nano .env.production
```

### 3. Start Services
```bash
# Start relayer with PM2
pm2 start scripts/production-relayer.js --name "mars-bridge-relayer"

# Start frontend (optional)
npm run build
pm2 start npm --name "mars-bridge-frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Setup Monitoring
```bash
# View logs
pm2 logs mars-bridge-relayer

# Monitor processes
pm2 monit

# Restart if needed
pm2 restart mars-bridge-relayer
```

## Security Checklist

- [ ] **Private Keys**: Store in secure environment variables, never in code
- [ ] **RPC URLs**: Use reliable, high-uptime providers
- [ ] **Monitoring**: Set up alerts for service downtime
- [ ] **Backup**: Keep wallet backups in secure offline storage
- [ ] **Updates**: Regularly update dependencies and Node.js
- [ ] **Firewall**: Restrict access to necessary ports only

## Monitoring Setup

### Health Check Endpoint
The relayer includes a heartbeat every 5 minutes. You can add a health check endpoint:

```javascript
// Add to production-relayer.js
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(8080, () => {
  console.log('Health check server running on port 8080');
});
```

### Monitoring Services
- **UptimeRobot**: Free monitoring for health checks
- **DataDog**: Comprehensive application monitoring
- **New Relic**: Performance monitoring
- **Simple webhook**: Send alerts to Discord/Slack

## Scaling Considerations

### High Availability
- Run multiple relayer instances with different RPC providers
- Use load balancers for frontend
- Implement database for transaction tracking

### Performance
- Use WebSocket RPC providers for faster event detection
- Implement caching for bridge statistics
- Add Redis for session management

## Troubleshooting

### Common Issues

1. **RPC Rate Limits**:
   ```bash
   # Use multiple RPC providers
   L1_RPC_URL=https://rpc.marscredit.xyz,https://backup-rpc.marscredit.xyz
   ```

2. **Memory Leaks**:
   ```bash
   # Restart relayer daily
   pm2 restart mars-bridge-relayer --cron "0 0 * * *"
   ```

3. **Network Issues**:
   ```bash
   # Check connectivity
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     https://rpc.marscredit.xyz
   ```

## Cost Estimates

### Railway/Render
- Relayer: $5-20/month
- Frontend: $0-10/month
- Total: $5-30/month

### VPS (DigitalOcean)
- Basic Droplet: $5-20/month
- Managed Database: $15/month (optional)
- Total: $5-35/month

### AWS/GCP
- EC2/Compute: $10-50/month
- Additional services: $10-30/month
- Total: $20-80/month

## Next Steps

1. **Choose deployment method**
2. **Set up monitoring**
3. **Test bridge transactions**
4. **Add additional security measures**
5. **Scale as needed**

## Support

For deployment issues:
- Check logs: `pm2 logs mars-bridge-relayer`
- Monitor status: `pm2 monit`
- Health check: `curl localhost:8080/health`

The relayer is designed to be robust and self-healing, but monitoring is essential for production use. 