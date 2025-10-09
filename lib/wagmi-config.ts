import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { getRpcUrl } from '@/lib/chains'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(getRpcUrl(base.id)!),
  },
  // Avoid auto-adding injected connectors which can change connector shape
  multiInjectedProviderDiscovery: false,
  connectors: [
    miniAppConnector()
  ]
})
