# Mars Credit Network DeFi Application

A decentralized finance (DeFi) application built for the Mars Credit Network blockchain. This application enables users to redeem MARS tokens through a grant system, connect their wallets, and explore DeFi features on the Mars Credit Network ecosystem.

## 🚀 Features

- **Mars-Themed UI**: Beautiful dark theme with red accents and Mars-inspired animations
- **Wallet Integration**: Connect with MetaMask and Zerion wallets via Web3Modal
- **Token Grants**: Redeem MARS tokens through various grant programs
- **Dashboard**: View wallet balance, transaction history, and account overview
- **Bridge (Coming Soon)**: Cross-chain bridge functionality for asset transfers
- **Responsive Design**: Mobile-first design that works on all devices
- **Mars Credit Network**: Native support for Mars Credit Network (Chain ID: 110110)

## 🛠 Technology Stack

- **Frontend**: Next.js 13 with App Router, TypeScript, Tailwind CSS
- **Blockchain**: wagmi, viem, ethers.js for Web3 integration
- **Wallet Connection**: Web3Modal for wallet connectivity
- **Smart Contracts**: Solidity with OpenZeppelin for security
- **Development**: Truffle for smart contract deployment and testing

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js 16 or higher installed
- npm or yarn package manager
- MetaMask or compatible wallet extension
- Access to Mars Credit Network RPC endpoint

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/defi-marscredit.git
   cd defi-marscredit
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (frontend + smart contracts)
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory:
   ```bash
   # WalletConnect Project ID (required for Web3Modal)
   NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id_here
   
   # Mars Credit Network configuration
   NEXT_PUBLIC_RPC_URL=https://rpc.marscredit.xyz
   NEXT_PUBLIC_EXPLORER_URL=https://blockscan.marscredit.xyz
   
   # Smart contract deployment (for deployment only)
   PRIVATE_KEY=your_private_key_here
   RPC_URL=https://rpc.marscredit.xyz
   ```

   Get your WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/)

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗 Smart Contract Development

### Deploy Token Grant Contract

1. **Configure Truffle**
   
   Update `truffle-config.js` with your private key and RPC URL:
   ```javascript
   // Add your environment variables
   PRIVATE_KEY=your_private_key_here
   RPC_URL=https://rpc.marscredit.xyz
   ```

2. **Compile Contracts**
   ```bash
   truffle compile
   ```

3. **Deploy to Mars Credit Network**
   ```bash
   truffle migrate --network marscredit
   ```

4. **Fund the Contract**
   
   After deployment, fund the contract with MARS tokens using the `fundGrant()` function.

### Contract Features

- **Token Redemption**: Users can redeem a fixed amount of MARS tokens once per address
- **Security**: Reentrancy protection, pause functionality, and ownership controls
- **Events**: Comprehensive event logging for frontend integration
- **Emergency Functions**: Owner can pause/unpause and emergency withdraw

## 🌐 Mars Credit Network Configuration

### Network Details
- **Chain ID**: 110110 (0x1ae1e)
- **Network Name**: Mars Credit Network
- **Currency**: MARS
- **RPC URL**: https://rpc.marscredit.xyz
- **Explorer**: https://blockscan.marscredit.xyz

### Adding to MetaMask

1. Click "Add Network" in MetaMask
2. Enter the network details above
3. Save and switch to Mars Credit Network

## 📱 Application Structure

```
defi-marscredit/
├── contracts/              # Smart contracts
│   └── TokenGrant.sol      # Main grant contract
├── migrations/             # Truffle deployment scripts
├── src/                    # Next.js frontend source
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   └── lib/              # Utilities and Web3 config
├── public/                # Static assets
├── docs/                  # Documentation
│   ├── cursor/           # Project rules and iterations
│   │   ├── rules/       # Coding standards and guidelines
│   │   └── iterations/  # Development iteration docs
├── package.json          # Unified dependencies (frontend + contracts)
├── truffle-config.js     # Smart contract deployment config
├── tsconfig.json         # TypeScript configuration
└── README.md
```

## 🎨 UI/UX Features

- **Mars Theme**: Black background with bright red accents
- **Animations**: Rotating Mars planet, floating stars, smooth transitions
- **Responsive**: Mobile-first design with hamburger navigation
- **Accessibility**: Proper focus states, ARIA labels, keyboard navigation
- **Loading States**: Skeleton loaders and spinners for better UX

## 🔗 Key Pages

### Homepage (`/`)
- Hero section with Mars planet animation
- Feature overview cards
- Network statistics
- Call-to-action buttons

### Grants (`/grants`)
- List of available token grants
- Grant details with progress bars
- Wallet connection prompt
- Real-time grant status

### Grant Detail (`/grants/[id]`)
- Detailed grant information
- Token redemption interface
- Transaction status tracking
- Contract information

### Bridge (`/bridge`)
- Coming soon placeholder
- Waitlist signup form
- Development roadmap
- Feature preview

### Dashboard (`/dashboard`)
- Wallet balance display
- Transaction history
- Quick action buttons
- Account overview

## 🚀 Deployment

### Frontend Deployment (Vercel)

1. **Connect Repository**
   - Link your GitHub repository to Vercel
   - Configure build settings for Next.js

2. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure `NEXT_PUBLIC_PROJECT_ID` is set

3. **Custom Domain**
   - Configure `defi.marscredit.xyz` domain
   - Set up SSL certificate

### Smart Contract Deployment

1. **Mainnet Deployment**
   ```bash
   truffle migrate --network marscredit
   ```

2. **Verification**
   - Verify contract on Mars Credit Network explorer
   - Update frontend with deployed contract address

## 🧪 Testing

### Frontend Testing
```bash
cd app
npm run test
```

### Smart Contract Testing
```bash
truffle test
```

### Integration Testing
- Test wallet connectivity
- Verify grant redemption flow
- Check responsive design
- Validate error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **GitHub Issues**: [Create an issue](https://github.com/your-username/defi-marscredit/issues)
- **Discord**: [Mars Credit Community](https://discord.gg/marscredit)
- **Twitter**: [@MarsCredit](https://twitter.com/marscredit)
- **Email**: support@marscredit.xyz

## 🗺 Roadmap

- ✅ **Phase 1**: Core application with grant system
- 🔄 **Phase 2**: Bridge functionality development
- 📋 **Phase 3**: Advanced DeFi features (staking, lending)
- 🌐 **Phase 4**: Multi-chain expansion
- 🤖 **Phase 5**: DAO governance implementation

## ⚠️ Disclaimer

This is a DeFi application that interacts with blockchain technology. Please:

- Only invest what you can afford to lose
- Verify all transactions before confirming
- Keep your private keys secure
- Understand the risks of DeFi protocols

---

**Built with ❤️ for the Mars Credit Network ecosystem** 