'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StepProps, TransactionStatus } from '@/types'
import { parseAmounts, getContractAddress, SAFE_MULTISENDER_ABI, calculateTotalWithFee, formatFee } from '@/lib/contracts'
import { getExplorerUrl, getChainName } from '@/lib/chains'
import { useContractInfo } from '@/hooks/useContractInfo'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { calculateTotal, formatAmount } from '@/lib/validation'
import { SuccessModal } from '@/components/SuccessModal'

export function Step5Transaction({ config, onConfigChange, onNext, onPrev }: StepProps) {

  
  const { address, chain } = useAccount()
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    status: 'idle'
  })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [isApprovalComplete, setIsApprovalComplete] = useState(false)
  const [isApprovalTransaction, setIsApprovalTransaction] = useState(false)
  
  // Get contract info including fee
  const { flatFee } = useContractInfo(chain?.id || 8453)
  
  // Get token info
  const { tokenSymbol, tokenName } = useTokenBalance(config.tokenAddress)

  const { writeContract, data: hash, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  // Get contract address first
  const contractAddress = chain ? getContractAddress(chain.id) : ''

  // Check allowance for ERC20 tokens
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: config.tokenAddress as `0x${string}`,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'allowance',
    args: config.tokenType === 'ERC20' && address && contractAddress 
      ? [address, contractAddress] 
      : undefined,
    query: {
      enabled: config.tokenType === 'ERC20' && !!address && !!contractAddress
    }
  })

  const requiredAmount = config.tokenType === 'ERC20' 
    ? parseAmounts(config.recipients.map(r => r.amount), false, config.tokenDecimals || 18).reduce((a, b) => a + b, BigInt(0))
    : BigInt(0)



  const isApproved = config.tokenType === 'ETH' || 
    (allowance && requiredAmount && allowance >= requiredAmount)

  const totalAmount = calculateTotal(config.recipients.map(r => r.amount))

  useEffect(() => {
    if (hash) {
      setTransactionStatus({
        status: 'pending',
        hash
      })
    }
  }, [hash])

  useEffect(() => {
    if (isConfirming) {
      setTransactionStatus(prev => ({
        ...prev,
        status: 'confirming'
      }))
    }
  }, [isConfirming])

  useEffect(() => {
    if (isSuccess) {
      if (isApprovalTransaction) {
        // This is an approval transaction
        setApprovalStatus('success')
        setIsApprovalComplete(true)
        setIsApprovalTransaction(false)
        
        if (config.tokenType === 'ERC20') {
          refetchAllowance()
        }
      } else {
        // This is a transfer transaction
        setTransactionStatus(prev => ({
          ...prev,
          status: 'success'
        }))
        setShowSuccessModal(true)
      }
    }
  }, [isSuccess, isApprovalTransaction, config.tokenType, refetchAllowance])

  useEffect(() => {
    if (isError || error) {
      const errorMessage = error?.message || 'Transaction failed'
      
      if (isApprovalTransaction) {
        // This is an approval transaction error
        setApprovalStatus('error')
        setIsApprovalTransaction(false)
      } else {
        // This is a transfer transaction error
        setTransactionStatus(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage.includes('User rejected') || errorMessage.includes('User denied') 
            ? 'Transaction was cancelled by user' 
            : errorMessage
        }))
      }
    }
  }, [isError, error, isApprovalTransaction])

  const handleApprove = useCallback(async () => {
    if (!address || !config.tokenAddress || !contractAddress) return

    try {
      setTransactionStatus({ status: 'pending' })

      await writeContract({
        address: config.tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'approve',
        args: [contractAddress, requiredAmount],
      })
    } catch (error) {
      console.error('Approve failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Approve failed'
      setTransactionStatus({
        status: 'error',
        error: errorMessage.includes('User rejected') || errorMessage.includes('User denied') 
          ? 'Transaction was cancelled by user' 
          : errorMessage
      })
    }
  }, [address, config.tokenAddress, contractAddress, writeContract, requiredAmount])

  // Handle approval separately
  const handleApproval = useCallback(async () => {
    if (!address || !contractAddress) {
      console.error('❌ Missing address or contractAddress')
      setApprovalStatus('error')
      return
    }

    try {
      setApprovalStatus('pending')
      setIsApprovalTransaction(true) // Mark this as approval transaction
      
      // Approve the token
      await writeContract({
        address: config.tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'approve',
        args: [contractAddress, requiredAmount],
      })
      
    } catch (error) {
      console.error('❌ Approve transaction failed:', error)
      setApprovalStatus('error')
      setIsApprovalTransaction(false)
      throw error
    }
  }, [address, contractAddress, config.tokenAddress, writeContract, requiredAmount])

  const handleSendTransaction = useCallback(async () => {
    if (!address || !contractAddress) {
      console.error('❌ Missing address or contractAddress:', { address: !!address, contractAddress: !!contractAddress })
      setTransactionStatus({
        status: 'error',
        error: 'Wallet not connected or contract not deployed'
      })
      return
    }

    // For ERC20 tokens, check if approval is needed first
    if (config.tokenType === 'ERC20' && !isApproved && !isApprovalComplete) {
      console.log('🔐 Approval needed, please approve first')
      setTransactionStatus({
        status: 'error',
        error: 'Please approve the token first'
      })
      return
    }

    try {
      setIsApprovalTransaction(false) // Mark this as transfer transaction
      setTransactionStatus({ status: 'pending' })

      const addresses = config.recipients.map(r => r.address as `0x${string}`)
      const amountStrings = config.recipients.map(r => r.amount)
      

      
      const amounts = parseAmounts(
        amountStrings,
        config.tokenType === 'ETH',
        config.tokenDecimals || 18
      )


      if (config.tokenType === 'ETH') {
        const totalValue = amounts.reduce((a, b) => a + b, BigInt(0))
        const fee = flatFee || BigInt(0)
        const totalWithFee = totalValue + fee
        
  
        
        await writeContract({
          address: contractAddress as `0x${string}`,
          abi: SAFE_MULTISENDER_ABI,
          functionName: 'multiSendETH',
          args: [addresses, amounts, config.revertOnFail],
          value: totalWithFee,
        })
      } else {
        const fee = flatFee || BigInt(0)
        

        
        await writeContract({
          address: contractAddress as `0x${string}`,
          abi: SAFE_MULTISENDER_ABI,
          functionName: 'multiSendERC20',
          args: [config.tokenAddress as `0x${string}`, addresses, amounts],
          value: fee,
        })
      }
      
      console.log('✅ Transfer transaction sent successfully!')
    } catch (error) {
      console.error('Transaction failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
      setTransactionStatus({
        status: 'error',
        error: errorMessage.includes('User rejected') || errorMessage.includes('User denied') 
          ? 'Transaction was cancelled by user' 
          : errorMessage
      })
    }
  }, [address, contractAddress, config, writeContract, flatFee, isApproved, requiredAmount, refetchAllowance, allowance])

  // Log component state for debugging
  useEffect(() => {
    console.log('🔍 Step5Transaction useEffect:', {
      status: transactionStatus.status,
      address: !!address,
      contractAddress: !!contractAddress,
      config: {
        tokenType: config.tokenType,
        tokenAddress: config.tokenAddress,
        recipients: config.recipients.length
      },
      allowance: allowance?.toString(),
      isApproved: isApproved,
      requiredAmount: requiredAmount?.toString()
    })
    
    // Force log to appear
    console.warn('⚠️ DEBUG: Step5Transaction mounted/updated')
    console.error('❌ DEBUG: This is a test error log')
  }, [address, contractAddress, transactionStatus.status, config, allowance, isApproved, requiredAmount])

  const handleNewTransaction = () => {
    // Reset all statuses
    setTransactionStatus({ status: 'idle' })
    setApprovalStatus('idle')
    setShowSuccessModal(false)
    
    // Reset to step 1
    onConfigChange({
      tokenType: 'ETH',
      recipients: [],
      amountMode: 'fixed',
      revertOnFail: true,
      tokenAddress: undefined,
      tokenSymbol: undefined,
      tokenDecimals: undefined,
      fixedAmount: ''
    })
    
    // Go back to step 1
    onPrev() // Step 5 -> Step 4
    onPrev() // Step 4 -> Step 3  
    onPrev() // Step 3 -> Step 2
    onPrev() // Step 2 -> Step 1
  }
  
    

  const getStatusMessage = () => {
    switch (transactionStatus.status) {
      case 'idle':
        return 'Transaction sent, waiting for confirmation...'
      case 'pending':
        return 'Transaction sent, waiting for confirmation...'
      case 'confirming':
        return 'Transaction confirming...'
      case 'success':
        return 'Transaction successfully completed!'
      case 'error':
        return 'Transaction failed'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (transactionStatus.status) {
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'confirming':
        return 'text-[#5638a1] dark:text-[#5638a1]'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getExplorerUrlForHash = () => {
    if (!hash || !chain) return ''
    return getExplorerUrl(chain.id, hash)
  }

  return (
    <Card>
      <div className="space-y-4">
        {/* Transaction Summary */}
        <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
          <h5 className="text-xs font-medium text-black dark:text-white mb-1">Transaction Summary</h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Token:</span>
              <span className="text-black dark:text-white">{tokenSymbol || config.tokenSymbol || 'ETH'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
              <span className="text-black dark:text-white">{config.recipients.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="text-black dark:text-white font-medium">
                {formatAmount(totalAmount.toString(), 4, tokenSymbol || config.tokenSymbol)} {tokenSymbol || config.tokenSymbol || 'ETH'}
              </span>
            </div>
            {flatFee && flatFee > BigInt(0) && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Transaction Fee:</span>
                <span className="text-black dark:text-white">
                  {formatFee(flatFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Network:</span>
              <span className="text-black dark:text-white">{chain ? getChainName(chain.id) : 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        <div className="text-center">
          {!contractAddress && (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium text-xs">Contract Not Deployed</p>
                <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                  Contract is not deployed on this network ({chain ? getChainName(chain.id) : 'Unknown'}). 
                  Please deploy the contract or select a different network.
                </p>
              </div>
            </div>
          )}
          
          {contractAddress && transactionStatus.status === 'idle' && (
            <div className="space-y-3">
              {config.tokenType === 'ERC20' && (
                <div className="p-3 bg-[#5638a1] dark:bg-[#5638a1] border border-[#5638a1] dark:border-[#5638a1] rounded-lg">
                  <p className="text-[#5638a1] dark:text-[#5638a1] font-medium text-xs mb-2">
                    Token Allowance Status
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#5638a1] dark:text-[#5638a1]">Current Allowance:</span>
                      <span className="text-[#5638a1] dark:text-[#5638a1] font-mono">
                        {allowance ? formatAmount(allowance.toString(), 4, config.tokenSymbol) : '0'} {config.tokenSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5638a1] dark:text-[#5638a1]">Required Amount:</span>
                      <span className="text-[#5638a1] dark:text-[#5638a1] font-mono">
                        {formatAmount(requiredAmount.toString(), 4, config.tokenSymbol)} {config.tokenSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5638a1] dark:text-[#5638a1]">Status:</span>
                      <span className={`font-medium ${isApproved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isApproved ? '✓ Approved' : '✗ Needs Approval'}
                      </span>
                    </div>
                  </div>
                  
                  {!isApproved && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                      <p className="text-yellow-800 dark:text-yellow-200 text-xs mb-2">
                        ⚠️ Token approval required before sending
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                        Click &quot;Send Transaction&quot; to approve and send automatically
                      </p>
                    </div>
                  )}
                </div>
              )}
              
            </div>
          )}

          {approvalStatus === 'pending' && (
            <div className="space-y-3">
              <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-800 border-t-[#5638a1] rounded-full animate-spin mx-auto"></div>
              <p className="text-[#5638a1] dark:text-[#5638a1] text-xs">Approving token...</p>
            </div>
          )}

          {approvalStatus === 'success' && (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-600 dark:text-green-400 font-medium text-xs">Token approved successfully!</p>
              <div className="p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-xs text-green-800 dark:text-green-200">
                  You can now proceed with the transaction.
                </p>
              </div>
            </div>
          )}

          {(transactionStatus.status === 'pending' || transactionStatus.status === 'confirming') && (
            <div className="space-y-3">
              <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin mx-auto"></div>
              <p className={`${getStatusColor()} text-xs`}>{getStatusMessage()}</p>
              {transactionStatus.hash && (
                <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                  <p className="font-mono text-xs text-black dark:text-white break-all">
                    {transactionStatus.hash}
                  </p>
                </div>
              )}
            </div>
          )}

          {transactionStatus.status === 'success' && (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-600 dark:text-green-400 font-medium text-xs">{getStatusMessage()}</p>
              <div className="p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-xs text-green-800 dark:text-green-200">
                  Successfully sent {formatAmount(totalAmount.toString(), 4, config.tokenSymbol)} {config.tokenSymbol || 'ETH'} to {config.recipients.length} recipients.
                </p>
              </div>
              {transactionStatus.hash && (
                <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                  <p className="font-mono text-xs text-black dark:text-white break-all mb-1">
                    {transactionStatus.hash}
                  </p>
                  {getExplorerUrlForHash() && (
                    <a
                      href={getExplorerUrlForHash()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#5638a1] dark:text-[#5638a1] hover:underline"
                    >
                      View on Explorer →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {transactionStatus.status === 'error' && (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium text-xs">{getStatusMessage()}</p>
              <div className="p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-xs text-red-800 dark:text-red-200">
                  {transactionStatus.error}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          {transactionStatus.status === 'idle' && (
            <>
              <Button
                variant="outline"
                onClick={onPrev}
                size="sm"
              >
                Back
              </Button>
              {config.tokenType === 'ERC20' && !isApproved && !isApprovalComplete ? (
                <Button
                  onClick={handleApproval}
                  className="px-6"
                  size="sm"
                  disabled={approvalStatus === 'pending'}
                >
                  {approvalStatus === 'pending' ? 'Approving...' : 'Approve Token'}
                </Button>
              ) : (
                <Button
                  onClick={handleSendTransaction}
                  className="px-6"
                  size="sm"
                >
                  Send Transaction
                </Button>
              )}
            </>
          )}
          
          {transactionStatus.status === 'success' && (
            <Button
              onClick={handleNewTransaction}
              className="px-6"
              size="sm"
            >
              New Transaction
            </Button>
          )}
          
          {transactionStatus.status === 'error' && (
            <>
              <Button
                variant="outline"
                onClick={onPrev}
                size="sm"
              >
                Back
              </Button>
              {config.tokenType === 'ERC20' && !isApproved && !isApprovalComplete ? (
                <Button
                  onClick={handleApproval}
                  className="px-6"
                  size="sm"
                  disabled={approvalStatus === 'pending'}
                >
                  {approvalStatus === 'pending' ? 'Approving...' : 'Approve Token'}
                </Button>
              ) : (
                <Button
                  onClick={handleSendTransaction}
                  className="px-6"
                  size="sm"
                >
                  Retry
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        transactionHash={transactionStatus.hash || ''}
        chainId={chain?.id || 8453}
        recipients={config.recipients}
        tokenSymbol={tokenSymbol || config.tokenSymbol || 'ETH'}
        totalAmount={totalAmount.toString()}
      />
    </Card>
  )
}
