import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { getRpcUrl } from '@/lib/chains'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(getRpcUrl(base.id)!),
  },
  connectors: [
    // Farcaster Mini App connector (primary)
    miniAppConnector(),
    // Injected wallet connectors (MetaMask, Coinbase Wallet, etc.)
    injected({
      target: 'metaMask',
    }),
    metaMask(),
    coinbaseWallet({
      appName: 'Multisender Mini App',
    }),
    // Generic injected connector for other wallets
    injected(),
  ]
})
