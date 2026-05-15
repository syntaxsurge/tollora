import '../styles/globals.css'

import { Fraunces, Space_Grotesk } from 'next/font/google'

import type { Metadata, Viewport } from 'next'
import NextTopLoader from 'nextjs-toploader'

import { AppProviders } from '@/components/providers/app-providers'
import { siteConfig } from '@/lib/config/site'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
})

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    type: 'website'
  }
}

export const viewport: Viewport = {
  themeColor: '#f7f4ee'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang='en'
      className={`${spaceGrotesk.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body className='bg-background text-foreground min-h-screen antialiased'>
        <NextTopLoader
          color='#14b8a6'
          height={3}
          showSpinner={false}
          shadow='0 0 16px rgba(20, 184, 166, 0.45)'
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
