'use client'

import { AppThemeProvider } from '@/components/providers/theme-provider'
import { WalletProvider } from '@/components/providers/wallet-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      <WalletProvider>{children}</WalletProvider>
    </AppThemeProvider>
  )
}
