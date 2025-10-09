import { NextRequest, NextResponse } from 'next/server'
import { AlchemyAPI } from '@/lib/alchemy-api'
import { getChainInfo } from '@/lib/chains'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const chainId = searchParams.get('chainId')

    if (!address || !chainId) {
      return NextResponse.json(
        { error: 'Address and chainId are required' },
        { status: 400 }
      )
    }

    const chainIdNum = parseInt(chainId)
    const chainInfo = getChainInfo(chainIdNum)
    if (!chainInfo) {
      return NextResponse.json(
        { error: 'Unsupported chain ID' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ALCHEMY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      )
    }

    const alchemy = new AlchemyAPI(apiKey, chainIdNum)
    const balance = await alchemy.getETHBalance(address)

    return NextResponse.json({
      balance
    })

  } catch (error) {
    console.error('Error fetching ETH balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ETH balance' },
      { status: 500 }
    )
  }
}
