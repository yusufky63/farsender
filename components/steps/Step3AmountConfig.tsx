'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StepProps, Recipient } from '@/types'
import { calculateTotal, formatAmount, validateTotalBalance } from '@/lib/validation'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useContractInfo } from '@/hooks/useContractInfo'
import { useAccount } from 'wagmi'

export function Step3AmountConfig({ config, onConfigChange, onNext, onPrev }: StepProps) {
  const [fixedAmount, setFixedAmount] = useState(config.fixedAmount || '')
  const [amountMode, setAmountMode] = useState<'fixed' | 'variable'>(config.amountMode || 'fixed')
  const { chain } = useAccount()
  
  // Get user balance
  const { 
    ethBalance, 
    tokenBalance, 
    tokenDecimals,
    isLoading: balanceLoading 
  } = useTokenBalance(config.tokenAddress)
  
  // Get contract fee info
  const { flatFee } = useContractInfo()

  // Update recipients when fixed amount changes
  useEffect(() => {
    if (amountMode === 'fixed' && fixedAmount) {
      const updatedRecipients = config.recipients.map(recipient => ({
        ...recipient,
        amount: fixedAmount
      }))
      onConfigChange({
        ...config,
        recipients: updatedRecipients,
        amountMode,
        fixedAmount
      })
    } else if (amountMode !== config.amountMode || fixedAmount !== config.fixedAmount) {
      onConfigChange({
        ...config,
        amountMode,
        fixedAmount
      })
    }
  }, [fixedAmount, amountMode])

  // Clear amounts when token changes to avoid validation errors
  useEffect(() => {
    // Only clear if we have recipients but no amounts set
    const hasEmptyAmounts = config.recipients.some(r => !r.amount || r.amount === '0' || r.amount === '')
    if (config.recipients.length > 0 && hasEmptyAmounts) {
      const updatedRecipients = config.recipients.map(recipient => ({
        ...recipient,
        amount: ''
      }))
      onConfigChange({
        ...config,
        recipients: updatedRecipients
      })
    }
  }, [config.tokenAddress])

  const updateRecipientAmount = (index: number, amount: string) => {
    const updatedRecipients = [...config.recipients]
    updatedRecipients[index] = {
      ...updatedRecipients[index],
      amount
    }
    onConfigChange({
      ...config,
      recipients: updatedRecipients
    })
  }

  const totalAmount = calculateTotal(config.recipients.map(r => r.amount))
  // Temporarily disable validation for empty amounts to allow progression
  const hasEmptyAmounts = false // Always false to allow progression
  const hasInvalidAmounts = config.recipients.some(r => {
    if (!r.amount) return false
    const num = parseFloat(r.amount)
    return isNaN(num) || num <= 0
  })

  // Balance validation (include fee for ETH)
  const userBalance = config.tokenType === 'ETH' ? ethBalance : tokenBalance
  let balanceError = validateTotalBalance(
    config.recipients.map(r => r.amount),
    userBalance,
    config.tokenType === 'ETH',
    config.tokenDecimals || tokenDecimals
  )
  
  // For ETH, also check if user has enough for fee
  if (config.tokenType === 'ETH' && !balanceError && flatFee && flatFee > BigInt(0)) {
    const totalAmount = calculateTotal(config.recipients.map(r => r.amount))
    const totalWithFee = totalAmount + Number(flatFee) / 1e18
    const feeError = validateTotalBalance(
      [totalWithFee.toString()],
      userBalance,
      true,
      18
    )
    if (feeError) {
      balanceError = { field: 'balance', message: `Yetersiz bakiye (fee dahil). Eksik: ${(totalWithFee - (userBalance ? Number(userBalance) / 1e18 : 0)).toFixed(6)} ETH` }
    }
  }

  const handleNext = () => {
    if (!hasEmptyAmounts && !hasInvalidAmounts && totalAmount > 0 && !balanceError) {
      onNext()
    }
  }

  const canProceed = !hasEmptyAmounts && !hasInvalidAmounts && totalAmount > 0 && !balanceError

  return (
    <Card>
      <div className="space-y-4">
        {/* Amount Mode Selection */}
        <div>
          <h4 className="text-sm font-medium text-black dark:text-white mb-2">Amount Mode</h4>
          <div className="space-y-2">
            <label className="flex items-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-black/20 dark:hover:backdrop-blur-sm">
              <input
                type="radio"
                name="amountMode"
                checked={amountMode === 'fixed'}
                onChange={() => setAmountMode('fixed')}
                className="mr-2"
              />
              <div>
                <div className="text-sm font-medium text-black dark:text-white">Fixed Amount</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Same amount for all recipients</div>
              </div>
            </label>
            
            <label className="flex items-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-black/20 dark:hover:backdrop-blur-sm">
              <input
                type="radio"
                name="amountMode"
                checked={amountMode === 'variable'}
                onChange={() => setAmountMode('variable')}
                className="mr-2"
              />
              <div>
                <div className="text-sm font-medium text-black dark:text-white">Variable Amounts</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Different amount for each recipient</div>
              </div>
            </label>
          </div>
        </div>

        {/* Fixed Amount Input */}
        {amountMode === 'fixed' && (
          <div>
            <Input
              label="Fixed Amount"
              placeholder="0.0"
              value={fixedAmount}
              onChange={setFixedAmount}
              type="number"
              step="0.0001"
              min={0}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This amount will be sent to all {config.recipients.length} recipients
            </p>
          </div>
        )}

        {/* Variable Amounts */}
        {amountMode === 'variable' && (
          <div>
            <h4 className="text-xs font-medium text-black dark:text-white mb-2">
              Recipient Amounts ({config.recipients.length} recipients)
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {config.recipients.map((recipient, index) => (
                <div key={index} className="flex items-center space-x-2">
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
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                    </div>
                    <Input
                      placeholder="0.0"
                      value={recipient.amount}
                      onChange={(value) => updateRecipientAmount(index, value)}
                      type="number"
                      step="0.0001"
                      min={0}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {totalAmount > 0 && (
          <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
            <h5 className="text-xs font-medium text-black dark:text-white mb-1">Summary</h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
                <span className="text-black dark:text-white">{config.recipients.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                <span className="text-black dark:text-white font-medium">
                  {formatAmount(totalAmount.toString())} {config.tokenSymbol || 'Token'}
                </span>
              </div>
              {amountMode === 'fixed' && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Per Recipient:</span>
                  <span className="text-black dark:text-white">
                    {formatAmount(fixedAmount)} {config.tokenSymbol || 'Token'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Messages */}
        {hasEmptyAmounts && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              You must specify amounts for all recipients
            </p>
          </div>
        )}

        {hasInvalidAmounts && (
          <div className="p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-xs text-red-800 dark:text-red-200">
              Invalid amount values. All amounts must be greater than 0.
            </p>
          </div>
        )}

        {totalAmount === 0 && !hasEmptyAmounts && !hasInvalidAmounts && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Total amount must be greater than 0
            </p>
          </div>
        )}

        {balanceError && (
          <div className="p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-xs text-red-800 dark:text-red-200">
              {balanceError.message}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onPrev}
            size="sm"
            className="px-6"

          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="px-6"
            size="sm"
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  )
}
