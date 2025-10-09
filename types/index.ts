export interface Recipient {
  address: string
  amount: string
  isValid?: boolean
  displayName?: string
}

export interface MultisenderConfig {
  tokenType: 'ETH' | 'ERC20'
  tokenAddress?: string
  tokenSymbol?: string
  tokenName?: string
  tokenDecimals?: number
  recipients: Recipient[]
  amountMode: 'fixed' | 'variable'
  fixedAmount?: string
  flatFee?: bigint
  feeRecipient?: string
}

export interface TransactionStatus {
  hash?: string
  status: 'idle' | 'signing' | 'pending' | 'confirming' | 'success' | 'error'
  error?: string
  message?: string
}

export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  bio?: string
}

export interface StepProps {
  config: MultisenderConfig
  onConfigChange: (config: MultisenderConfig) => void
  onNext: () => void
  onPrev: () => void
}

export interface CSVRow {
  address: string
  amount?: string
}

export interface ValidationError {
  field: string
  message: string
}

export interface TokenInfo {
  contractAddress: string
  symbol: string
  decimals: number
  name: string
  balance: string
  balanceFormatted: string
  logo?: string
  price?: number
  value_usd?: number
}

export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  bio?: string
  verifiedAddresses: {
    ethAddresses: string[]
    primary: { ethAddress: string }
  }
  custodyAddress: string
  followerCount: number
  followingCount: number
}
