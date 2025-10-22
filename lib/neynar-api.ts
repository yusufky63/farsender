/**
 * Neynar API wrapper for Farcaster interactions
 */

export interface FarcasterUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  verified_addresses?: {
    eth_addresses?: string[]
    primary?: {
      eth_address?: string
    }
  }
  verifications?: string[]
  follower_count?: number
  following_count?: number
  power_badge?: boolean
}

export interface CastReaction {
  reaction_type: 'like' | 'recast'
  user: FarcasterUser
}

export interface Cast {
  hash: string
  author: FarcasterUser
  text: string
  reactions: {
    likes_count: number
    recasts_count: number
  }
}

export interface FarcasterImportResult {
  users: Array<{
    address: string
    name: string
    username: string
    fid: number
    pfpUrl?: string
  }>
  totalFound: number
  withWallets: number
}

export class NeynarAPI {
  private async request(action: string, params?: Record<string, any>) {
    const response = await fetch('/api/neynar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        ...params
      })
    })

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Extract cast hash from Farcaster URL
   */
  extractCastHashFromUrl(url: string): string | null {
    // Farcaster URL formats:
    // https://farcaster.xyz/v/0x12345678
    // https://warpcast.com/username/0x12345678
    // https://warpcast.com/~/conversations/0x12345678
    
    // Extract hash from any of these formats
    const match = url.match(/0x([a-fA-F0-9]{8,})/)
    if (match) {
      const shortHash = `0x${match[1]}`
      
      // If it's already a full hash (40+ chars), return it
      if (match[1].length >= 40) {
        return shortHash
      }
      
      // If it's a short hash (8 chars), we need to get the full hash from the cast
      // For now, return the short hash and we'll expand it in getCast
      return shortHash
    }
    
    return null
  }

  /**
   * Get cast by hash or URL
   */
  async getCast(hashOrUrl: string): Promise<Cast> {
    // If it's a full URL, use URL type, otherwise use hash type
    if (hashOrUrl.includes('farcaster.xyz') || hashOrUrl.includes('warpcast.com')) {
      const response = await this.request('getCast', { 
        identifier: hashOrUrl,
        type: 'url'
      })
      return response.cast
    } else {
      const response = await this.request('getCast', { 
        identifier: hashOrUrl,
        type: 'hash'
      })
      return response.cast
    }
  }

  /**
   * Get reactions for a cast with pagination
   */
  async getCastReactions(hash: string, reactionType?: 'like' | 'recast'): Promise<CastReaction[]> {
    try {
      const allReactions: CastReaction[] = []
      let cursor: string | undefined = undefined
      let hasMore = true
      let requestCount = 0
      const maxRequests = 30 // Limit to prevent infinite loops (30 * 100 = 3000 max reactions)

      while (hasMore && requestCount < maxRequests) {
        const params: any = {
          hash: hash,
          types: reactionType === 'recast' ? 'recasts' : 'likes',
          limit: 100 // Max limit per request (API limit)
        }

        if (cursor) {
          params.cursor = cursor
        }

        console.log(`Fetching reactions page ${requestCount + 1}, cursor: ${cursor}`)
        console.log('Request params:', params)
        
        const response = await this.request('getCastReactions', params)
        
        console.log('API Response structure:', {
          hasReactions: !!response.reactions,
          reactionsCount: response.reactions?.length || 0,
          hasNext: !!response.next,
          nextCursor: response.next?.cursor,
          fullResponse: response
        })
        
        const reactions = response.reactions || []
        allReactions.push(...reactions)
        
        // Check if there's more data
        cursor = response.next?.cursor
        hasMore = !!cursor && reactions.length > 0
        requestCount++
        
        console.log(`Got ${reactions.length} reactions, total: ${allReactions.length}, hasMore: ${hasMore}, cursor: ${cursor}`)
        
        // Small delay between requests to be nice to the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`Total reactions fetched: ${allReactions.length}`)
      return allReactions
    } catch (error) {
      console.error('Reactions endpoint failed:', error)
      return []
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<FarcasterUser | null> {
    try {
      const response = await this.request('getUserByUsername', {
        username: username
      })
      return response.user || null
    } catch (error) {
      console.error('User lookup failed:', error)
      return null
    }
  }

  /**
   * Get conversation (comments) for a cast with pagination
   */
  async getCastConversation(hash: string): Promise<Cast[]> {
    try {
      const allComments: Cast[] = []
      let cursor: string | undefined = undefined
      let hasMore = true
      let requestCount = 0
      const maxRequests = 30 // Limit for comments (30 * 50 = 1500 max comments)

      while (hasMore && requestCount < maxRequests) {
        const params: any = {
          identifier: hash,
          type: 'hash',
          reply_depth: 1,
          include_chronological_parent_casts: false,
          limit: 50
        }

        if (cursor) {
          params.cursor = cursor
        }

        console.log(`Fetching comments page ${requestCount + 1}, cursor: ${cursor}`)
        
        const response = await this.request('getCastConversation', params)
        
        const comments = response.conversation?.cast?.direct_replies || []
        allComments.push(...comments)
        
        // Check if there's more data
        cursor = response.next?.cursor
        hasMore = !!cursor && comments.length > 0
        requestCount++
        
        console.log(`Got ${comments.length} comments, total: ${allComments.length}, hasMore: ${hasMore}`)
        
        // Small delay between requests
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`Total comments fetched: ${allComments.length}`)
      return allComments
    } catch (error) {
      console.error('Conversation endpoint failed:', error)
      return []
    }
  }


  /**
   * Import users from Farcaster cast interactions
   */
  async importFromCast(
    url: string, 
    options: {
      includeLikes?: boolean
      includeRecasts?: boolean  
      includeComments?: boolean
    } = {}
  ): Promise<FarcasterImportResult> {
    const { includeLikes = true, includeRecasts = true, includeComments = true } = options
    
    // Extract cast hash from URL (optional, we'll try URL method first)
    const castHash = this.extractCastHashFromUrl(url)

    const allUsers = new Map<number, FarcasterUser>() // Use Map to avoid duplicates by FID

    try {
      console.log('Processing URL:', url)
      
      // Try to get the cast using the full URL first
      let cast
      let fullHash
      
      try {
        // First try with the full URL
        cast = await this.getCast(url)
        fullHash = cast.hash
        console.log('Got cast from URL, full hash:', fullHash)
      } catch (urlError) {
        console.log('URL method failed, trying with extracted hash...')
        
        // If URL method fails, try with extracted hash
        if (!castHash) {
          throw new Error('Could not extract hash from URL and URL method failed')
        }
        
        cast = await this.getCast(castHash)
        if (!cast) {
          throw new Error('Cast not found. Please check the URL.')
        }
        
        fullHash = cast.hash
        console.log('Got cast from hash, full hash:', fullHash)
      }

      // Get reactions (likes and recasts) - user data is already included
      if (includeLikes || includeRecasts) {
        const reactionTypes = []
        if (includeLikes) reactionTypes.push('likes')
        if (includeRecasts) reactionTypes.push('recasts')
        
        for (const type of reactionTypes) {
          const reactions = await this.getCastReactions(fullHash, type as 'like' | 'recast')
          reactions.forEach(reaction => {
            // User data is already included in the reaction, no need for additional API call
            allUsers.set(reaction.user.fid, reaction.user)
          })
        }
      }

      // Get comments - user data is already included
      if (includeComments) {
        const comments = await this.getCastConversation(fullHash)
        comments.forEach(comment => {
          // User data is already included in the comment author, no need for additional API call
          allUsers.set(comment.author.fid, comment.author)
        })
      }

      const usersArray = Array.from(allUsers.values())
      console.log('Found users with full data:', usersArray.length)
      
      if (usersArray.length === 0) {
        return {
          users: [],
          totalFound: 0,
          withWallets: 0
        }
      }

      // Filter users with wallet addresses and format result
      const usersWithWallets = usersArray
        .filter(user => user.verified_addresses?.eth_addresses && user.verified_addresses.eth_addresses.length > 0)
        .map(user => ({
          address: user.verified_addresses!.eth_addresses![0],
          name: user.display_name || user.username,
          username: user.username,
          fid: user.fid,
          pfpUrl: user.pfp_url
        }))

      return {
        users: usersWithWallets,
        totalFound: usersArray.length,
        withWallets: usersWithWallets.length
      }

    } catch (error) {
      console.error('Error importing from Farcaster:', error)
      throw new Error(`Failed to import from Farcaster: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Singleton instance
let neynarInstance: NeynarAPI | null = null

export function getNeynarAPI(): NeynarAPI {
  if (!neynarInstance) {
    neynarInstance = new NeynarAPI()
  }
  return neynarInstance
}