'use client'

import * as React from 'react'

import {
  useActiveAccount,
  useActiveWalletConnectionStatus
} from 'thirdweb/react'
import { useAccount } from 'wagmi'

import {
  WALLET_ADDRESS_COOKIE,
  WALLET_SESSION_COOKIE,
  WALLET_SESSION_COOKIE_VALUE,
  WALLET_SESSION_MAX_AGE_SECONDS
} from '@/lib/auth/wallet-session'
import { walletProvider } from '@/lib/config/wallet'

function setWalletSessionCookie(isConnected: boolean, address?: string) {
  if (typeof document === 'undefined') {
    return
  }

  if (isConnected) {
    document.cookie = `${WALLET_SESSION_COOKIE}=${WALLET_SESSION_COOKIE_VALUE}; Path=/; Max-Age=${WALLET_SESSION_MAX_AGE_SECONDS}; SameSite=Lax`

    if (address) {
      document.cookie = `${WALLET_ADDRESS_COOKIE}=${address.toLowerCase()}; Path=/; Max-Age=${WALLET_SESSION_MAX_AGE_SECONDS}; SameSite=Lax`
    }

    return
  }

  document.cookie = `${WALLET_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  document.cookie = `${WALLET_ADDRESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

function useWalletSessionCookie(
  isConnected: boolean,
  isChecking = false,
  address?: string
) {
  React.useEffect(() => {
    if (isConnected) {
      setWalletSessionCookie(true, address)
      return
    }

    if (isChecking) {
      return
    }

    const timeout = window.setTimeout(() => {
      setWalletSessionCookie(false)
    }, 600)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [address, isChecking, isConnected])
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
