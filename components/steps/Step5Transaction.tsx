'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSendCalls } from 'wagmi'
import MiniAppSDK from '@farcaster/miniapp-sdk'
import { encodeFunctionData, toHex, formatUnits, parseUnits } from 'viem'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StepProps, TransactionStatus } from '@/types'
import { parseAmounts, getContractAddress, SAFE_MULTISENDER_ABI, calculateTotalWithFee, formatFee } from '@/lib/contracts'
import { getExplorerUrl, getChainName } from '@/lib/chains'
import { useContractInfo } from '@/hooks/useContractInfo'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { calculateTotal, formatAmount } from '@/lib/validation'
import { SuccessModal } from '@/components/SuccessModal'
import { BatchTransactionProgress } from '@/components/BatchTransactionProgress'
import { createBatches, getBatchStats, BATCH_LIMITS } from '@/lib/batch-transactions'

export function Step5Transaction({ config, onConfigChange, onNext, onPrev }: StepProps) {

  
  const { address, chain, isConnected } = useAccount()
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    status: 'idle'
  })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'pending' | 'success' | 'error' | 'cancelled'>('idle')
  const [isApprovalComplete, setIsApprovalComplete] = useState(false)
  const [isApprovalTransaction, setIsApprovalTransaction] = useState(false)
  
  // Batch transaction states
  const [batchResults, setBatchResults] = useState<any[]>([])
  
  // Check if batch mode is needed
  const tokenType = config.tokenAddress === 'native' ? 'ETH' : 'ERC20'
  const batchMaxRecipients = tokenType === 'ETH' ? BATCH_LIMITS.ETH : BATCH_LIMITS.ERC20
  const needsBatchMode = config.recipients.length > batchMaxRecipients
  
  // Auto-enable batch mode when needed
  const showBatchMode = needsBatchMode
  // No chain switching in-app; Farcaster MiniApp may not support it.
  
  // Get contract info including fee & recipient limits
  const { flatFee, maxEthRecipients, maxErc20Recipients } = useContractInfo()
  
  // Get token info
  const { tokenSymbol, tokenName } = useTokenBalance(config.tokenAddress)

  const { writeContract, writeContractAsync, data: writeContractData, isPending: isWriteContractPending } = useWriteContract()
  const { writeContract: writeContractApproval, writeContractAsync: writeContractApprovalAsync, data: writeContractApprovalData, isPending: isWriteContractApprovalPending } = useWriteContract()
  const { sendCalls } = useSendCalls()
  const [transferHash, setTransferHash] = useState<`0x${string}` | undefined>(undefined)
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>(undefined)
  const {
    isLoading: isTransferConfirming,
    isSuccess: isTransferSuccess,
    isError: isTransferError,
  } = useWaitForTransactionReceipt({ hash: transferHash, chainId: 8453 })
  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalSuccess,
    isError: isApprovalError,
  } = useWaitForTransactionReceipt({ hash: approvalHash, chainId: 8453 })

  // Get contract address first
  // App is Base-only. Use Base (8453) as canonical chain for contract interactions
  const BASE_CHAIN_ID = 8453
  const contractAddress = getContractAddress(BASE_CHAIN_ID) || ''

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
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: config.tokenType === 'ERC20' && !!address && !!contractAddress,
      // While approval is pending, poll allowance so UI can auto-complete even if receipt watcher fails
      refetchInterval: approvalStatus === 'pending' ? 3000 : undefined,
    }
  })

  const requiredAmount = config.tokenType === 'ERC20' 
    ? parseAmounts(config.recipients.map(r => r.amount), false, config.tokenDecimals || 18).reduce((a, b) => a + b, BigInt(0))
    : BigInt(0)



  const isApproved = config.tokenType === 'ETH' || 
    (allowance && requiredAmount && BigInt(allowance.toString()) >= BigInt(requiredAmount.toString()))

  // Debug logging for approval status
  useEffect(() => {
    console.log('🔍 Approval status check:', {
      tokenType: config.tokenType,
      allowance: allowance?.toString(),
      requiredAmount: requiredAmount?.toString(),
      isApproved,
      isApprovalComplete,
      approvalStatus,
      allowanceBigInt: allowance ? BigInt(allowance.toString()) : null,
      requiredBigInt: requiredAmount ? BigInt(requiredAmount.toString()) : null
    })
  }, [config.tokenType, allowance, requiredAmount, isApproved, isApprovalComplete, approvalStatus])

  const totalAmount = calculateTotal(config.recipients.map(r => r.amount))
  // No recipient limits - batch system handles large lists

  // When transfer hash is set, mark transaction as pending with hash & start a 30s timeout fallback
  const transferTimerRef = useRef<number | null>(null)
  const signingTimerRef = useRef<number | null>(null)
  const approvalTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (transferHash) {
      // If we were in signing state, clear it now
      if (signingTimerRef.current) {
        clearTimeout(signingTimerRef.current)
        signingTimerRef.current = null
      }
      setTransactionStatus({ status: 'pending', hash: transferHash })
      if (transferTimerRef.current) {
        clearTimeout(transferTimerRef.current)
        transferTimerRef.current = null
      }
      transferTimerRef.current = window.setTimeout(() => {
        setTransactionStatus((prev) => {
          if (!prev) return prev as any
          if (prev.status === 'success' || prev.status === 'error') return prev
          return {
            ...prev,
            status: 'idle',
            message: 'Confirmation is taking longer than usual. You can check the explorer link below.'
          }
        })
      }, 30_000)
    }
    return () => {
      if (transferTimerRef.current) {
        clearTimeout(transferTimerRef.current)
        transferTimerRef.current = null
      }
    }
  }, [transferHash])

  // Update confirming state only for transfer flow
  useEffect(() => {
    if (isTransferConfirming) {
      setTransactionStatus(prev => ({ ...prev, status: 'confirming' }))
    }
  }, [isTransferConfirming])

  // Approval success watcher
  useEffect(() => {
    if (isApprovalSuccess) {
      console.log('✅ Approval transaction confirmed, updating status...')
      setApprovalStatus('success')
      setIsApprovalComplete(true)
      if (config.tokenType === 'ERC20') {
        console.log('🔄 Refetching allowance after approval...')
        refetchAllowance()
        
        // Additional refresh after a short delay to ensure the allowance is updated
        setTimeout(() => {
          console.log('🔄 Second allowance refresh...')
          refetchAllowance()
        }, 2000)
        
        // Force a third refresh after a longer delay
        setTimeout(() => {
          console.log('🔄 Third allowance refresh...')
          refetchAllowance()
        }, 5000)
      }
    }
  }, [isApprovalSuccess, config.tokenType, refetchAllowance])

  // Fallback: if allowance becomes sufficient while pending, mark approval as success
  useEffect(() => {
    if (approvalStatus === 'pending' && isApprovalTransaction && isApproved) {
      setApprovalStatus('success')
      setIsApprovalComplete(true)
    }
  }, [approvalStatus, isApprovalTransaction, isApproved])

  // Force allowance refresh when approval hash is set
  useEffect(() => {
    if (approvalHash && config.tokenType === 'ERC20') {
      console.log('🔄 Approval hash received, refreshing allowance...')
      refetchAllowance()
      
      // Also set approval as complete immediately when hash is received
      // This provides immediate UI feedback while the allowance refreshes
      setTimeout(() => {
        console.log('✅ Setting approval as complete based on hash...')
        setIsApprovalComplete(true)
        setApprovalStatus('success')
      }, 1000)
    }
  }, [approvalHash, config.tokenType, refetchAllowance])

  // Transfer success watcher
  useEffect(() => {
    if (isTransferSuccess) {
      setTransactionStatus(prev => ({ ...prev, status: 'success' }))
      setShowSuccessModal(true)
      // Clear approval status when transfer is successful
      if (approvalStatus === 'success') {
        console.log('🧹 Clearing approval status after successful transfer...')
        setApprovalStatus('idle')
      }
      if (transferTimerRef.current) {
        clearTimeout(transferTimerRef.current)
        transferTimerRef.current = null
      }
    }
  }, [isTransferSuccess, approvalStatus])

  // Error watchers
  useEffect(() => {
    if (isApprovalError) {
      setApprovalStatus('error')
      setIsApprovalTransaction(false)
    }
  }, [isApprovalError])
  useEffect(() => {
    if (isTransferError) {
      setTransactionStatus(prev => ({
        ...prev,
        status: 'error',
        error: prev.error || 'Transaction failed',
      }))
      if (transferTimerRef.current) {
        clearTimeout(transferTimerRef.current)
        transferTimerRef.current = null
      }
    }
  }, [isTransferError])

  // Note: We now use writeContractAsync which returns the hash directly, so we don't need these useEffects

  const handleApprove = useCallback(async () => {
    if (!address || !config.tokenAddress || !contractAddress) {
      console.error('Missing required parameters for approval')
      return
    }

    // Check if we're connected
    if (!isConnected) {
      setTransactionStatus({
        status: 'error',
        error: 'Please connect your wallet first'
      })
      return
    }

    // Do not programmatically switch chains; Farcaster MiniApp may not support it.
    // Interact directly on Base by specifying chainId in contract calls below.

    try {
      setApprovalStatus('pending')
      if (approvalTimerRef.current) {
        clearTimeout(approvalTimerRef.current)
        approvalTimerRef.current = null
      }
      approvalTimerRef.current = window.setTimeout(() => {
        // Timeout safety: stop spinner if nothing happens in 30s
        setApprovalStatus((prev) => (prev === 'pending' ? 'error' : prev))
        setIsApprovalTransaction(false)
      }, 30_000)

      // Use a more direct approach to avoid connector issues
      const approveABI = [
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
      ] as const

      try {
        setIsApprovalTransaction(true)
        const txHash = await writeContractApprovalAsync({
          address: config.tokenAddress as `0x${string}`,
          abi: approveABI,
          functionName: 'approve',
          args: [contractAddress, requiredAmount],
          chainId: BASE_CHAIN_ID,
        })
        console.log('📝 Approval transaction hash received:', txHash)
        setApprovalHash(txHash as `0x${string}`)
      } catch (e: any) {
        const msg = e?.message || String(e)
        if (msg.includes('getChainId is not a function')) {
          // Fallback: send via MiniApp provider directly
          try {
            const data = encodeFunctionData({
              abi: approveABI,
              functionName: 'approve',
              args: [contractAddress as `0x${string}`, requiredAmount],
            })
            const txHash = await MiniAppSDK.wallet.ethProvider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: address,
                  to: config.tokenAddress as `0x${string}`,
                  data,
                  value: '0x0',
                },
              ],
            })
            setIsApprovalTransaction(true)
            setApprovalHash(txHash as `0x${string}`)
          } catch (fe: any) {
            // User rejected via MiniApp provider
            setApprovalStatus('error')
            setIsApprovalTransaction(false)
            if (approvalTimerRef.current) {
              clearTimeout(approvalTimerRef.current)
              approvalTimerRef.current = null
            }
            return
          }
        } else {
          throw e
        }
      }
    } catch (error) {
      console.error('Approve failed:', error)
      setApprovalStatus('error')
      setIsApprovalTransaction(false)
      const errorMessage = error instanceof Error ? error.message : 'Approve failed'
      const errorName = (error as any)?.name as string | undefined
      // If user rejected, do not show transfer error UI
      if (
        (typeof errorMessage === 'string' && (
          errorMessage.includes('User rejected') ||
          errorMessage.includes('User denied') ||
          errorMessage.includes('Rejected')
        )) || errorName === 'RejectedByUser'
      ) {
        if (approvalTimerRef.current) {
          clearTimeout(approvalTimerRef.current)
          approvalTimerRef.current = null
        }
        return
      }
      if (approvalTimerRef.current) {
        clearTimeout(approvalTimerRef.current)
        approvalTimerRef.current = null
      }
      // Keep transactionStatus untouched for approval errors to avoid showing transfer error UI
    }
  }, [address, config.tokenAddress, contractAddress, writeContractApprovalAsync, requiredAmount, isConnected])

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
      try {
        const txHash = await writeContractApprovalAsync({
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
          chainId: BASE_CHAIN_ID,
        })
        console.log('📝 Approval transaction hash received:', txHash)
        setApprovalHash(txHash as `0x${string}`)
      } catch (e: any) {
        const msg = e?.message || String(e)
        if (msg.includes('getChainId is not a function')) {
          try {
            const data = encodeFunctionData({
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
              ] as const,
              functionName: 'approve',
              args: [contractAddress as `0x${string}`, requiredAmount],
            })
            const txHash = await MiniAppSDK.wallet.ethProvider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: address,
                  to: config.tokenAddress as `0x${string}`,
                  data,
                  value: '0x0',
                },
              ],
            })
            setApprovalHash(txHash as `0x${string}`)
          } catch (fe: any) {
            setApprovalStatus('error')
            setIsApprovalTransaction(false)
            return
          }
        } else {
          throw e
        }
      }
      
    } catch (error) {
      console.error('❌ Approve transaction failed:', error)
      setApprovalStatus('error')
      setIsApprovalTransaction(false)
      // Do not rethrow to avoid leaving spinner in pending state
      return
    }
  }, [address, contractAddress, config.tokenAddress, writeContractApprovalAsync, requiredAmount])

  // Cancel approval process
  const cancelApproval = useCallback(() => {
    setApprovalStatus('cancelled')
    setIsApprovalTransaction(false)
    setIsApprovalComplete(false)
  }, [])

  // Reset approval to retry
  const resetApproval = useCallback(() => {
    setApprovalStatus('idle')
    setIsApprovalTransaction(false)
    setIsApprovalComplete(false)
  }, [])

  const handleSendTransaction = useCallback(async () => {
    if (!address || !contractAddress) {
      console.error('❌ Missing address or contractAddress:', { address: !!address, contractAddress: !!contractAddress })
      setTransactionStatus({
        status: 'error',
        error: 'Wallet not connected or contract not deployed'
      })
      return
    }

    // Clear approval status when starting transfer
    if (approvalStatus === 'success') {
      console.log('🧹 Clearing approval status for transfer...')
      setApprovalStatus('idle')
    }

    // Enforce max recipients limit
    // No recipient limit check - batch system handles large lists

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
      // Reset approval transaction flag before starting transfer
      setIsApprovalTransaction(false)
      // Show signing state while waiting for wallet confirmation
      setTransactionStatus({ status: 'signing', message: 'Please confirm the transaction in your wallet…' })
      // Start 30s signing guard
      if (signingTimerRef.current) {
        clearTimeout(signingTimerRef.current)
        signingTimerRef.current = null
      }
      signingTimerRef.current = window.setTimeout(() => {
        setTransactionStatus((prev) => {
          if (!prev || prev.status !== 'signing') return prev as any
          return { ...prev, status: 'idle', message: 'Signature taking longer than usual. Please try again.' }
        })
      }, 30_000)

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
        
  
        
        try {
          console.log('🚀 Sending ETH transaction...', { contractAddress, totalWithFee: totalWithFee.toString() })
          const txHash = await writeContractAsync({
            address: contractAddress as `0x${string}`,
            abi: SAFE_MULTISENDER_ABI,
            functionName: 'multiSendETH',
            args: [addresses, amounts],
            value: totalWithFee,
            chainId: BASE_CHAIN_ID,
          })
          console.log('📝 Transaction hash received:', txHash)
          setTransferHash(txHash as `0x${string}`)
        } catch (e: any) {
          const msg = e?.message || String(e)
          const tryFallback = /getChainId is not a function|Connector|Not connected|getAccounts|Provider/i.test(msg)
          if (tryFallback) {
            const data = encodeFunctionData({
              abi: SAFE_MULTISENDER_ABI,
              functionName: 'multiSendETH',
              args: [addresses, amounts],
            })
            console.log('🔄 Using fallback transaction method for ETH...')
            const txHash = await MiniAppSDK.wallet.ethProvider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: address,
                  to: contractAddress,
                  data,
                  value: toHex(totalWithFee),
                },
              ],
            })
            console.log('📝 Fallback transaction hash received:', txHash)
            setTransferHash(txHash as `0x${string}`)
          } else {
            throw e
          }
        }
      } else {
        const fee = flatFee || BigInt(0)
        

        
        try {
          console.log('🚀 Sending ERC20 transaction...', { contractAddress, tokenAddress: config.tokenAddress, fee: fee.toString() })
          const txHash = await writeContractAsync({
            address: contractAddress as `0x${string}`,
            abi: SAFE_MULTISENDER_ABI,
            functionName: 'multiSendERC20',
            args: [config.tokenAddress as `0x${string}`, addresses, amounts],
            value: fee,
            chainId: BASE_CHAIN_ID,
          })
          console.log('📝 Transaction hash received:', txHash)
          setTransferHash(txHash as `0x${string}`)
        } catch (e: any) {
          const msg = e?.message || String(e)
          const tryFallback = /getChainId is not a function|Connector|Not connected|getAccounts|Provider/i.test(msg)
          if (tryFallback) {
            const data = encodeFunctionData({
              abi: SAFE_MULTISENDER_ABI,
              functionName: 'multiSendERC20',
              args: [config.tokenAddress as `0x${string}`, addresses, amounts],
            })
            console.log('🔄 Using fallback transaction method for ERC20...')
            const txHash = await MiniAppSDK.wallet.ethProvider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: address,
                  to: contractAddress,
                  data,
                  value: toHex(fee),
                },
              ],
            })
            console.log('📝 Fallback transaction hash received:', txHash)
            setTransferHash(txHash as `0x${string}`)
          } else {
            throw e
          }
        }
      }
      console.log('✅ Transfer transaction submitted successfully!')
    } catch (error) {
      console.error('Transaction failed:', error)
      const err: any = error
      const errorName = err?.name as string | undefined
      const errorCode = err?.code as number | undefined
      const errorMessage = (err?.message as string | undefined) || 'Transaction failed'
      if (transferTimerRef.current) {
        clearTimeout(transferTimerRef.current)
        transferTimerRef.current = null
      }
      if (
        errorName === 'RejectedByUser' ||
        errorCode === 4001 ||
        /User rejected|User denied|Rejected/i.test(errorMessage)
      ) {
        setTransactionStatus({ status: 'error', error: 'Transaction was cancelled by user' })
        return
      }
      setTransactionStatus({ status: 'error', error: errorMessage })
    }
  }, [address, contractAddress, config, writeContractAsync, flatFee, isApproved, isApprovalComplete, approvalStatus])

  // (Debug logging removed to reduce noise in Step 5 UI)

  const handleNewTransaction = () => {
    // Reset all statuses
    setTransactionStatus({ status: 'idle' })
    setApprovalStatus('idle')
    setIsApprovalTransaction(false)
    setIsApprovalComplete(false)
    setShowSuccessModal(false)
    
    // Reset to step 1
    onConfigChange({
      tokenType: 'ETH',
      recipients: [],
      amountMode: 'fixed',
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
      case 'signing':
        return transactionStatus.message || 'Waiting for wallet signature…'
      case 'idle':
        return 'Transaction sent, waiting for confirmation...'
      case 'pending':
        return transactionStatus.message || 'Transaction sent, waiting for confirmation...'
      case 'confirming':
        return 'Transaction confirming...'
      case 'success':
        return 'Transaction successfully completed!'
      case 'error':
        return transactionStatus.error || 'Transaction failed'
      default:
        return 'Processing...'
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
    if (!transactionStatus.hash) return ''
    return getExplorerUrl(BASE_CHAIN_ID, transactionStatus.hash)
  }

  // Show batch mode if needed
  if (showBatchMode) {
    return (
      <BatchTransactionProgress
        recipients={config.recipients}
        tokenType={tokenType}
        tokenAddress={config.tokenAddress}
        tokenSymbol={config.tokenSymbol}
        tokenName={config.tokenName}
        tokenDecimals={config.tokenDecimals}
        onBatchExecute={async (batch) => {
          try {
            // For ERC20 tokens, ensure approval first
            if (config.tokenType !== 'ETH' && !isApproved) {
              console.log('🔄 Batch requires approval, executing approval first...')
              await handleApproval()
              // Wait for approval to complete
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
            
            // Execute the batch transaction using existing logic
            const addresses = batch.recipients.map(r => r.address as `0x${string}`)
            const amounts = batch.recipients.map(r => 
              parseUnits(r.amount, config.tokenType === 'ETH' ? 18 : (config.tokenDecimals || 18))
            )
            
            console.log(`🚀 Executing batch ${batch.batchNumber} with ${batch.recipients.length} recipients`)
            console.time(`batch-${batch.batchNumber}-preparation`)
            
            if (config.tokenType === 'ETH') {
              // ETH batch transaction
              const totalValue = amounts.reduce((sum, amount) => sum + amount, BigInt(0))
              const result = await writeContractAsync({
                address: contractAddress as `0x${string}`,
                abi: SAFE_MULTISENDER_ABI,
                functionName: 'multiSendETH',
                args: [addresses, amounts],
                value: totalValue + (flatFee || BigInt(0)),
                gas: BigInt(Math.min(addresses.length * 50000 + 100000, 30000000)) // Manual gas limit
              })
              console.timeEnd(`batch-${batch.batchNumber}-preparation`)
              console.log('✅ ETH batch transaction sent:', result)
              console.log('🔍 Transaction hash type:', typeof result, 'Value:', result)
              return { success: true, hash: result as string }
            } else {
              // ERC20 batch transaction
              const result = await writeContractAsync({
                address: contractAddress as `0x${string}`,
                abi: SAFE_MULTISENDER_ABI,
                functionName: 'multiSendERC20',
                args: [config.tokenAddress as `0x${string}`, addresses, amounts],
                value: flatFee || BigInt(0),
                gas: BigInt(Math.min(addresses.length * 60000 + 100000, 30000000)) // Manual gas limit
              })
              console.timeEnd(`batch-${batch.batchNumber}-preparation`)
              console.log('✅ ERC20 batch transaction sent:', result)
              console.log('🔍 Transaction hash type:', typeof result, 'Value:', result)
              return { success: true, hash: result as string }
            }
          } catch (error) {
            console.error('❌ Batch transaction failed:', error)
            return { success: false }
          }
        }}
        onComplete={(results) => {
          setBatchResults(results)
          setShowSuccessModal(true)
        }}
        onCancel={() => onPrev()}
      />
    )
  }

  return (
    <Card>
      <div className="space-y-4">
        {/* Batch Mode Info */}
        {needsBatchMode && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Batch Mode Active
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {config.recipients.length} recipients will be processed in {Math.ceil(config.recipients.length / batchMaxRecipients)} batches of {batchMaxRecipients} {tokenType} transfers each.
                </p>
              </div>
            </div>
          </div>
        )}

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
            {/* No recipient limit warnings - batch system handles large lists */}
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
              <span className="text-black dark:text-white">{getChainName(BASE_CHAIN_ID)}</span>
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
            <div className="space-y-3 my-2">
              {config.tokenType === 'ERC20' && (
                <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 font-medium text-xs mb-2">
                    Token Allowance Status
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Current Allowance:</span>
                      <span className="text-gray-600 dark:text-gray-400 font-mono">
                        {allowance ? formatAmount(formatUnits(BigInt(allowance.toString()), config.tokenDecimals || 18), 4, config.tokenSymbol) : '0'} {config.tokenSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Required Amount:</span>
                      <span className="text-gray-600 dark:text-gray-400 font-mono">
                        {formatAmount(formatUnits(BigInt(requiredAmount.toString()), config.tokenDecimals || 18), 4, config.tokenSymbol)} {config.tokenSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`font-medium ${isApproved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isApproved ? '✓ Approved' : '✗ Needs Approval'}
                      </span>
                    </div>
                  </div>
               
                </div>
              )}
              
            </div>
          )}

          {approvalStatus === 'pending' && (
            <div className="space-y-3">
              <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-800 border-t-[#5638a1] rounded-full animate-spin mx-auto"></div>
              <p className="text-[#5638a1] dark:text-[#5638a1] text-xs">Approving token...</p>
              <Button
                onClick={cancelApproval}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Cancel Approval
              </Button>
            </div>
          )}

          {(approvalStatus === 'error' || approvalStatus === 'cancelled') && (
            <div className="space-y-3">
              <div className="p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-xs text-red-800 dark:text-red-200">
                  {approvalStatus === 'cancelled' ? 'Approval cancelled.' : 'Approval failed.'} Please try again.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={resetApproval}
                  variant="outline"
                  size="sm"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleApproval}
                  size="sm"
                >
                  Retry Approval
                </Button>
              </div>
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

          {(transactionStatus.status === 'signing' || transactionStatus.status === 'pending' || transactionStatus.status === 'confirming') && (
            <div className="space-y-3">
              <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin mx-auto"></div>
              <p className={`${getStatusColor()} text-xs`}>{getStatusMessage()}</p>
              {transactionStatus.hash && (
                <div className="p-2 bg-gray-50 dark:bg-black/20 dark:backdrop-blur-sm rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-black dark:text-white break-all">
                      {transactionStatus.hash}
                    </p>
                    {getExplorerUrlForHash() && (
                      <a
                        href={getExplorerUrlForHash()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 underline"
                      >
                        View on explorer
                      </a>
                    )}
                  </div>
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
                  disabled={false}
                >
                  Send Transaction
                </Button>
              )}
            </>
          )}
          
          {transactionStatus.status === 'success' && (
            <Button
              onClick={handleNewTransaction}
              className="px-6 w-full"
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
