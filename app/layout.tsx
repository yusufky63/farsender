import type { Metadata } from "next"
import './globals.css'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AppProviders } from '@/components/AppProviders'

// Farcaster Mini App metadata - farcaster.json ile tamamen aynı
const miniapp = {
  name: "FarSender",
  version: "1",
  description: "Send ETH and tokens to multiple addresses easily and securely.",
  homeUrl: "https://farsender.vercel.app/",
  heroImageUrl: "https://farsender.vercel.app/hero.png",
  splashImageUrl: "https://farsender.vercel.app/splash.png",
  splashBackgroundColor: "#5638a1"
}

export const metadata: Metadata = {
  title: miniapp.name,
  description: miniapp.description,
  other: {
    "fc:miniapp": JSON.stringify({
      version: miniapp.version,
      imageUrl: miniapp.heroImageUrl,
      button: {
        title: `Open ${miniapp.name}`,
        action: {
          type: "launch_frame",
          name: miniapp.name,
          url: miniapp.homeUrl,
          splashImageUrl: miniapp.splashImageUrl,
          splashBackgroundColor: miniapp.splashBackgroundColor
        },
      },
    }),
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen antialiased`}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}