export interface ChainInfo {
  id: number
  name: string
  symbol: string
  rpcUrl: string
  blockExplorer: string
  contractAddress: string
  isTestnet: boolean
  alchemyNetwork: string
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    contractAddress: process.env.NEXT_PUBLIC_BASE_MULTISENDER_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    isTestnet: false,
    alchemyNetwork: 'base'
  },
]

export function getChainInfo(chainId: number): ChainInfo | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.id === chainId)
}

export function getContractAddress(chainId: number): string | undefined {
  const chain = getChainInfo(chainId)
  return chain?.contractAddress
}

export function getExplorerUrl(chainId: number, hash: string): string {
  const chain = getChainInfo(chainId)
  if (!chain) return ''
  return `${chain.blockExplorer}/tx/${hash}`
}

export function getChainName(chainId: number): string {
  const chain = getChainInfo(chainId)
  return chain?.name || 'Unknown'
}

export function getAlchemyNetwork(chainId: number): string | undefined {
  const chain = getChainInfo(chainId)
  return chain?.alchemyNetwork
}

export function getRpcUrl(chainId: number): string | undefined {
  const chain = getChainInfo(chainId)
  return chain?.rpcUrl
}

export function getBlockExplorer(chainId: number): string | undefined {
  const chain = getChainInfo(chainId)
  return chain?.blockExplorer
}
