'use client'
import { useAccount } from 'wagmi'
import { Card } from '@/components/ui/Card'
import { WalletConnection } from '@/components/WalletConnection'
import { ChainSelector } from '@/components/ChainSelector'
import { formatAddress } from '@/lib/validation'

export function WalletStatusCard() {
  const { isConnected, address } = useAccount()

  return (
    <Card>
      <div className="flex items-center justify-between">
        {/* Wallet Connection */}
        <div className="flex-1">
          <WalletConnection />
        </div>

        {/* Chain Selector - Only show when connected */}
        {isConnected && address && (
          <div className="flex-1 ml-4">
            <ChainSelector />
          </div>
        )}
      </div>
    </Card>
  )
}
