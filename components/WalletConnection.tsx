'use client'
import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { base } from 'wagmi/chains'
import { Button } from '@/components/ui/Button'
import { formatAddress } from '@/lib/validation'
import { SUPPORTED_CHAINS } from '@/lib/chains'

export function WalletConnection() {
  const { isConnected, address, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
    } catch {}
  }

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  if (isConnected && address) {
    const currentChain = SUPPORTED_CHAINS.find(c => c.id === chain?.id) || SUPPORTED_CHAINS[0]
    
    return (
      <div className="flex items-center">
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
      </div>
    )
  }

  return (
    <Button
      onClick={() => connect({ connector: connectors[0], chainId: base.id })}
      disabled={connectors.length === 0}
      size="sm"
      className="px-3 py-1.5 text-xs rounded-full"
    >
      {connectors.length === 0 ? 'No connector' : 'Connect Wallet'}
    </Button>
  )
}
