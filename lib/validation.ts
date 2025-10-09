import { isAddress, parseUnits, formatUnits, getAddress } from 'viem'
import { ValidationError } from '@/types'

export function validateAddress(address: string): ValidationError | null {
  if (!address) {
    return { field: 'address', message: 'Address cannot be empty' }
  }
  
  if (!isAddress(address)) {
    return { field: 'address', message: 'Invalid Ethereum address' }
  }
  
  return null
}

export function getChecksumAddress(address: string): string | null {
  try {
    if (!isAddress(address)) {
      return null
    }
    return getAddress(address) // This returns the checksum version
  } catch {
    return null
  }
}

export function validateAmount(amount: string, required: boolean = false): ValidationError | null {
  if (!amount) {
    if (required) {
      return { field: 'amount', message: 'Amount cannot be empty' }
    }
    return null // Amount is optional
  }
  
  const num = parseFloat(amount)
  if (isNaN(num)) {
    return { field: 'amount', message: 'Invalid amount' }
  }
  
  if (num <= 0) {
    return { field: 'amount', message: 'Amount must be greater than 0' }
  }
  
  return null
}

export function validateRecipients(recipients: { address: string; amount: string }[]): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (recipients.length === 0) {
    errors.push({ field: 'recipients', message: 'You must add at least one recipient' })
    return errors
  }
  
  // Check max recipients
  const maxRecipients = 300 // ETH limit, ERC20 is 200
  if (recipients.length > maxRecipients) {
    errors.push({ 
      field: 'recipients', 
      message: `Maximum ${maxRecipients} recipients allowed` 
    })
  }
  
  // Validate each recipient
  recipients.forEach((recipient, index) => {
    const addressError = validateAddress(recipient.address)
    if (addressError) {
      errors.push({ 
        field: `recipient_${index}_address`, 
        message: `Recipient ${index + 1}: ${addressError.message}` 
      })
    }
    
    // Amount validation is optional in Step 2 (can be set in Step 3)
    const amountError = validateAmount(recipient.amount, false)
    if (amountError) {
      errors.push({ 
        field: `recipient_${index}_amount`, 
        message: `Recipient ${index + 1}: ${amountError.message}` 
      })
    }
  })
  
  // Check for duplicates using checksum addresses
  const checksumAddresses = recipients.map(r => {
    const checksum = getChecksumAddress(r.address)
    return checksum ? checksum.toLowerCase() : r.address.toLowerCase()
  })
  const duplicates = checksumAddresses.filter((addr, index) => checksumAddresses.indexOf(addr) !== index)
  
  if (duplicates.length > 0) {
    errors.push({ 
      field: 'duplicates', 
      message: 'Same address used multiple times' 
    })
  }
  
  return errors
}

export function removeDuplicateRecipients(recipients: { address: string; amount: string; displayName?: string }[]): { address: string; amount: string; displayName?: string }[] {
  const seen = new Set<string>()
  const uniqueRecipients: { address: string; amount: string; displayName?: string }[] = []
  
  for (const recipient of recipients) {
    const checksumAddress = getChecksumAddress(recipient.address)
    const addressKey = checksumAddress ? checksumAddress.toLowerCase() : recipient.address.toLowerCase()
    
    if (!seen.has(addressKey)) {
      seen.add(addressKey)
      // Use checksum address if available, otherwise keep original
      uniqueRecipients.push({
        address: checksumAddress || recipient.address,
        amount: recipient.amount,
        displayName: recipient.displayName
      })
    }
  }
  
  return uniqueRecipients
}

export function validateTokenAddress(address: string): ValidationError | null {
  if (!address) {
    return { field: 'tokenAddress', message: 'Token address cannot be empty' }
  }
  
  if (!isAddress(address)) {
    return { field: 'tokenAddress', message: 'Invalid token address' }
  }
  
  return null
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatAmount(amount: string, decimals: number = 4, tokenSymbol?: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return '0'
  
  // Adjust decimal places based on token type
  let displayDecimals = decimals
  if (tokenSymbol === 'USDC' || tokenSymbol === 'USDT') {
    displayDecimals = 2 // Show 2 decimals for stablecoins
  } else if (tokenSymbol === 'ETH') {
    displayDecimals = 4 // Show 4 decimals for ETH
  } else {
    displayDecimals = Math.min(decimals, 6) // Max 6 decimals for other tokens
  }
  
  return num.toFixed(displayDecimals)
}

export function calculateTotal(amounts: string[]): number {
  return amounts.reduce((total, amount) => {
    const num = parseFloat(amount) || 0
    return total + num
  }, 0)
}

// Balance validation functions
export function validateBalance(
  requiredAmount: string,
  userBalance: bigint | undefined,
  decimals: number = 18
): ValidationError | null {
  if (!userBalance) {
    return { field: 'balance', message: 'Could not fetch balance information' }
  }
  
  try {
    const required = parseUnits(requiredAmount, decimals)
    
    if (userBalance < required) {
      const shortfall = required - userBalance
      const shortfallFormatted = formatUnits(shortfall, decimals)
      return { 
        field: 'balance', 
        message: `Insufficient balance. Shortfall: ${parseFloat(shortfallFormatted).toFixed(6)}` 
      }
    }
    
    return null
  } catch (error) {
    return { field: 'balance', message: 'Invalid amount format' }
  }
}

export function validateTotalBalance(
  amounts: string[],
  userBalance: bigint | undefined,
  isETH: boolean,
  decimals: number = 18
): ValidationError | null {
  const totalAmount = amounts.reduce((sum, amount) => {
    const num = parseFloat(amount) || 0
    return sum + num
  }, 0)
  
  if (totalAmount <= 0) {
    return null // No validation needed for zero amounts
  }
  
  return validateBalance(totalAmount.toString(), userBalance, decimals)
}

// Farcaster username detection and formatting
export function isFarcasterUsername(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  const trimmed = input.trim()
  
  // If it starts with 0x, it's definitely an address
  if (trimmed.startsWith('0x')) return false
  
  // If it's a valid Ethereum address (42 chars, hex), it's an address
  if (trimmed.length === 42 && /^[0-9a-fA-F]+$/.test(trimmed)) return false
  
  // If it contains only alphanumeric characters, underscores, and hyphens, it's likely a username
  // Farcaster usernames can contain letters, numbers, underscores, and hyphens
  const usernamePattern = /^[a-zA-Z0-9_-]+$/
  
  return usernamePattern.test(trimmed)
}

export function formatFarcasterUsername(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  // Remove @ prefix if present
  const cleaned = input.trim().replace(/^@/, '')
  
  // Convert to lowercase for consistency
  return cleaned.toLowerCase()
}

// Check if input is a Base.eth domain
export function isBaseEthDomain(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  const trimmed = input.trim()
  
  // Check if it ends with .eth
  return trimmed.endsWith('.eth') && trimmed.length > 4
}

// Format Base.eth domain
export function formatBaseEthDomain(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  const cleaned = input.trim().toLowerCase()
  
  // Ensure it ends with .eth
  return cleaned.endsWith('.eth') ? cleaned : `${cleaned}.eth`
}
