import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }

    const baseUrl = 'https://api.neynar.com'
    
    switch (action) {
      case 'getCast': {
        const { identifier, type } = params
        const response = await fetch(`${baseUrl}/v2/farcaster/cast?identifier=${encodeURIComponent(identifier)}&type=${type}`, {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        return NextResponse.json(data)
      }

      case 'getCastReactions': {
        const { hash, types, limit = 100, cursor } = params
        const url = new URL(`${baseUrl}/v2/farcaster/reactions/cast`)
        url.searchParams.append('hash', hash)
        url.searchParams.append('types', types)
        url.searchParams.append('limit', limit.toString())
        if (cursor) url.searchParams.append('cursor', cursor)

        const response = await fetch(url.toString(), {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        return NextResponse.json(data)
      }

      case 'getCastConversation': {
        const { identifier, type, reply_depth = 1, include_chronological_parent_casts = false, limit = 50, cursor } = params
        const url = new URL(`${baseUrl}/v2/farcaster/cast/conversation`)
        url.searchParams.append('identifier', identifier)
        url.searchParams.append('type', type)
        url.searchParams.append('reply_depth', reply_depth.toString())
        url.searchParams.append('include_chronological_parent_casts', include_chronological_parent_casts.toString())
        url.searchParams.append('limit', limit.toString())
        if (cursor) url.searchParams.append('cursor', cursor)

        const response = await fetch(url.toString(), {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        return NextResponse.json(data)
      }

      case 'getUserByUsername': {
        const { username } = params
        const response = await fetch(`${baseUrl}/v2/farcaster/user/by_username?username=${encodeURIComponent(username)}`, {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Neynar API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
