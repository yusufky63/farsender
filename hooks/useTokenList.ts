'use client'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { filterTokensWithSpamDetection } from '@/lib/spam-detection'

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
  const [hideSpamAndLowValueTokens, setHideSpamAndLowValueTokens] = useState(true)
  const pageSize = 8

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
        const response = await fetch('/api/dune', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'getAllTokens',
            address,
            chainId: chain.id,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || 'Failed to fetch tokens')
        }

        const { tokens } = await response.json()
        
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
        
        // Apply filtering based on toggle state
        let filteredTokens
        if (hideSpamAndLowValueTokens) {
          // Apply spam filtering when toggle is ON
          const spamFilteredTokens = filterTokensWithSpamDetection(data.tokens, true)
          filteredTokens = spamFilteredTokens.filter(token => 
            token.balance !== '0' // Only show tokens with balance
          )
        } else {
          // Show all tokens from API when toggle is OFF (only filter by balance)
          filteredTokens = data.tokens.filter(token => 
            token.balance !== '0' // Only show tokens with balance
          )
        }
        
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
  }, [address, chain, hideSpamAndLowValueTokens])

  // Get current page tokens
  const getCurrentPageTokens = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return allTokens.slice(startIndex, endIndex)
  }

  // Get filtered tokens for pagination calculations
  const getFilteredTokens = () => {
    return allTokens
  }

  const goToPage = (page: number) => {
    const filteredTokens = getFilteredTokens()
    const maxPages = Math.ceil(filteredTokens.length / pageSize)
    if (page >= 1 && page <= maxPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => {
    const filteredTokens = getFilteredTokens()
    const maxPages = Math.ceil(filteredTokens.length / pageSize)
    if (currentPage < maxPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Calculate counts for display
  const hiddenTokensCount = allTokens.length - allTokens.length
  const visibleCount = allTokens.length

  const filteredTokens = getFilteredTokens()
  const filteredTotalPages = Math.ceil(filteredTokens.length / pageSize)

  return {
    tokens: getCurrentPageTokens(),
    allTokens,
    isLoading,
    error,
    totalCount,
    currentPage,
    totalPages: filteredTotalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < filteredTotalPages,
    hasPrevPage: currentPage > 1,
    hideSpamAndLowValueTokens,
    setHideSpamAndLowValueTokens,
    hiddenTokensCount,
    visibleCount,
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
