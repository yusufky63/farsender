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
  const [revertOnFail, setRevertOnFail] = useState(config.revertOnFail)
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

  const handleRevertOnFailChange = (value: boolean) => {
    setRevertOnFail(value)
    onConfigChange({
      ...config,
      revertOnFail: value
    })
  }

  const handleSend = () => {
    onNext()
  }

  // Simplified canSend - just check if we have balance for ERC20, allowance will be handled in Step5
  const canSend = config.tokenType === 'ETH' || 
    (config.tokenType === 'ERC20' && balance && 
     balance >= parseAmounts([totalAmount.toString()], false, config.tokenDecimals || 18)[0])

  const requiredAmount = parseAmounts([totalAmount.toString()], false, config.tokenDecimals || 18)[0]
  const balanceCheck = balance ? balance >= requiredAmount : false
  
  console.log('🎯 Step4Review canSend check:', {
    tokenType: config.tokenType,
    isETH: config.tokenType === 'ETH',
    balance: balance?.toString(),
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
            {config.recipients.slice(0, 5).map((recipient, index) => (
              <div key={index} className="flex justify-between items-center p-2 border border-gray-200 dark:border-gray-800 rounded text-xs">
                <span className="font-mono text-black dark:text-white">
                  {formatAddress(recipient.address)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {formatAmount(recipient.amount)} {config.tokenSymbol || 'ETH'}
                </span>
              </div>
            ))}
            {config.recipients.length > 5 && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
                ... and {config.recipients.length - 5} more recipients
              </div>
            )}
          </div>
        </div>

        {/* ETH Options */}
        {config.tokenType === 'ETH' && (
          <div>
            <h5 className="text-xs font-medium text-black dark:text-white mb-2">ETH Options</h5>
            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={revertOnFail}
                onChange={(e) => handleRevertOnFailChange(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="text-xs text-black dark:text-white">Revert entire transaction on failed transfers</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  If unchecked, failed transfers are skipped and transaction continues
                </div>
              </div>
            </label>
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
        <div className="flex justify-between">
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
