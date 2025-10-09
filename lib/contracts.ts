import { parseEther, parseUnits } from 'viem'
import { getContractAddress as getChainContractAddress } from './chains'

// Import the actual ABI from the JSON file
import ABI_DATA from '../contracts/ABI.json'

export const SAFE_MULTISENDER_ABI = ABI_DATA

// Use centralized chain management
export function getContractAddress(chainId: number): `0x${string}` | undefined {
  const address = getChainContractAddress(chainId)
  return address as `0x${string}` | undefined
}

// Helper function to parse amounts based on token type
export function parseAmounts(
  amounts: string[],
  isETH: boolean,
  decimals: number = 18
): bigint[] {
  return amounts.map(amount => {
    if (isETH) {
      return parseEther(amount)
    } else {
      return parseUnits(amount, decimals)
    }
  })
}

// Helper function to calculate total with fee
export function calculateTotalWithFee(amounts: string[], isETH: boolean, flatFee: bigint): bigint {
  const totalAmount = amounts.reduce((sum, amount) => {
    const parsed = isETH ? parseEther(amount) : parseUnits(amount, 18)
    return sum + parsed
  }, BigInt(0))
  
  return totalAmount + flatFee
}

// Helper function to format fee for display
export function formatFee(fee: bigint): string {
  const feeInEth = Number(fee) / 1e18
  return `${feeInEth.toFixed(6)} ETH`
}

// Contract Statistics Interface
export interface ContractStats {
  uniqueUsers: bigint;
  totalTransfers: bigint;
  totalRecipients: bigint;
  totalEthSent: bigint;
  totalTokenSent: Record<string, bigint>;
}

// Helper function to get contract statistics
export async function getContractStats(contract: any): Promise<ContractStats> {
  try {
    const [uniqueUsers, totalTransfers, totalRecipients, totalEthSent] = await Promise.all([
      contract.read.uniqueUsers(),
      contract.read.totalTransfers(),
      contract.read.totalRecipients(),
      contract.read.totalEthSent()
    ]);
    
    return {
      uniqueUsers: uniqueUsers || BigInt(0),
      totalTransfers: totalTransfers || BigInt(0),
      totalRecipients: totalRecipients || BigInt(0),
      totalEthSent: totalEthSent || BigInt(0),
      totalTokenSent: {} // Token stats will be fetched separately if needed
    };
  } catch (error) {
    console.error('Error fetching contract stats:', error);
    return {
      uniqueUsers: BigInt(0),
      totalTransfers: BigInt(0),
      totalRecipients: BigInt(0),
      totalEthSent: BigInt(0),
      totalTokenSent: {}
    };
  }
}