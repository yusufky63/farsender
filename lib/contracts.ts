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