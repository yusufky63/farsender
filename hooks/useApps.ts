'use client'
import { useState, useEffect } from 'react'

export interface App {
  id: string
  name: string
  description: string
  icon: string
  url: string
}

export function useApps() {
  const [apps, setApps] = useState<App[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/apps.json')
        if (!response.ok) {
          throw new Error(`Failed to fetch apps: ${response.status}`)
        }
        
        const appsData: App[] = await response.json()
        setApps(appsData)
      } catch (err) {
        console.error('Failed to load apps:', err)
        setError(err instanceof Error ? err.message : 'Failed to load apps')
        
        // Fallback to empty array if JSON fails
        setApps([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchApps()
  }, [])

  return {
    apps,
    isLoading,
    error,
    refetch: () => {
      setApps([])
      setIsLoading(true)
      setError(null)
    }
  }
}
