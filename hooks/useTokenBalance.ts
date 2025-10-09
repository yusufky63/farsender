import { useAccount, useBalance, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "stateMutability": "view",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "type": "function", 
    "name": "decimals",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}]
  },
  {
    "type": "function",
    "name": "symbol", 
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}]
  },
  {
    "type": "function",
    "name": "name",
    "stateMutability": "view", 
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}]
  }
] as const

export function useTokenBalance(tokenAddress?: string) {
  const { address } = useAccount()
  
  // ETH Balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: address,
  })
  
  // Token Balance
  const { data: tokenBalance, isLoading: tokenBalanceLoading } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!tokenAddress && !!address,
    }
  })
  
  // Token Info
  const { data: tokenDecimals, isLoading: decimalsLoading } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
    }
  })
  
  const { data: tokenSymbol, isLoading: symbolLoading } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!tokenAddress,
    }
  })
  
  const { data: tokenName, isLoading: nameLoading } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'name',
    query: {
      enabled: !!tokenAddress,
    }
  })
  
  const isLoading = ethLoading || tokenBalanceLoading || decimalsLoading || symbolLoading || nameLoading
  
  const formatBalance = (balance: bigint | undefined, decimals: number = 18): string => {
    if (!balance) return '0'
    return formatUnits(balance, decimals)
  }
  
  return {
    // ETH Balance
    ethBalance: ethBalance?.value,
    ethFormatted: ethBalance ? formatBalance(ethBalance.value) : '0',
    
    // Token Balance
    tokenBalance: tokenBalance as bigint | undefined,
    tokenFormatted: tokenBalance && tokenDecimals ? formatBalance(tokenBalance, Number(tokenDecimals)) : '0',
    
    // Token Info
    tokenDecimals: tokenDecimals ? Number(tokenDecimals) : 18,
    tokenSymbol: tokenSymbol as string | undefined,
    tokenName: tokenName as string | undefined,
    
    // Loading states
    isLoading,
    hasToken: !!tokenAddress,
  }
}

// Helper function to check if user has enough balance
export function hasEnoughBalance(
  requiredAmount: string,
  userBalance: bigint | undefined,
  decimals: number = 18
): boolean {
  if (!userBalance) return false
  
  try {
    const required = parseUnits(requiredAmount, decimals)
    return userBalance >= required
  } catch {
    return false
  }
}

// Helper function to get balance shortfall
export function getBalanceShortfall(
  requiredAmount: string,
  userBalance: bigint | undefined,
  decimals: number = 18
): string {
  if (!userBalance) return requiredAmount
  
  try {
    const required = parseUnits(requiredAmount, decimals)
    if (userBalance >= required) return '0'
    
    const shortfall = required - userBalance
    return formatUnits(shortfall, decimals)
  } catch {
    return requiredAmount
  }
}
