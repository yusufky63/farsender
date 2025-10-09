'use client'
import { useCallback, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { isBaseEthDomain, formatBaseEthDomain } from '@/lib/validation'

export interface BaseEthUser {
  domain: string
  address: string
  displayName: string
}

export function useBaseEth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const resolveBaseEthDomain = useCallback(async (input: string): Promise<BaseEthUser | null> => {
    if (!isBaseEthDomain(input)) {
      return null
    }

    setIsLoading(true)
    setError('')

    try {
      const domain = formatBaseEthDomain(input)
      
      // Create a mainnet client for ENS resolution
      // Base.eth domains are actually ENS domains on Ethereum mainnet
      const mainnetClient = createPublicClient({
        chain: mainnet,
        transport: http()
      })
      
      // Resolve ENS domain to address
      const address = await mainnetClient.getEnsAddress({
        name: domain
      })

      if (!address) {
        setError('Base.eth domain not found')
        return null
      }

      return {
        domain,
        address,
        displayName: domain
      }
    } catch (err) {
      console.error('Base.eth resolution failed:', err)
      setError('Failed to resolve Base.eth domain')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    resolveBaseEthDomain,
    isLoading,
    error
  }
}
