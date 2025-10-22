'use client'
import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StepProps } from '@/types'
import { calculateTotal, formatAmount, formatAddress, validateTotalBalance } from '@/lib/validation'
import { parseAmounts, getContractAddress } from '@/lib/contracts'
import { getChainName } from '@/lib/chains'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useContractInfo } from '@/hooks/useContractInfo'

const ERC20_ABI = [
  {
    "type": "function",
    "name": "allowance",
    "stateMutability": "view",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "type": "function",
    "name": "balanceOf",
    "stateMutability": "view",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  }
] as const

export function Step4Review({ config, onConfigChange, onNext, onPrev }: StepProps) {

  
  const { address, chain } = useAccount()
  const [needsApproval, setNeedsApproval] = useState(false)
  const [isCheckingApproval, setIsCheckingApproval] = useState(false)
  
  // Get user balance
  const { 
    ethBalance, 
    tokenBalance, 
    tokenDecimals,
    tokenSymbol,
    tokenName,
    isLoading: balanceLoading 
  } = useTokenBalance(config.tokenAddress)

  const totalAmount = calculateTotal(config.recipients.map(r => r.amount))
  const contractAddress = chain ? getContractAddress(chain.id) : ''
  const { flatFee } = useContractInfo()

  // Check ERC20 allowance
  const { data: allowance } = useReadContract({
    address: config.tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress as `0x${string}`] : undefined,
    query: {
      enabled: config.tokenType === 'ERC20' && !!address && !!contractAddress
    }
  })

  // Check ERC20 balance
  const { data: balance } = useReadContract({
    address: config.tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: config.tokenType === 'ERC20' && !!address
    }
  })


  const handleSend = () => {
    onNext()
  }

  // Compute required amounts for both flows
  const requiredTokenAmount = parseAmounts([totalAmount.toString()], false, config.tokenDecimals || 18)[0]
  const requiredEthAmount = (() => {
    const amounts = parseAmounts(
      config.recipients.map(r => r.amount || '0'),
      true,
      18,
    )
    const totalWei = amounts.reduce((a, b) => a + b, BigInt(0))
    const fee = flatFee || BigInt(0)
    return totalWei + fee
  })()

  // Can send if: ETH -> user has enough ETH (incl. fee). ERC20 -> user has token balance (allowance handled in Step5)
  const canSend = (
    (config.tokenType === 'ETH' && ethBalance !== undefined && ethBalance >= requiredEthAmount) ||
    (config.tokenType === 'ERC20' && balance && balance >= requiredTokenAmount)
  )

  const requiredAmount = config.tokenType === 'ETH' ? requiredEthAmount : requiredTokenAmount
  const balanceCheck = config.tokenType === 'ETH'
    ? (ethBalance !== undefined ? ethBalance >= requiredEthAmount : false)
    : (balance ? balance >= requiredTokenAmount : false)
  
  console.log('🎯 Step4Review canSend check:', {
    tokenType: config.tokenType,
    isETH: config.tokenType === 'ETH',
    balance: config.tokenType === 'ETH' ? ethBalance?.toString() : balance?.toString(),
    totalAmount: totalAmount.toString(),
    tokenDecimals: config.tokenDecimals,
    requiredAmount: requiredAmount.toString(),
    balanceCheck: balanceCheck,
    canSend: canSend
  })
  console.warn('⚠️ DEBUG: canSend result:', canSend)
  console.error('❌ DEBUG: canSend error log')

  return (
    <Card>
      <div className="space-y-4">
        {/* Token Info */}
        <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
          <h5 className="text-xs font-medium text-black dark:text-white mb-1">Token Info</h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Token:</span>
              <span className="text-black dark:text-white">
                {config.tokenType === 'ETH' ? 'ETH' : `${config.tokenSymbol} (${config.tokenName})`}
              </span>
            </div>
            {config.tokenType === 'ERC20' && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Address:</span>
                <span className="text-black dark:text-white font-mono text-xs">
                  {formatAddress(config.tokenAddress || '')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
          <h5 className="text-xs font-medium text-black dark:text-white mb-1">Transaction Summary</h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
              <span className="text-black dark:text-white">{config.recipients.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="text-black dark:text-white font-medium">
                {formatAmount(totalAmount.toString())} {tokenSymbol || config.tokenSymbol || 'ETH'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Network:</span>
              <span className="text-black dark:text-white">{chain ? getChainName(chain.id) : 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Recipients Preview */}
        <div>
          <h5 className="text-xs font-medium text-black dark:text-white mb-2">
            Recipients ({config.recipients.length})
          </h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {config.recipients.map((recipient, index) => (
              <div key={index} className="p-2 border border-gray-200 dark:border-gray-800 rounded text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    {recipient.displayName ? (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {recipient.displayName}
                        </div>
                        {recipient.displayName.includes('.eth') ? (
                          <span className="px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            Base.eth
                          </span>
                        ) : recipient.displayName.startsWith('@') ? (
                          <span className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                            Farcaster
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 rounded">
                          Direct Address
                        </span>
                      </div>
                    )}
                    <span className="font-mono text-black dark:text-white">
                      {formatAddress(recipient.address)}
                    </span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {formatAmount(recipient.amount)} {config.tokenSymbol || 'ETH'}
                  </span>
                </div>
              </div>
            ))}
           
          </div>
        </div>

        {/* ETH Info */}
        {config.tokenType === 'ETH' && (
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-800 dark:text-blue-200">Atomic Transfer</div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  All transfers must succeed or the entire transaction will be reverted
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ERC20 Balance & Allowance Check */}
        {config.tokenType === 'ERC20' && address && (
          <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
            <h5 className="text-xs font-medium text-black dark:text-white mb-1">Balance & Allowance Check</h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Your Balance:</span>
                <span className="text-black dark:text-white">
                  {balance ? formatAmount((Number(balance) / Math.pow(10, config.tokenDecimals || 18)).toString()) : '...'} {config.tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Allowance:</span>
                <span className="text-black dark:text-white">
                  {allowance ? formatAmount((Number(allowance) / Math.pow(10, config.tokenDecimals || 18)).toString()) : '...'} {config.tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Required:</span>
                <span className="text-black dark:text-white">
                  {formatAmount(totalAmount.toString())} {config.tokenSymbol}
                </span>
              </div>
            </div>
            
            {allowance && balance && (
              <div className="mt-2">
                {allowance < parseAmounts([totalAmount.toString()], false, config.tokenDecimals)[0] && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ Insufficient token allowance. Please approve first.
                  </div>
                )}
                {balance < parseAmounts([totalAmount.toString()], false, config.tokenDecimals)[0] && (
                  <div className="p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded text-xs text-red-800 dark:text-red-200">
                    ❌ Insufficient token balance.
                  </div>
                )}
                {allowance >= parseAmounts([totalAmount.toString()], false, config.tokenDecimals)[0] && 
                 balance >= parseAmounts([totalAmount.toString()], false, config.tokenDecimals)[0] && (
                  <div className="p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded text-xs text-green-800 dark:text-green-200">
                    ✅ Balance and allowance sufficient.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-2">
          <Button
            variant="outline"
            onClick={onPrev}
            size="sm"
          >
            Back
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="px-6"
            size="sm"
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  )
}
