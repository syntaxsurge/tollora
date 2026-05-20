'use client'

import * as React from 'react'

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
  React.useEffect(() => {
    if (isConnected) {
      void syncWalletSession(true, address)
      return
    }

    if (isChecking) {
      return
    }

    const timeout = window.setTimeout(() => {
      void syncWalletSession(false, address)
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
