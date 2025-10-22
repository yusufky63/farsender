/**
 * Batch transaction utilities for handling large recipient lists
 */

export interface Recipient {
  address: string
  amount: string
  name?: string
}

export interface BatchConfig {
  maxRecipientsPerBatch: number
  tokenType: 'ETH' | 'ERC20'
}

export interface BatchInfo {
  batchNumber: number
  totalBatches: number
  recipients: Recipient[]
  totalAmount: string
  isLastBatch: boolean
}

export interface BatchProgress {
  currentBatch: number
  totalBatches: number
  completedBatches: number
  failedBatches: number
  isComplete: boolean
  progress: number // 0-100
}

// Batch size limits based on gas and contract constraints
export const BATCH_LIMITS = {
  ETH: 300,   // ETH transfers
  ERC20: 200  // ERC20 transfers
} as const

/**
 * Split recipients into batches based on token type
 */
export function createBatches(
  recipients: Recipient[], 
  tokenType: 'ETH' | 'ERC20'
): BatchInfo[] {
  const maxPerBatch = BATCH_LIMITS[tokenType]
  const batches: BatchInfo[] = []
  
  for (let i = 0; i < recipients.length; i += maxPerBatch) {
    const batchRecipients = recipients.slice(i, i + maxPerBatch)
    const batchNumber = Math.floor(i / maxPerBatch) + 1
    const totalBatches = Math.ceil(recipients.length / maxPerBatch)
    
    // Calculate total amount for this batch
    const totalAmount = batchRecipients
      .reduce((sum, recipient) => {
        return sum + parseFloat(recipient.amount)
      }, 0)
      .toString()

    batches.push({
      batchNumber,
      totalBatches,
      recipients: batchRecipients,
      totalAmount,
      isLastBatch: batchNumber === totalBatches
    })
  }
  
  return batches
}

/**
 * Calculate batch statistics
 */
export function getBatchStats(recipients: Recipient[], tokenType: 'ETH' | 'ERC20') {
  const maxPerBatch = BATCH_LIMITS[tokenType]
  const totalBatches = Math.ceil(recipients.length / maxPerBatch)
  
  const totalAmount = recipients
    .reduce((sum, recipient) => sum + parseFloat(recipient.amount), 0)
  
  return {
    totalRecipients: recipients.length,
    totalBatches,
    maxPerBatch,
    totalAmount: totalAmount.toString(),
    averagePerBatch: Math.ceil(recipients.length / totalBatches),
    tokenType
  }
}

/**
 * Validate batch configuration
 */
export function validateBatchConfig(
  recipients: Recipient[], 
  tokenType: 'ETH' | 'ERC20'
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (recipients.length === 0) {
    errors.push('No recipients provided')
  }
  
  if (recipients.length > 10000) {
    errors.push('Too many recipients (max 10,000)')
  }
  
  // Validate addresses
  const invalidAddresses = recipients.filter(r => 
    !r.address || !r.address.match(/^0x[a-fA-F0-9]{40}$/)
  )
  
  if (invalidAddresses.length > 0) {
    errors.push(`${invalidAddresses.length} invalid addresses found`)
  }
  
  // Validate amounts
  const invalidAmounts = recipients.filter(r => 
    !r.amount || isNaN(parseFloat(r.amount)) || parseFloat(r.amount) <= 0
  )
  
  if (invalidAmounts.length > 0) {
    errors.push(`${invalidAmounts.length} invalid amounts found`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create batch progress tracker
 */
export function createBatchProgress(totalBatches: number): BatchProgress {
  return {
    currentBatch: 0,
    totalBatches,
    completedBatches: 0,
    failedBatches: 0,
    isComplete: false,
    progress: 0
  }
}

/**
 * Update batch progress
 */
export function updateBatchProgress(
  progress: BatchProgress,
  batchNumber: number,
  success: boolean
): BatchProgress {
  const newProgress = { ...progress }
  
  if (success) {
    newProgress.completedBatches++
  } else {
    newProgress.failedBatches++
  }
  
  newProgress.currentBatch = batchNumber
  newProgress.progress = Math.round(
    ((newProgress.completedBatches + newProgress.failedBatches) / newProgress.totalBatches) * 100
  )
  newProgress.isComplete = 
    (newProgress.completedBatches + newProgress.failedBatches) === newProgress.totalBatches
  
  return newProgress
}

/**
 * Format batch summary for display
 */
export function formatBatchSummary(batchInfo: BatchInfo): string {
  const { batchNumber, totalBatches, recipients, totalAmount } = batchInfo
  
  return `Batch ${batchNumber}/${totalBatches}: ${recipients.length} recipients, ${totalAmount} total`
}

/**
 * Estimate gas costs for batches
 */
export function estimateBatchGasCosts(
  batches: BatchInfo[],
  tokenType: 'ETH' | 'ERC20',
  gasPrice: string = '20' // gwei
): {
  totalGasEstimate: string
  costPerBatch: string
  totalCostETH: string
} {
  // Rough gas estimates
  const gasPerRecipient = tokenType === 'ETH' ? 21000 : 65000 // ERC20 transfers cost more
  const baseGasPerBatch = 50000 // Base transaction cost
  
  const totalGas = batches.reduce((total, batch) => {
    return total + baseGasPerBatch + (batch.recipients.length * gasPerRecipient)
  }, 0)
  
  const gasPriceWei = parseFloat(gasPrice) * 1e9 // Convert gwei to wei
  const totalCostWei = totalGas * gasPriceWei
  const totalCostETH = (totalCostWei / 1e18).toFixed(6)
  
  return {
    totalGasEstimate: totalGas.toString(),
    costPerBatch: ((totalGas / batches.length) / 1e18 * gasPriceWei).toFixed(6),
    totalCostETH
  }
}
