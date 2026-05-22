import { NextRequest, NextResponse } from 'next/server'
import { isAddress } from 'viem'
import { DuneAPI } from '@/lib/dune-api'
import { getChainInfo } from '@/lib/chains'

type DuneAction = 'getAllTokens' | 'getTokenInfo'

function getDuneClient() {
  const apiKey = process.env.DUNE_API_KEY
  if (!apiKey) {
    throw new Error('DUNE_API_KEY is not configured')
  }
  return new DuneAPI(apiKey)
}

function parseChainId(value: unknown): number | null {
  const chainId = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(chainId) || !getChainInfo(chainId)) {
    return null
  }
  return chainId
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body?.action as DuneAction | undefined
    const chainId = parseChainId(body?.chainId)

    if (!chainId) {
      return NextResponse.json({ error: 'Unsupported chain ID' }, { status: 400 })
    }

    const dune = getDuneClient()

    if (action === 'getAllTokens') {
      const address = String(body?.address || '')
      if (!isAddress(address)) {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
      }

      const tokens = await dune.getAllTokens(address, chainId)
      return NextResponse.json({ tokens })
    }

    if (action === 'getTokenInfo') {
      const tokenAddress = String(body?.tokenAddress || '')
      const userAddress = String(body?.userAddress || '')

      if (!isAddress(tokenAddress) || !isAddress(userAddress)) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
      }

      const token = await dune.getTokenInfo(tokenAddress, userAddress, chainId)
      return NextResponse.json({ token })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Dune API route error:', error)
    return NextResponse.json({ error: 'Failed to fetch token data' }, { status: 500 })
  }
}
