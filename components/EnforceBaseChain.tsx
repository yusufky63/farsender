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
      // Some connectors (e.g., Farcaster MiniApp) may not support programmatic
      // chain switching or may not expose chain details. Avoid throwing here.
      Promise.resolve(switchChain({ chainId: base.id })).catch(() => {})
    }
  }, [isConnected, chain?.id, switchChain])

  return null
}
