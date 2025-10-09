// Neynar API integration for Farcaster user lookup
export interface NeynarUser {
  fid: number
  username: string
  display_name: string
  custody_address: string
  pfp_url: string
  profile?: {
    bio?: {
      text?: string
    }
  }
  verified_addresses: {
    eth_addresses: string[]
    primary: {
      eth_address: string
    }
  }
  follower_count: number
  following_count: number
}

export interface NeynarSearchResponse {
  result: {
    users: NeynarUser[]
    next?: {
      cursor: string
    }
  }
}

// Removed NeynarBulkResponse as bulk-by-username endpoint doesn't exist

export class NeynarAPI {
  private apiKey: string
  private baseUrl = 'https://api.neynar.com/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  // Cache for 5 minutes
  private cache = new Map<string, { data: any, timestamp: number }>()
  private CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  private getCacheKey(query: string): string {
    return `neynar-${query.toLowerCase()}`
  }

  private getCachedData(query: string): any | null {
    const key = this.getCacheKey(query)
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached Neynar data for', key)
      return cached.data
    }
    
    return null
  }

  private setCachedData(query: string, data: any): void {
    const key = this.getCacheKey(query)
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    console.log('💾 Cached Neynar data for', key)
  }

  // Search for Farcaster users by username (using free tier endpoint)
  async searchUsers(query: string, limit = 5): Promise<NeynarUser[]> {
    try {
      // Check cache first
      const cachedData = this.getCachedData(`search-${query}`)
      if (cachedData) {
        return cachedData
      }

      // Use the free tier endpoint for user search
      const url = `${this.baseUrl}/farcaster/user/search`
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      })

      console.log('🌐 Neynar API Request (Free Tier):', { url, query })

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      })

      console.log('📡 Neynar API Response Status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Neynar API Error Response:', errorText)
        
        // Check if it's a rate limit or plan limitation error
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (response.status === 403) {
          throw new Error('API key does not have permission for this endpoint. Please check your plan.')
        }
        
        throw new Error(`Neynar API error! status: ${response.status}, message: ${errorText}`)
      }

      const data: NeynarSearchResponse = await response.json()
      const users = data.result.users

      // Cache the results
      this.setCachedData(`search-${query}`, users)
      
      return users
    } catch (error) {
      console.error('❌ Failed to search users from Neynar:', error)
      throw error
    }
  }

  // Get user by exact username (using search endpoint)
  async getUserByUsername(username: string): Promise<NeynarUser | null> {
    try {
      // Check cache first
      const cachedData = this.getCachedData(`user-${username}`)
      if (cachedData) {
        return cachedData
      }

      // Use search endpoint - this is the correct endpoint for username lookup
      const url = `${this.baseUrl}/farcaster/user/search`
      const params = new URLSearchParams({
        q: username,
        limit: '5' // Get a few results to find exact match
      })
      
      console.log('🌐 Neynar API Request for user:', { url, username })

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Neynar API Error Response:', errorText)
        
        // Check for specific error types
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (response.status === 402) {
          throw new Error('This feature requires a paid plan. Please upgrade your Neynar plan.')
        } else if (response.status === 403) {
          throw new Error('API key does not have permission for this endpoint. Please check your plan.')
        }
        
        throw new Error(`Neynar API error! status: ${response.status}, message: ${errorText}`)
      }

      const data: NeynarSearchResponse = await response.json()
      
      // Find the exact username match (case insensitive)
      const user = data.result.users.find(u => u.username.toLowerCase() === username.toLowerCase())

      if (!user) {
        return null
      }

      // Cache the result
      this.setCachedData(`user-${username}`, user)
      
      return user
    } catch (error) {
      console.error('❌ Failed to get user from Neynar:', error)
      throw error
    }
  }

  // Get multiple users by usernames (using search endpoint for each)
  async getUsersByUsernames(usernames: string[]): Promise<NeynarUser[]> {
    try {
      // Since bulk-by-username doesn't exist, we'll search for each username
      // This is still efficient with caching
      const users: NeynarUser[] = []
      
      for (const username of usernames) {
        try {
          const user = await this.getUserByUsername(username)
          if (user) {
            users.push(user)
          }
        } catch (error) {
          console.warn(`Failed to get user ${username}:`, error)
          // Continue with other usernames even if one fails
        }
      }
      
      return users
    } catch (error) {
      console.error('❌ Failed to get users from Neynar:', error)
      throw error
    }
  }
}

// Usage example:
/*
const neynar = new NeynarAPI(process.env.NEXT_PUBLIC_NEYNAR_API_KEY!)
const users = await neynar.searchUsers('vitalik')
const user = await neynar.getUserByUsername('vitalik')
*/
