'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

import { buttonClasses } from '@/components/ui/button'
import { envClient } from '@/lib/env/env.client'
import { rainbowConfig } from '@/lib/wallet/rainbow'

export function RainbowWalletConnect() {
  if (!envClient.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || !rainbowConfig) {
    return (
      <button
        type='button'
        className={buttonClasses({ variant: 'outline', size: 'sm' })}
        disabled
      >
        WalletConnect missing
      </button>
    )
  }

  return (
    <ConnectButton
      accountStatus='address'
      chainStatus='icon'
      showBalance={false}
    />
  )
}
