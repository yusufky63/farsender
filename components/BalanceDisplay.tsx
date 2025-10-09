'use client'
import { Card } from '@/components/ui/Card'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { formatUnits } from 'viem'

interface BalanceDisplayProps {
  tokenAddress?: string
  className?: string
}

export function BalanceDisplay({ tokenAddress, className }: BalanceDisplayProps) {
  const {
    ethBalance,
    ethFormatted,
    tokenBalance,
    tokenFormatted,
    tokenSymbol,
    tokenName,
    isLoading,
    hasToken
  } = useTokenBalance(tokenAddress)

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center p-2">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
          <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">Loading balance...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-black dark:text-white">Wallet Balance</h4>
        
        {/* ETH Balance */}
        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-transparent rounded-lg">
          <div>
            <div className="text-xs font-medium text-black dark:text-white">ETH</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Ethereum</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-black dark:text-white">
              {parseFloat(ethFormatted).toFixed(6)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {ethBalance ? formatUnits(ethBalance, 18) : '0'} ETH
            </div>
          </div>
        </div>

        {/* Token Balance */}
        {hasToken && tokenSymbol && (
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-transparent rounded-lg">
            <div>
              <div className="text-xs font-medium text-black dark:text-white">{tokenSymbol}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{tokenName || 'Token'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-black dark:text-white">
                {parseFloat(tokenFormatted).toFixed(6)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {tokenBalance ? formatUnits(tokenBalance, 18) : '0'} {tokenSymbol}
              </div>
            </div>
          </div>
        )}

       
      </div>
    </Card>
  )
}
