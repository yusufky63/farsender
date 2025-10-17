'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { base } from 'wagmi/chains'
import { Button } from '@/components/ui/Button'
import { formatAddress } from '@/lib/validation'
import { SUPPORTED_CHAINS } from '@/lib/chains'

export function WalletConnection() {
  const { isConnected, address, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  const handleCopy = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
    } catch {}
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  // Helper function to get wallet info
  const getWalletInfo = (connector: any) => {
    const name = connector.name.toLowerCase()
    
    if (name.includes('farcaster') || name.includes('mini app')) {
      return {
        name: 'Farcaster',
        icon: '/assets/farcaster-icon.svg',
        description: 'Connect via Farcaster'
      }
    } else if (name.includes('metamask')) {
      return {
        name: 'MetaMask',
        icon: '/assets/metamask-icon.svg',
        description: 'Connect via MetaMask'
      }
    } else if (name.includes('coinbase')) {
      return {
        name: 'Coinbase Wallet',
        icon: '/assets/coinbase-icon.svg',
        description: 'Connect via Coinbase Wallet'
      }
    } else if (name.includes('injected')) {
      return {
        name: 'Browser Wallet',
        icon: '/assets/wallet-icon.svg',
        description: 'Connect via browser wallet'
      }
    }
    
    return {
      name: connector.name,
      icon: '/assets/wallet-icon.svg',
      description: `Connect via ${connector.name}`
    }
  }

  const handleWalletConnect = async (connector: any) => {
    try {
      await connect({ connector, chainId: base.id })
      setShowWalletModal(false)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  if (isConnected && address) {
    const currentChain = SUPPORTED_CHAINS.find(c => c.id === chain?.id) || SUPPORTED_CHAINS[0]
    
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy address'}
          className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 px-3 py-1.5 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
            {currentChain?.name || 'Base'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
          <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
            {formatAddress(address)}
          </span>
        </button>
        
        <button
          onClick={() => disconnect()}
          title="Disconnect wallet"
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-colors"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <>
      <Button
        onClick={() => setShowWalletModal(true)}
        disabled={connectors.length === 0}
        size="sm"
        className="px-3 py-1.5 text-xs rounded-full"
      >
        {connectors.length === 0 ? 'No connector' : 'Connect Wallet'}
      </Button>

      {/* Wallet Selection Modal - Portal */}
      {mounted && showWalletModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-transparent rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Connect Wallet
                </h2>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto max-h-[50vh] space-y-2">
                {connectors.map((connector) => {
                  const walletInfo = getWalletInfo(connector)
                  
                  return (
                    <button
                      key={connector.uid}
                      onClick={() => handleWalletConnect(connector)}
                      className="w-full p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-[#5638a1] dark:hover:border-[#5638a1] transition-colors bg-white dark:bg-transparent text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                            {walletInfo.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {walletInfo.description}
                          </p>
                        </div>
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          className="text-gray-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>

              {connectors.length === 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    No wallet connectors available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
