'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from 'wagmi'
import { getExplorerUrl, getChainName } from '@/lib/chains'
import { formatAmount } from '@/lib/validation'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  transactionHash: string
  chainId: number
  recipients: Array<{ address: string; amount: string }>
  tokenSymbol: string
  totalAmount: string
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  transactionHash, 
  chainId, 
  recipients, 
  tokenSymbol, 
  totalAmount 
}: SuccessModalProps) {
  const { address } = useAccount()
  const [isSharing, setIsSharing] = useState(false)

  if (!isOpen) return null

  const explorerUrl = getExplorerUrl(chainId, transactionHash)
  const chainName = getChainName(chainId)

  const handleShareToCast = async () => {
    setIsSharing(true)
    
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      
      const result = await sdk.actions.composeCast({
        text: `🎯 Just sent crypto to ${recipients.length} people in one go! Who needs individual transactions when you can batch send? 😎\n\nTry FarSender for your next multi-send! 🚀\n\n#FarSender #MultiSend #BatchSend`,
        embeds: [window.location.href],
      });

      if (result?.cast) {
        console.log("Cast posted successfully:", result.cast.hash);
      }
    } catch (error) {
      console.error("Failed to compose cast:", error);
      // Don't show error to user - this is expected for some users
    } finally {
      setIsSharing(false)
    }
  }

  return createPortal(
    <div 
      className="fixed inset-0 dark:backdrop-blur-none   backdrop-blur-sm flex items-center justify-center z-[9999] p-2"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="dark:bg-transparent bg-white backdrop-blur-xl rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto border dark:border-gray-800 border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white">Transaction Successful!</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Your multi-send is complete</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Transaction Summary */}
          <div className="dark:bg-transparent bg-white backdrop-blur-sm rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h4 className="text-xs font-medium text-black dark:text-white mb-2">Transaction Summary</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount Sent:</span>
                <span className="text-black dark:text-white font-medium">
                  {formatAmount(totalAmount, 4, tokenSymbol)} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
                <span className="text-black dark:text-white">{recipients.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Network:</span>
                <span className="text-black dark:text-white">{chainName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">From:</span>
                <span className="text-black dark:text-white font-mono text-xs">
                  {address?.slice(0, 4)}...{address?.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="dark:bg-transparent bg-white backdrop-blur-sm rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h4 className="text-xs font-medium text-black dark:text-white mb-2">Transaction Hash</h4>
            <div className="flex items-center space-x-2">
              <p className="font-mono text-xs text-black dark:text-white break-all flex-1">
                {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
              </p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5638a1] dark:text-[#5638a1] hover:underline text-xs"
                >
                  View →
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <button
            onClick={handleShareToCast}
            disabled={isSharing}
            className="w-full bg-[#5638a1] dark:bg-[#5638a1] text-white py-2 px-3 rounded-lg hover:bg-[#5638a1]/90 dark:hover:bg-[#5638a1]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-xs"
          >
            {isSharing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sharing...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>Share to Cast</span>
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
