/**
 * Batch Transaction Progress Component
 * Shows progress for multi-batch transactions
 */

'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useBalance } from 'wagmi'
import { RotateCcw, Play, ExternalLink, Share2, Check, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BatchInfo, BatchProgress, createBatches, createBatchProgress, updateBatchProgress, formatBatchSummary, getBatchStats } from '@/lib/batch-transactions'
import { Recipient } from '@/types'

// Format amount to remove excessive decimals
const formatDisplayAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0'
  
  // If it's a whole number, show no decimals
  if (num % 1 === 0) return num.toString()
  
  // If it's less than 0.01, show up to 6 decimals
  if (num < 0.01) return num.toFixed(6).replace(/\.?0+$/, '')
  
  // Otherwise show up to 4 decimals
  return num.toFixed(4).replace(/\.?0+$/, '')
}

interface BatchTransactionProgressProps {
  recipients: Recipient[]
  tokenType: 'ETH' | 'ERC20'
  tokenAddress?: string
  tokenSymbol?: string
  tokenName?: string
  tokenDecimals?: number
  onBatchExecute: (batch: BatchInfo) => Promise<{success: boolean, hash?: string}>
  onComplete: (results: BatchResult[]) => void
  onCancel: () => void
}

interface BatchResult {
  batchNumber: number
  success: boolean
  hash?: string
  error?: string
  recipients: Recipient[]
}

