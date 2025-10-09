'use client'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StepProps, TokenInfo } from '@/types'
import { validateTokenAddress } from '@/lib/validation'
import { useTokenList, TokenInfo as TokenListInfo } from '@/hooks/useTokenList'
import { DuneTokenInfo } from '@/lib/dune-api'

export function Step1TokenSelect({ config, onConfigChange, onNext }: StepProps) {
  const { address } = useAccount()
  const [selectedToken, setSelectedToken] = useState<TokenListInfo | null>(null)
  const [customTokenAddress, setCustomTokenAddress] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'tokens' | 'manual'>('tokens')
  const [manualTokenInfo, setManualTokenInfo] = useState<TokenListInfo | null>(null)

  const { 
    tokens, 
    allTokens,
    isLoading, 
    error, 
    totalCount, 
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  } = useTokenList()

  // Filter tokens based on search query
  const filteredTokens = searchQuery 
    ? allTokens.filter(token => 
        (token.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (token.symbol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (token.contractAddress || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tokens

  // Handle token selection
  const handleTokenSelect = (token: TokenListInfo) => {
    setSelectedToken(token)
    setTokenError('')
    
    // Update config
    const isNative = token.contractAddress === '0x0000000000000000000000000000000000000000'
    onConfigChange({
      ...config,
      tokenType: isNative ? 'ETH' : 'ERC20',
      // Set zero address for native tokens as a stable placeholder
      tokenAddress: isNative ? '0x0000000000000000000000000000000000000000' : token.contractAddress,
      tokenSymbol: token.symbol,
      tokenName: token.name,
      tokenDecimals: token.decimals
    })
  }

  // Handle custom token address
  const handleCustomTokenSubmit = async () => {
    if (!customTokenAddress.trim()) return

    setIsLoadingToken(true)
    setTokenError('')

    try {
      // Validate address
      const validationError = validateTokenAddress(customTokenAddress)
      if (validationError) {
        setTokenError(validationError.message)
        return
      }

      // Fetch token info from Dune API
      const duneApiKey = process.env.NEXT_PUBLIC_DUNE_API_KEY
      if (!duneApiKey) {
        throw new Error('Dune API key not configured')
      }

      const { DuneAPI } = await import('@/lib/dune-api')
      const dune = new DuneAPI(duneApiKey)
      
      // Get token info and balance
      const tokenInfo: DuneTokenInfo | null = await dune.getTokenInfo(customTokenAddress, address)
      
      if (!tokenInfo) {
        throw new Error('Token not found or you don\'t have this token')
      }

      const customToken: TokenListInfo = {
        contractAddress: customTokenAddress,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        balance: tokenInfo.balance || '0',
        balanceFormatted: tokenInfo.balanceFormatted || '0.0',
        logo: tokenInfo.logo,
        price: tokenInfo.price,
        value_usd: tokenInfo.value_usd
      }

      setManualTokenInfo(customToken)
    } catch (error) {
      console.error('Failed to load token:', error)
      setTokenError(error instanceof Error ? error.message : 'Failed to load token information')
    } finally {
      setIsLoadingToken(false)
    }
  }

  const canProceed = selectedToken !== null

  return (
    <Card>
      <div className="space-y-3">

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex-1 py-2 px-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'tokens'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Your Tokens
            {!searchQuery && totalCount > 0 && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({totalCount})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Manual Add
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-2">
          {activeTab === 'tokens' && (
            <div className="space-y-2">
              {/* Search */}
              <div>
                <Input
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="w-full"
                />
              </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-[#5638a1] border-t-[#5638a1] rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="space-y-1">
                {filteredTokens.map((token) => (
                  <button
                    key={token.contractAddress}
                    onClick={() => handleTokenSelect(token)}
                    className={`w-full p-2 border rounded-lg text-left transition-colors ${
                      selectedToken?.contractAddress === token.contractAddress
                        ? 'border-[#5638a1] dark:border-[#5638a1] bg-[#5638a1]/10 dark:bg-[#5638a1]/10 text-[#5638a1] dark:text-[#5638a1]'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-black/20 dark:hover:backdrop-blur-sm hover:border-[#5638a1]/30 dark:hover:border-[#5638a1]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-black/30 dark:backdrop-blur-sm">
                          {token.logo ? (
                            <Image 
                              src={token.logo} 
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to initials if image fails to load
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `<span class="text-xs font-medium text-gray-700 dark:text-gray-300">${(token.symbol || '??').length > 2 ? (token.symbol || '??').slice(0, 2).toUpperCase() : (token.symbol || '??').toUpperCase()}</span>`
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {(token.symbol || '??').length > 2 ? (token.symbol || '??').slice(0, 2).toUpperCase() : (token.symbol || '??').toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {(token.symbol || 'Unknown').length > 10 ? `${(token.symbol || 'Unknown').slice(0, 10)}...` : (token.symbol || 'Unknown')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-24">
                            {token.contractAddress === '0x0000000000000000000000000000000000000000' 
                              ? 'Native' 
                              : (token.name || 'Unknown Token').length > 10 
                                ? `${(token.name || 'Unknown Token').slice(0, 10)}...` 
                                : (token.name || 'Unknown Token')
                            }
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {parseFloat(token.balanceFormatted || '0').toFixed(4)}
                        </div>
                      
                        {token.value_usd && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ${token.value_usd.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {filteredTokens.length === 0 && !isLoading && (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 dark:bg-black/30 dark:backdrop-blur-sm rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No tokens found</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {!searchQuery && totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPage}
                      disabled={!hasPrevPage}
                      className="px-2 py-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    
                    <div className="flex items-center space-x-1 shadow-sm p-0.5 rounded-lg">
                      {(() => {
                        const maxVisiblePages = 5
                        
                        // Calculate visible page range
                        let startPage = 1
                        let endPage = totalPages
                        
                        if (totalPages > maxVisiblePages) {
                          const halfVisible = Math.floor(maxVisiblePages / 2)
                          
                          if (currentPage <= halfVisible) {
                            // Near the beginning
                            startPage = 1
                            endPage = maxVisiblePages
                          } else if (currentPage >= totalPages - halfVisible) {
                            // Near the end
                            startPage = totalPages - maxVisiblePages + 1
                            endPage = totalPages
                          } else {
                            // In the middle
                            startPage = currentPage - halfVisible
                            endPage = currentPage + halfVisible
                          }
                        }
                        
                        const pages = []
                        
                        // Add first page and ellipsis if needed
                        if (startPage > 1) {
                          pages.push(
                            <button
                              key={1}
                              onClick={() => goToPage(1)}
                              className="px-2 py-1 text-xs rounded transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-black/20 dark:hover:backdrop-blur-sm hover:text-[#5638a1] dark:hover:text-[#5638a1]"
                            >
                              1
                            </button>
                          )
                          
                          if (startPage > 2) {
                            pages.push(
                              <span key="ellipsis1" className="px-1 text-gray-400">
                                ...
                              </span>
                            )
                          }
                        }
                        
                        // Add visible pages
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => goToPage(i)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                currentPage === i
                                  ? 'bg-[#5638a1] text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-black/20 dark:hover:backdrop-blur-sm hover:text-[#5638a1] dark:hover:text-[#5638a1]'
                              }`}
                            >
                              {i}
                            </button>
                          )
                        }
                        
                        // Add ellipsis and last page if needed
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(
                              <span key="ellipsis2" className="px-1 text-gray-400">
                                ...
                              </span>
                            )
                          }
                          
                          pages.push(
                            <button
                              key={totalPages}
                              onClick={() => goToPage(totalPages)}
                              className="px-2 py-1 text-xs rounded transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-black/20 dark:hover:backdrop-blur-sm hover:text-[#5638a1] dark:hover:text-[#5638a1]"
                            >
                              {totalPages}
                            </button>
                          )
                        }
                        
                        return pages
                      })()}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={!hasNextPage}
                      className="px-2 py-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {currentPage}/{totalPages}
                  </div>
                </div>
              )}
            </>
          )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="0x..."
                  value={customTokenAddress}
                  onChange={setCustomTokenAddress}
                  className="w-full py-2 text-base"
                />
                <Button
                  onClick={handleCustomTokenSubmit}
                  disabled={!customTokenAddress.trim() || isLoadingToken || !address}
                  variant="outline"
                  size="sm"
                  className="w-full py-2"
                >
                  {isLoadingToken ? 'Loading...' : 'Check Token'}
                </Button>
              </div>

              {tokenError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {tokenError.includes('User rejected') || tokenError.includes('User denied') 
                      ? 'Transaction was cancelled by user' 
                      : tokenError}
                  </p>
                </div>
              )}

              {manualTokenInfo && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-black/30">
                      {manualTokenInfo.logo ? (
                        <Image 
                          src={manualTokenInfo.logo} 
                          alt={manualTokenInfo.symbol}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {manualTokenInfo.symbol.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {manualTokenInfo.symbol}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {manualTokenInfo.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {parseFloat(manualTokenInfo.balanceFormatted || '0').toFixed(4)} {manualTokenInfo.symbol}
                      </span>
                    </div>
                    {manualTokenInfo.value_usd && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Value:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          ${manualTokenInfo.value_usd.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Decimals:</span>
                      <span className="text-gray-900 dark:text-white">{manualTokenInfo.decimals}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleTokenSelect(manualTokenInfo)}
                    className="w-full mt-2 py-1"
                    variant="primary"
                    size="sm"
                  >
                    Select This Token
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="px-1 py-1"
            variant="primary"
          >
            {canProceed ? (
              <div className="flex items-center space-x-2">
                <span>Continue</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ) : (
              'Select Token'
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
