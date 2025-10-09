// Alchemy API integration example
// This file shows how to integrate with Alchemy API for real token data
import { ChainInfo, getAlchemyNetwork, getChainInfo } from '@/lib/chains'

export interface AlchemyTokenBalance {
  contractAddress: string
  tokenBalance: string
  error?: string
}

export interface AlchemyTokenMetadata {
  decimals: number
  logo?: string
  name: string
  symbol: string
}

export class AlchemyAPI {
  private apiKey: string
  private baseUrl: string
  private chainId: number

  constructor(apiKey: string, chainId: number) {
    this.apiKey = apiKey
    this.chainId = chainId
    this.baseUrl = this.getBaseUrl(chainId)
  }

  private getBaseUrl(chainId: number): string {
    const alchemyNetwork = getAlchemyNetwork(chainId)
    if (!alchemyNetwork) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }
    return `https://${alchemyNetwork}.g.alchemy.com/v2`
  }

  // Get token balances for an address
  async getTokenBalances(address: string): Promise<AlchemyTokenBalance[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address, 'erc20']
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.result.tokenBalances
    } catch (error) {
      console.error('Failed to fetch token balances:', error)
      throw error
    }
  }

  // Get ETH balance
  async getETHBalance(address: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.result
    } catch (error) {
      console.error('Failed to fetch ETH balance:', error)
      throw error
    }
  }

  // Get token metadata
  async getTokenMetadata(contractAddress: string): Promise<AlchemyTokenMetadata> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenMetadata',
          params: [contractAddress]
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.result
    } catch (error) {
      console.error('Failed to fetch token metadata:', error)
      throw error
    }
  }

  // Get all tokens with metadata and balances
  async getAllTokens(address: string): Promise<Array<{
    contractAddress: string
    name: string
    symbol: string
    decimals: number
    balance: string
    balanceFormatted: string
    logo?: string
  }>> {
    try {
      // Get token balances
      const tokenBalances = await this.getTokenBalances(address)
      
      // Get ETH balance
      const ethBalance = await this.getETHBalance(address)
      
      // Process tokens
      const tokens = await Promise.all(
        tokenBalances.map(async (token) => {
          if (token.error || token.tokenBalance === '0x0') {
            return null
          }

          try {
            const metadata = await this.getTokenMetadata(token.contractAddress)
            const balance = BigInt(token.tokenBalance)
            const balanceFormatted = (Number(balance) / Math.pow(10, metadata.decimals)).toFixed(6)

            return {
              contractAddress: token.contractAddress,
              name: metadata.name,
              symbol: metadata.symbol,
              decimals: metadata.decimals,
              balance: token.tokenBalance,
              balanceFormatted,
              logo: metadata.logo
            }
          } catch (error) {
            console.error(`Failed to get metadata for ${token.contractAddress}:`, error)
            return null
          }
        })
      )

      // Add ETH token
      const ethToken = {
        contractAddress: '0x0000000000000000000000000000000000000000',
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        balance: ethBalance,
        balanceFormatted: (Number(BigInt(ethBalance)) / Math.pow(10, 18)).toFixed(6)
      }

      return [ethToken, ...tokens.filter((token): token is NonNullable<typeof token> => token !== null)]
    } catch (error) {
      console.error('Failed to get all tokens:', error)
      throw error
    }
  }
}

// Usage example:
/*
const alchemy = new AlchemyAPI(process.env.ALCHEMY_API_KEY!, 8453) // Base chain ID
const tokens = await alchemy.getAllTokens('0x...')
*/
    