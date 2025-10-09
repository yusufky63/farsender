'use client'
import { useEffect, useState } from 'react'

export function useMiniApp() {
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        // const { sdk } = await import('@farcaster/miniapp-sdk')
        // const inMiniApp = await sdk.isInMiniApp()
        
        // Placeholder - assume we're in mini app for development
        const inMiniApp = true
        setIsInMiniApp(inMiniApp)
      } catch (error) {
        console.error('Mini App kontrolü başarısız:', error)
        setIsInMiniApp(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkMiniApp()
  }, [])

  return { isInMiniApp, isLoading }
}
