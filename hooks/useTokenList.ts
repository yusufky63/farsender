'use client'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

export interface TokenInfo {
  contractAddress: string
  name: string
  symbol: string
  decimals: number
  balance: string
  balanceFormatted: string
  logo?: string
  price?: number
  value_usd?: number
}

export interface TokenListResponse {
  tokens: TokenInfo[]
  totalCount: number
  hasMore: boolean
}

export function useTokenList() {
  const { address, chain } = useAccount()
  const [allTokens, setAllTokens] = useState<TokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const pageSize = 5

  // Fetch tokens with pagination
  useEffect(() => {
    if (!address || !chain) {
      setAllTokens([])
      return
    }

    const fetchTokens = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Use Dune API directly from frontend
        const duneApiKey = process.env.NEXT_PUBLIC_DUNE_API_KEY
        if (!duneApiKey) {
          throw new Error('Dune API key not configured')
        }

        const { DuneAPI } = await import('@/lib/dune-api')
        const dune = new DuneAPI(duneApiKey)
        const tokens = await dune.getAllTokens(address, chain.id)
        
        // Process tokens to handle native token contract addresses
        const processedTokens = tokens.map(token => ({
          ...token,
          // Convert "native" contract address to zero address for ETH
          contractAddress: token.contractAddress === 'native' ? '0x0000000000000000000000000000000000000000' : token.contractAddress
        }))
        
        const data: TokenListResponse = {
          tokens: processedTokens,
          totalCount: processedTokens.length,
          hasMore: false
        }
        
        // Filter out scam/spam tokens
        const filteredTokens = data.tokens.filter(token => {
          // Safe check for undefined/null values
          const name = (token.name || '').toLowerCase()
          const symbol = (token.symbol || '').toLowerCase()
          
          // Filter out common scam indicators
          const scamKeywords = [
            'test', 'fake', 'scam', 'honeypot', 'rug', 'moon', 'safe', 'baby', 'mini',
            'airdrop', 'claim', 'free', 'giveaway', 'promo', 'presale', 'ico', 'ido',
            'telegram', 'tg', 'twitter', 'tweet', 'discord', 'discord.gg', 't.me',
            'elon', 'musk', 'doge', 'shib', 'pepe', 'floki', 'safemoon', 'pump',
            '100x', '1000x', 'moon', 'mars', 'lambo', 'yacht', 'diamond', 'hands'
          ]
          
          // Check for emoji patterns (simple approach - check for common emoji characters)
          const emojiChars = ['🚀', '💎', '🔥', '⭐', '💰', '🎯', '📈', '💪', '🎉', '🦍', '🐕', '🐸', '🌙', '🌍', '🌎', '🌏', '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💥', '💢', '💯', '💯', '🎊', '🎉', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🍭', '🍬', '🍫', '🍪', '🍩', '🍨', '🍧', '🍦', '🍰', '🎂', '🍭', '🍬', '🍫', '🍪', '🍩', '🍨', '🍧', '🍦']
          const hasEmojis = emojiChars.some(emoji => (name + symbol).includes(emoji))
          
          // Check for social media links
          const hasSocialLinks = /(t\.me|telegram|twitter|discord|youtube|instagram|facebook)/i.test(name + symbol)
          
          // Check for suspicious patterns
          const hasSuspiciousPatterns = /(100x|1000x|moon|mars|lambo|yacht|diamond|hands|hodl|to the moon)/i.test(name + symbol)
          
          return !scamKeywords.some(keyword => 
            name.includes(keyword) || symbol.includes(keyword)
          ) && 
          !hasEmojis && 
          !hasSocialLinks && 
          !hasSuspiciousPatterns &&
          token.balance !== '0' // Only show tokens with balance
        })
        
        setAllTokens(filteredTokens)
        setTotalCount(filteredTokens.length)
        setTotalPages(Math.ceil(filteredTokens.length / pageSize))
        setCurrentPage(1)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens')
        setAllTokens([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokens()
  }, [address, chain])

  // Get current page tokens
  const getCurrentPageTokens = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return allTokens.slice(startIndex, endIndex)
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return {
    tokens: getCurrentPageTokens(),
    allTokens,
    isLoading,
    error,
    totalCount,
    currentPage,
    totalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    refetch: () => {
      setAllTokens([])
      setCurrentPage(1)
    }
  }
}

// Hook for fetching ETH balance specifically
export function useETHBalance() {
  const { address, chain } = useAccount()
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address || !chain) return

    const fetchETHBalance = async () => {
      setIsLoading(true)
      try {
        // Make API call to fetch ETH balance
        const response = await fetch(`/api/eth-balance?address=${address}&chainId=${chain.id}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setBalance(data.balance)
      } catch (error) {
        console.error('Failed to fetch ETH balance:', error)
        setBalance('0')
      } finally {
        setIsLoading(false)
      }
    }

    fetchETHBalance()
  }, [address, chain])

  return {
    balance,
    isLoading
  }
}
