'use client'

import { usePathname } from 'next/navigation'
import * as React from 'react'

import { useRouter } from 'nextjs-toploader/app'
import {
  useActiveAccount,
  useActiveWalletConnectionStatus
} from 'thirdweb/react'
import { useAccount } from 'wagmi'

import { walletProvider } from '@/lib/config/wallet'
import {
  clearUserSettings,
  UserSettings,
  writeUserSettings
} from '@/lib/settings/user-settings'

type AuthSessionResponse = {
  settings?: UserSettings | null
}

async function syncWalletSession(isConnected: boolean, address?: string) {
  if (isConnected && address) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress: address
      })
    })
    const body = (await response
      .json()
      .catch(() => null)) as AuthSessionResponse | null

    if (response.ok && body?.settings) {
      writeUserSettings(body.settings, address)
    }

    return
  }

  await fetch('/api/auth', {
    method: 'DELETE'
  }).catch(() => undefined)
  clearUserSettings(address)
}

function useWalletSessionCookie(
  isConnected: boolean,
  isChecking = false,
  address?: string
) {
  const pathname = usePathname()
  const router = useRouter()
  const redirectedWalletRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (isConnected) {
      if (!address) {
        return
      }

      void syncWalletSession(true, address).then(() => {
        const walletAddress = address?.toLowerCase()

        if (
          walletAddress &&
          redirectedWalletRef.current !== walletAddress &&
          shouldRedirectAfterWalletConnect(pathname)
        ) {
          redirectedWalletRef.current = walletAddress
          router.push('/dashboard')
        }
      })
      return
    }

    if (isChecking) {
      return
    }

    const timeout = window.setTimeout(() => {
      redirectedWalletRef.current = null
      void syncWalletSession(false, address)
    }, 600)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [address, isChecking, isConnected, pathname, router])
}

function shouldRedirectAfterWalletConnect(pathname: string) {
  return ![
    '/dashboard',
    '/agents',
    '/marketplace',
    '/orders',
    '/receipts',
    '/provider',
    '/profile',
    '/billing',
    '/settings',
    '/admin'
  ].some(path => pathname === path || pathname.startsWith(`${path}/`))
}

function RainbowKitWalletSessionBridge() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()

  useWalletSessionCookie(isConnected, isConnecting || isReconnecting, address)

  return null
}

function ThirdwebWalletSessionBridge() {
  const activeAccount = useActiveAccount()
  const connectionStatus = useActiveWalletConnectionStatus()

  useWalletSessionCookie(
    Boolean(activeAccount?.address),
    connectionStatus === 'connecting' || connectionStatus === 'unknown',
    activeAccount?.address
  )

  return null
}

export function WalletSessionBridge() {
  if (walletProvider === 'rainbow-kit') {
    return <RainbowKitWalletSessionBridge />
  }

  return <ThirdwebWalletSessionBridge />
}