export function BatchTransactionProgress({
  recipients,
  tokenType,
  tokenAddress,
  tokenSymbol = tokenType,
  tokenName,
  tokenDecimals = 18,
  onBatchExecute,
  onComplete,
  onCancel
}: BatchTransactionProgressProps) {
  const { address } = useAccount()
  
  // Get token balance
  const { data: balance } = useBalance({
    address,
    token: tokenType === 'ERC20' ? (tokenAddress as `0x${string}`) : undefined,
  })
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [results, setResults] = useState<BatchResult[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentBatch, setCurrentBatch] = useState<BatchInfo | null>(null)
  const [showRecipientList, setShowRecipientList] = useState(false)
  const [retryingBatch, setRetryingBatch] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  // Initialize batches
  useEffect(() => {
    const batchList = createBatches(recipients, tokenType)
    setBatches(batchList)
    setProgress(createBatchProgress(batchList.length))
  }, [recipients, tokenType])

  // Get batch statistics
  const stats = getBatchStats(recipients, tokenType)

  // Retry a specific failed batch
  const retryBatch = async (batchNumber: number) => {
    const batch = batches.find(b => b.batchNumber === batchNumber)
    if (!batch) return

    setRetryingBatch(batchNumber)
    
    try {
      const batchResult = await onBatchExecute(batch)
      
      // Update the result for this batch
      setResults(prev => prev.map(result => 
        result.batchNumber === batchNumber 
          ? { ...result, success: batchResult.success, hash: batchResult.hash, error: batchResult.success ? undefined : 'Retry failed' }
          : result
      ))
      
      // Update progress
      setProgress(prev => {
        if (!prev) return null
        const newProgress = { ...prev }
        if (batchResult.success) {
          newProgress.completedBatches += 1
          newProgress.failedBatches -= 1
        }
        newProgress.progress = Math.round(((newProgress.completedBatches + newProgress.failedBatches) / newProgress.totalBatches) * 100)
        return newProgress
      })

      // If retry was successful, continue with remaining batches
      if (batchResult.success) {
        const remainingBatches = batches.filter(b => 
          b.batchNumber > batchNumber && 
          !results.some(r => r.batchNumber === b.batchNumber && r.success)
        )
        
        if (remainingBatches.length > 0) {
          console.log(`✅ Retry successful, continuing with ${remainingBatches.length} remaining batches`)
          // Continue processing remaining batches
          continueWithRemainingBatches(remainingBatches)
        }
      }
      
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setRetryingBatch(null)
    }
  }

  // Continue processing remaining batches after a successful retry
  const continueWithRemainingBatches = async (remainingBatches: BatchInfo[]) => {
    setIsExecuting(true)
    
    for (const batch of remainingBatches) {
      // Skip if this batch was already processed successfully
      const existingResult = results.find(r => r.batchNumber === batch.batchNumber)
      if (existingResult?.success) continue
      
      setCurrentBatch(batch)
      
      try {
        const batchResult = await onBatchExecute(batch)
        
        const result: BatchResult = {
          batchNumber: batch.batchNumber,
          success: batchResult.success,
          recipients: batch.recipients,
          hash: batchResult.hash,
          error: batchResult.success ? undefined : 'Transaction failed'
        }
        
        setResults(prev => {
          // Remove existing result if any, then add new one
          const filtered = prev.filter(r => r.batchNumber !== batch.batchNumber)
          return [...filtered, result]
        })
        
        // Update progress
        setProgress(prev => prev ? updateBatchProgress(prev, batch.batchNumber, batchResult.success) : null)
        
        // If failed, log and continue
        if (!batchResult.success) {
          console.warn(`⚠️ Batch ${batch.batchNumber} failed during continuation, moving to next batch`)
        }
        
      } catch (error) {
        const result: BatchResult = {
          batchNumber: batch.batchNumber,
          success: false,
          recipients: batch.recipients,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        
        setResults(prev => {
          const filtered = prev.filter(r => r.batchNumber !== batch.batchNumber)
          return [...filtered, result]
        })
        setProgress(prev => prev ? updateBatchProgress(prev, batch.batchNumber, false) : null)
        
        console.warn(`⚠️ Batch ${batch.batchNumber} failed during continuation: ${result.error}`)
      }
    }

    setIsExecuting(false)
    setCurrentBatch(null)
    
    // Check if all batches are now complete
    const allResults = results.filter(r => batches.some(b => b.batchNumber === r.batchNumber))
    if (allResults.length === batches.length) {
      onComplete(allResults)
    }
  }

  // Download recipient list as CSV
  const downloadRecipientList = () => {
    const csvContent = [
      // Header
      'Address,Amount,Display Name,Type,Farcaster Username,Farcaster FID',
      // Data rows
      ...recipients.map(recipient => {
        const address = recipient.address
        const amount = recipient.amount || '0'
        const displayName = recipient.displayName || ''
        const type = recipient.farcasterProfile ? 'Farcaster' : 'Direct Address'
        const username = recipient.farcasterProfile?.username || ''
        const fid = recipient.farcasterProfile?.fid || ''
        
        return `"${address}","${amount}","${displayName}","${type}","${username}","${fid}"`
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `recipients-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Save recipient list to localStorage
  const saveRecipientList = () => {
    const listName = prompt('Enter a name for this recipient list:')
    if (!listName) return

    const savedLists = JSON.parse(localStorage.getItem('savedRecipientLists') || '[]')
    const newList = {
      id: Date.now().toString(),
      name: listName,
      recipients: recipients,
      tokenType: tokenType,
      createdAt: new Date().toISOString(),
      totalRecipients: recipients.length
    }

    savedLists.push(newList)
    localStorage.setItem('savedRecipientLists', JSON.stringify(savedLists))
    
    alert(`Recipient list "${listName}" saved successfully!`)
  }

  // Execute all batches sequentially
  const executeBatches = async () => {
    if (batches.length === 0 || !progress) return

    setIsExecuting(true)
    const batchResults: BatchResult[] = []

    for (const batch of batches) {
      setCurrentBatch(batch)
      
      try {
        const batchResult = await onBatchExecute(batch)
        
        const result: BatchResult = {
          batchNumber: batch.batchNumber,
          success: batchResult.success,
          recipients: batch.recipients,
          hash: batchResult.hash,
          error: batchResult.success ? undefined : 'Transaction failed'
        }
        
        console.log('🔍 BatchResult created:', { 
          batchNumber: batch.batchNumber, 
          success: batchResult.success, 
          hash: batchResult.hash,
          hashType: typeof batchResult.hash 
        })
        
        batchResults.push(result)
        setResults(prev => [...prev, result])
        
        // Update progress
        setProgress(prev => prev ? updateBatchProgress(prev, batch.batchNumber, batchResult.success) : null)
        
        // If failed, ask user if they want to continue
        if (!batchResult.success) {
          const shouldContinue = window.confirm(
            `Batch ${batch.batchNumber} failed. Do you want to continue with the remaining batches?`
          )
          if (!shouldContinue) {
            break
          }
        }
        
        // Small delay between batches
        if (!batch.isLastBatch) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (error) {
        const result: BatchResult = {
          batchNumber: batch.batchNumber,
          success: false,
          recipients: batch.recipients,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        
        batchResults.push(result)
        setResults(prev => [...prev, result])
        setProgress(prev => prev ? updateBatchProgress(prev, batch.batchNumber, false) : null)
        
        const shouldContinue = window.confirm(
          `Batch ${batch.batchNumber} failed with error: ${result.error}. Continue with remaining batches?`
        )
        if (!shouldContinue) {
          break
        }
      }
    }

    setIsExecuting(false)
    setCurrentBatch(null)
    onComplete(batchResults)
  }

  // Check if there are remaining batches to continue with
  const getRemainingBatches = () => {
    return batches.filter(b => 
      !results.some(r => r.batchNumber === b.batchNumber && r.success)
    )
  }

  // Continue with all remaining batches
  const continueWithAllRemaining = async () => {
    const remaining = getRemainingBatches()
    if (remaining.length > 0) {
      await continueWithRemainingBatches(remaining)
    }
  }

  if (!progress) return null

  return (
    <>
    <Card className="p-2">
      <div className="space-y-2">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Batch Transaction Progress
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Processing {stats.totalRecipients} recipients in {stats.totalBatches} batches
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Recipients</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {stats.totalRecipients}
            </div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Batches</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {stats.totalBatches}
            </div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Max Per Batch</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {stats.maxPerBatch}
            </div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Token Type</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {stats.tokenType}
            </div>
          </div>
        </div>

        {/* Token & Processing Amount Information Card */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {tokenSymbol} • {tokenType === 'ETH' ? 'Native' : 'ERC20'}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDisplayAmount(stats.totalAmount)} {tokenSymbol}
            </div>
          </div>
        </Card>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress: {progress.completedBatches + progress.failedBatches}/{progress.totalBatches}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progress.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-[#5638a1] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>

        {/* Current Batch Info */}
        {currentBatch && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Processing Batch {currentBatch.batchNumber}
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {currentBatch.recipients.length} recipients • {formatDisplayAmount(currentBatch.totalAmount)} {tokenSymbol}
            </p>
          </div>
        )}

        {/* Batch List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {batches.map((batch) => {
            const result = results.find(r => r.batchNumber === batch.batchNumber)
            const isProcessing = currentBatch?.batchNumber === batch.batchNumber
            const isPending = !result && !isProcessing && batch.batchNumber > (progress.currentBatch || 0)
            
            return (
              <div
                key={batch.batchNumber}
                className={`p-3 border rounded-lg ${
                  result?.success
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : result && !result.success
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : isProcessing
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Batch {batch.batchNumber} - {batch.recipients.length} recipients
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Total: {formatDisplayAmount(batch.totalAmount)} {tokenSymbol}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result?.success && (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {result && !result.success && (
                      <>
                        <div className="flex gap-1">
                          <button
                            onClick={() => retryBatch(batch.batchNumber)}
                            disabled={retryingBatch === batch.batchNumber || isExecuting}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                            title="Retry batch"
                          >
                            {retryingBatch === batch.batchNumber ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>
                          {getRemainingBatches().length > 0 && !isExecuting && (
                            <button
                              onClick={continueWithAllRemaining}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
                              title={`Continue with ${getRemainingBatches().length} remaining batches`}
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {isProcessing && (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    )}
                    {isPending && (
                      <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    )}
                  </div>
                </div>
                {result?.error && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Error: {result.error}
                  </div>
                )}
                {result?.success && result.hash && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Transaction Hash: 
                      <span className="font-mono ml-1">{result.hash.slice(0, 10)}...{result.hash.slice(-8)}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => window.open(`https://basescan.org/tx/${result.hash}`, '_blank')}
                        className="p-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded"
                        title="View on BaseScan"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          const shareText = `🚀 Successfully sent tokens to ${result.recipients.length} recipients!\n\nTransaction: https://basescan.org/tx/${result.hash}\n\nPowered by FarSender 💜`
                          if (navigator.share) {
                            navigator.share({ text: shareText })
                          } else {
                            navigator.clipboard.writeText(shareText)
                            alert('Share text copied to clipboard!')
                          }
                        }}
                        className="p-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded"
                        title="Share transaction"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Global Share Button */}
        {results.some(r => r.success) && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-900 dark:text-green-100">
                  🎉 Transactions Completed!
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  {results.filter(r => r.success).length} successful batch{results.filter(r => r.success).length > 1 ? 'es' : ''} • {results.reduce((sum, r) => sum + (r.success ? r.recipients.length : 0), 0)} recipients
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium"
              >
                Share All Results
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isExecuting && !progress.isComplete && (
            <Button
              onClick={executeBatches}
              disabled={batches.length === 0}
              className="flex-1"
            >
              Start Batch Execution
            </Button>
          )}
          
          {progress.isComplete && (
            <div className="flex-1 flex gap-2">
              {progress.failedBatches > 0 ? (
                <>
                  <Button
                    onClick={continueWithAllRemaining}
                    disabled={isExecuting || getRemainingBatches().length === 0}
                    className="flex-1"
                  >
                    Retry Failed ({progress.failedBatches})
                  </Button>
                  <Button
                    onClick={() => onComplete(results)}
                    variant="outline"
                    className="flex-1"
                  >
                    Finish ({progress.completedBatches} success, {progress.failedBatches} failed)
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => onComplete(results)}
                  className="flex-1"
                >
                  Complete ({progress.completedBatches} successful)
                </Button>
              )}
            </div>
          )}
          
          <Button
            onClick={() => setShowRecipientList(true)}
            variant="outline"
            size="sm"
          >
            View Recipients
          </Button>
          
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isExecuting}
          >
            {isExecuting ? 'Cancel' : 'Back'}
          </Button>
        </div>

        {/* Summary */}
        {progress.isComplete && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Batch Execution Summary
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {progress.completedBatches}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Successful</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {progress.failedBatches}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {progress.totalBatches}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
            </div>
          </div>
        )}

        {/* Recipient List Modal */}
        {showRecipientList && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Recipients List ({recipients.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadRecipientList()}
                      className="px-2 py-1 bg-[#5638a1] hover:bg-[#4a2d8f] text-white text-xs rounded transition-colors"
                    >
                      Download CSV
                    </button>
                    <button
                      onClick={() => saveRecipientList()}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                    >
                      Save List
                    </button>
                    <button
                      onClick={() => setShowRecipientList(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-2 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center gap-3">
                        {recipient.farcasterProfile?.pfpUrl && (
                          <Image 
                            src={recipient.farcasterProfile.pfpUrl} 
                            alt="Profile" 
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {recipient.displayName || `Recipient ${index + 1}`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {recipient.amount} {tokenType}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
    
    {/* Share All Results Modal */}
    {showShareModal && createPortal(
      <div 
        className="fixed inset-0 dark:backdrop-blur-none backdrop-blur-sm flex items-center justify-center z-[9999] p-2"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowShareModal(false)
          }
        }}
      >
        <div 
          className="dark:bg-transparent bg-white backdrop-blur-xl rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto border dark:border-gray-800 border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white">Batch Transactions Complete!</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">All your multi-sends are done</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-3">
            {/* Batch Summary */}
            <div className="dark:bg-transparent bg-white backdrop-blur-sm rounded-lg p-3 border border-gray-200 dark:border-gray-800">
              <h4 className="text-xs font-medium text-black dark:text-white mb-2">Batch Summary</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Recipients:</span>
                  <span className="text-black dark:text-white font-medium">
                    {results.reduce((sum, r) => sum + (r.success ? r.recipients.length : 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Successful Batches:</span>
                  <span className="text-black dark:text-white">{results.filter(r => r.success).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Failed Batches:</span>
                  <span className="text-black dark:text-white">{results.filter(r => !r.success).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Token Type:</span>
                  <span className="text-black dark:text-white">{tokenType}</span>
                </div>
              </div>
            </div>

            {/* Transaction Hashes */}
            {results.filter(r => r.success && r.hash).length > 0 && (
              <div className="dark:bg-transparent bg-white backdrop-blur-sm rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                <h4 className="text-xs font-medium text-black dark:text-white mb-2">Transaction Hashes</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {results.filter(r => r.success && r.hash).map((result) => (
                    <div key={result.batchNumber} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Batch {result.batchNumber}:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-black dark:text-white">
                          {result.hash!.slice(0, 6)}...{result.hash!.slice(-4)}
                        </span>
                        <a
                          href={`https://basescan.org/tx/${result.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#5638a1] hover:underline"
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <button
              onClick={async () => {
                try {
                  const { sdk } = await import('@farcaster/miniapp-sdk')
                  const successfulResults = results.filter(r => r.success)
                  const totalRecipients = successfulResults.reduce((sum, r) => sum + r.recipients.length, 0)
                  
                  const result = await sdk.actions.composeCast({
                    text: `🎯 Just sent crypto to ${totalRecipients} people across ${successfulResults.length} batch${successfulResults.length > 1 ? 'es' : ''}! Who needs individual transactions when you can batch send? 😎\n\nTry FarSender for your next multi-send! 🚀\n\n#FarSender #MultiSend #BatchSend`,
                    embeds: [window.location.href],
                  });

                  if (result?.cast) {
                    console.log("Cast posted successfully:", result.cast.hash);
                  }
                } catch (error) {
                  console.error("Failed to compose cast:", error);
                }
              }}
              className="w-full bg-[#5638a1] dark:bg-[#5638a1] text-white py-2 px-3 rounded-lg hover:bg-[#5638a1]/90 dark:hover:bg-[#5638a1]/90 transition-colors flex items-center justify-center space-x-2 text-xs"
            >
              <Share2 className="w-3 h-3" />
              <span>Share to Cast</span>
            </button>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  )
}
