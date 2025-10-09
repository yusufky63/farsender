'use client'
import { useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'

export function EnforceBaseChain() {
  const { isConnected, chain } = useAccount()
  const { switchChain } = useSwitchChain()

  useEffect(() => {
    if (!isConnected) return
    if (chain?.id !== base.id) {
      try {
        switchChain({ chainId: base.id })
      } catch (e) {
        // silent; some wallets may not support programmatic switching without prompt
      }
    }
  }, [isConnected, chain?.id, switchChain])

  return null
}

