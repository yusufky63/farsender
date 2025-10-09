// Dune API integration for token balances, prices, and metadata
import { getChainInfo } from '@/lib/chains'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface DuneTokenBalance {
  address: string
  amount: string
  chain: string
  chain_id: number
  decimals: number
  name: string
  symbol: string
  price_usd: number
  value_usd: number
  token_metadata?: {
    logo: string
    url: string
  }
}

export interface DuneTokenInfo {
  address: string
  contractAddress: string
  name: string
  symbol: string
  decimals: number
  amount: string
  balance: string
  balanceFormatted: string
  logo?: string
  price?: number
  value_usd?: number
}

export interface DuneBalancesResponse {
  wallet_address: string
  balances: DuneTokenBalance[]
  next_offset?: string
  request_time: string
  response_time: string
}

export class DuneAPI {
  private apiKey: string
  private baseUrl = 'https://api.sim.dune.com'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private validateChainId(chainId: number): void {
    const chainInfo = getChainInfo(chainId)
    if (!chainInfo) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }
  }

  // Cache for 5 minutes
  private cache = new Map<string, { data: any, timestamp: number }>()
  private CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  private getCacheKey(address: string, chainId: number): string {
    return `${address}-${chainId}`
  }

  private getCachedData(address: string, chainId: number): any | null {
    const key = this.getCacheKey(address, chainId)
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached data for', key)
      return cached.data
    }
    
    return null
  }

  private setCachedData(address: string, chainId: number, data: any): void {
    const key = this.getCacheKey(address, chainId)
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    console.log('💾 Cached data for', key)
  }

  private formatTokenBalance(amount: string, decimals: number): string {
    const balance = BigInt(amount)
    const divisor = BigInt(10 ** decimals)
    const quotient = balance / divisor
    const remainder = balance % divisor
    
    if (remainder === BigInt(0)) {
      return quotient.toString()
    }
    
    const decimalPart = remainder.toString().padStart(decimals, '0')
    const trimmedDecimal = decimalPart.replace(/0+$/, '')
    
    if (trimmedDecimal === '') {
      return quotient.toString()
    }
    
    return `${quotient}.${trimmedDecimal}`
  }

  // Get token balances with prices and metadata
  async getTokenBalances(address: string, chainId: number, limit = 1000): Promise<DuneTokenBalance[]> {
    try {
      // Validate chain ID
      this.validateChainId(chainId)
      
      // Check cache first
      const cachedData = this.getCachedData(address, chainId)
      if (cachedData) {
        return cachedData
      }

      const url = `${this.baseUrl}/v1/evm/balances/${address}?chain_ids=${chainId}&metadata=logo,url&limit=${limit}`
      
      console.log('🌐 Dune API Request:', { url, chainId })
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Sim-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      })

      console.log('📡 Dune API Response Status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Dune API Error Response:', errorText)
        throw new Error(`Dune API error! status: ${response.status}, message: ${errorText}`)
      }

      const data: DuneBalancesResponse = await response.json()

      // Filter out tokens with zero balance and add formatted balance
      const processedTokens = data.balances
        .filter(token => {
          const amount = parseFloat(token.amount)
          return token.amount !== '0' && !isNaN(amount) && amount > 0
        })
        .map(token => {
          // Check if this is a native token (ETH, etc.)
          const isNativeToken = token.address === '0x0000000000000000000000000000000000000000' || 
                               token.address === '0x0' ||
                               token.address === 'native' ||
                               token.symbol === 'ETH' ||
                               token.name === 'Ethereum'
          
          return {
            ...token,
            contractAddress: isNativeToken ? '0x0000000000000000000000000000000000000000' : token.address,
            balanceFormatted: this.formatTokenBalance(token.amount, token.decimals)
          }
        })

      // Cache the processed data
      this.setCachedData(address, chainId, processedTokens)
      
      return processedTokens
    } catch (error) {
      console.error('❌ Failed to fetch token balances from Dune:', error)
      throw error
    }
  }

  // Get all tokens with metadata and balances (similar to AlchemyAPI interface)
  async getAllTokens(address: string, chainId: number): Promise<Array<{
    contractAddress: string
    name: string
    symbol: string
    decimals: number
    balance: string
    balanceFormatted: string
    logo?: string
    price?: number
    value_usd?: number
  }>> {
    try {
      const tokens = await this.getTokenBalances(address, chainId)
      
      return tokens.map(token => {
        const isNative =
          token.address === 'native' ||
          token.address === '0x0' ||
          token.address === ZERO_ADDRESS ||
          token.symbol === 'ETH'

        return {
          contractAddress: isNative ? ZERO_ADDRESS : token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          balance: token.amount,
          balanceFormatted: this.formatTokenBalance(token.amount, token.decimals),
          logo: token.token_metadata?.logo,
          price: token.price_usd,
          value_usd: token.value_usd,
        }
      })
    } catch (error) {
      console.error('Failed to get all tokens from Dune:', error)
      throw error
    }
  }

  // Get specific token info and balance for a user
  async getTokenInfo(tokenAddress: string, userAddress?: string): Promise<DuneTokenInfo | null> {
    try {
      if (!userAddress) {
        throw new Error('User address is required')
      }

      const url = `${this.baseUrl}/v1/evm/balances/${userAddress}?chain_ids=1&metadata=logo,url&limit=1000`

      console.log('🌐 Dune API Request for token info:', { url, tokenAddress })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Sim-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Dune API Error Response:', errorText)
        throw new Error(`Dune API error! status: ${response.status}, message: ${errorText}`)
      }

      const data: DuneBalancesResponse = await response.json()
      
      // Find the specific token
      const token = data.balances.find(t => {
        // Handle native token case
        if (tokenAddress === '0x0000000000000000000000000000000000000000' && t.address === 'native') {
          return true
        }
        return t.address.toLowerCase() === tokenAddress.toLowerCase()
      })

      if (!token) {
        return null
      }

      return {
        address: token.address === 'native' ? '0x0000000000000000000000000000000000000000' : token.address,
        contractAddress: token.address === 'native' ? '0x0000000000000000000000000000000000000000' : token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        amount: token.amount,
        balance: token.amount,
        balanceFormatted: this.formatTokenBalance(token.amount, token.decimals),
        logo: token.token_metadata?.logo,
        price: token.price_usd,
        value_usd: token.value_usd
      }
    } catch (error) {
      console.error('Failed to get token info from Dune:', error)
      throw error
    }
  }
}

// Usage example:
/*
const dune = new DuneAPI(process.env.DUNE_API_KEY!)
const tokens = await dune.getAllTokens('0x...', 1) // Ethereum
*/
