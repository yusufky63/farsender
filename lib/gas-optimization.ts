/**
 * Simple gas calculation for Base network
 */

// Base network gas constants
export const BASE_GAS_CONSTANTS = {
  // Per-recipient costs (simplified)
  ETH_PER_RECIPIENT: 25000,        // ETH transfer per recipient
  ERC20_PER_RECIPIENT: 40000,      // ERC20 transfer per recipient
  
  // Base overhead
  CONTRACT_CALL_OVERHEAD: 50000,   // Contract call overhead
  
  // Safety margin
  SAFETY_MARGIN: 1.2,              // 20% safety margin
  MAX_GAS_LIMIT: 15000000,         // Base block gas limit
} as const

/**
 * Calculate gas limit for Base network (simplified)
 */
export function calculateBaseGasLimit(
  recipientCount: number,
  tokenType: 'ETH' | 'ERC20'
): bigint {
  const constants = BASE_GAS_CONSTANTS
  
  // Simple calculation based on recipient count
  const gasPerRecipient = tokenType === 'ETH' 
    ? constants.ETH_PER_RECIPIENT 
    : constants.ERC20_PER_RECIPIENT
  
  const gasEstimate = constants.CONTRACT_CALL_OVERHEAD + (gasPerRecipient * recipientCount)
  
  // Apply safety margin
  const finalGas = Math.ceil(gasEstimate * constants.SAFETY_MARGIN)
  
  // Cap at maximum
  return BigInt(Math.min(finalGas, constants.MAX_GAS_LIMIT))
}

