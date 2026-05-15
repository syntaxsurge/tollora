'use client'

import dynamic from 'next/dynamic'
import * as React from 'react'

import { useWalletRuntimeReady } from '@/components/providers/wallet-provider'
import { buttonClasses } from '@/components/ui/button'
import { walletProvider } from '@/lib/config/wallet'

const RainbowWalletConnect = dynamic(
  () =>
    import('@/components/ui/rainbow-wallet-connect').then(
      mod => mod.RainbowWalletConnect
    ),
  { ssr: false, loading: () => <WalletCheckingButton /> }
)

const ThirdwebWalletConnect = dynamic(
  () =>
    import('@/components/ui/thirdweb-wallet-connect').then(
      mod => mod.ThirdwebWalletConnect
    ),
  { ssr: false, loading: () => <WalletCheckingButton /> }
)

function WalletCheckingButton({
  className,
  variant = 'outline'
}: {
  className?: string
  variant?: 'primary' | 'outline' | 'ghost'
}) {
  return (
    <button
      type='button'
      className={buttonClasses({
        variant,
        size: 'sm',
        className: `min-w-32 gap-2 ${className ?? ''}`
      })}
      disabled
    >
      <span className='border-foreground/30 border-t-foreground h-3.5 w-3.5 animate-spin rounded-full border-2' />
      Checking
    </button>
  )
}

export function WalletConnectButton({
  className,
  variant = 'outline'
}: {
  className?: string
  variant?: 'primary' | 'outline' | 'ghost'
}) {
  const [mounted, setMounted] = React.useState(false)
  const walletRuntimeReady = useWalletRuntimeReady()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !walletRuntimeReady) {
    return <WalletCheckingButton className={className} variant={variant} />
  }

  if (walletProvider === 'rainbow-kit') {
    return <RainbowWalletConnect />
  }

  return <ThirdwebWalletConnect />
}
