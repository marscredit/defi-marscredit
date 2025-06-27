import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { metaMask, injected } from 'wagmi/connectors'

// Mars Credit Network Chain Configuration
export const marsCreditNetwork = defineChain({
  id: 110110,
  name: 'Mars Credit Network',
  network: 'marscredit',
  nativeCurrency: {
    decimals: 18,
    name: 'MARS',
    symbol: 'MARS',
  },
  rpcUrls: {
    public: { http: ['https://rpc.marscredit.xyz'] },
    default: { http: ['https://rpc.marscredit.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mars Credit Explorer', url: 'https://blockscan.marscredit.xyz' },
  },
})

// Simple wagmi config with client-safe connectors
export const config = createConfig({
  chains: [marsCreditNetwork],
  connectors: [
    metaMask(),
    injected(), // For Zerion and other injected wallets
    // Note: WalletConnect removed temporarily to fix SSR issues
    // Will add back with proper client-side only initialization
  ],
  transports: {
    [marsCreditNetwork.id]: http(),
  },
})

export default config 