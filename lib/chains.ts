export interface ChainInfo {
  id: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
  contractAddress: string;
  isTestnet: boolean;
  alchemyNetwork: string;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    rpcUrl: "https://base-mainnet.g.alchemy.com/v2/ugljTHB-omeuc6XeIVJg9",
    blockExplorer: "https://basescan.org",
    contractAddress: "0x25Fb9aa597cEF96a96B39482548105d6c8D452eb",
    isTestnet: false,
    alchemyNetwork: "base",
  },
];

export function getChainInfo(chainId: number): ChainInfo | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
}

export function getContractAddress(chainId: number): string | undefined {
  const chain = getChainInfo(chainId);
  return chain?.contractAddress;
}

export function getExplorerUrl(chainId: number, hash: string): string {
  const chain = getChainInfo(chainId);
  if (!chain) return "";
  return `${chain.blockExplorer}/tx/${hash}`;
}

export function getChainName(chainId: number): string {
  const chain = getChainInfo(chainId);
  return chain?.name || "Unknown";
}

export function getAlchemyNetwork(chainId: number): string | undefined {
  const chain = getChainInfo(chainId);
  return chain?.alchemyNetwork;
}

export function getRpcUrl(chainId: number): string | undefined {
  const chain = getChainInfo(chainId);
  return chain?.rpcUrl;
}

export function getBlockExplorer(chainId: number): string | undefined {
  const chain = getChainInfo(chainId);
  return chain?.blockExplorer;
}
