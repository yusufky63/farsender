'use client'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi-config'
import { ThemeProvider } from '@/components/ThemeProvider'
import { EnforceBaseChain } from '@/components/EnforceBaseChain'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Farcaster Mini App SDK'sını yükle ve ready() çağır
    const loadSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        
        // Interface hazır olduğunda splash screen'i gizle
        // Farcaster docs'a göre ready() çağırmak splash screen'i kaldırır
        sdk.actions.ready()
        
        console.log('✅ Farcaster SDK loaded and ready() called')
        
        // Kullanıcıdan mini app'i eklemesini iste
        try {
          await sdk.actions.addMiniApp()
          console.log('✅ User added the mini app to their apps')
        } catch (addError: any) {
          if (addError.name === 'RejectedByUser') {
            console.log('ℹ️ User rejected adding the mini app')
          } else if (addError.name === 'InvalidDomainManifestJson') {
            console.error('❌ Domain mismatch or invalid manifest:', addError.message)
            console.log('💡 Make sure your domain matches the one in farcaster.json')
          } else {
            console.error('❌ Error adding mini app:', addError)
          }
        }
        
      } catch (error) {
        console.error('❌ Farcaster SDK yüklenemedi:', error)
      }
    }

    loadSDK()
  }, [])

  return (
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <EnforceBaseChain />
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}
