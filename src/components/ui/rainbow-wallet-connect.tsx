'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

import { buttonClasses } from '@/components/ui/button'
import { envClient } from '@/lib/env/env.client'
import { cn } from '@/lib/utils/cn'
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
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        if (!connected) {
          return (
            <button
              type='button'
              className={cn(
                buttonClasses({ variant: 'outline', size: 'sm' }),
                'brand-flame-gradient min-w-[11rem] whitespace-nowrap px-5 text-slate-950 shadow-sm shadow-brand-orange/25 hover:shadow-md hover:shadow-brand-orange/35'
              )}
              onClick={openConnectModal}
            >
              Connect Wallet
            </button>
          )
        }

        if (chain.unsupported) {
          return (
            <button
              type='button'
              className={cn(
                buttonClasses({ variant: 'outline', size: 'sm' }),
                'brand-flame-gradient min-w-[11rem] whitespace-nowrap px-5 text-slate-950 shadow-sm shadow-brand-orange/25'
              )}
              onClick={openChainModal}
            >
              Switch Network
            </button>
          )
        }

        return (
          <button
            type='button'
            className={cn(
              buttonClasses({ variant: 'outline', size: 'sm' }),
              'max-w-[12rem] whitespace-nowrap'
            )}
            onClick={openAccountModal}
          >
            {account.displayName}
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}
