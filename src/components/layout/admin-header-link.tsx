'use client'

import Link from 'next/link'
import * as React from 'react'

import { ShieldCheck } from 'lucide-react'

import { useWalletRuntimeReady } from '@/components/providers/wallet-provider'
import { buttonClasses } from '@/components/ui/button'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'

export function AdminHeaderLink() {
  const walletRuntimeReady = useWalletRuntimeReady()

  if (!walletRuntimeReady) {
    return null
  }

  return (
    <WalletAddressConsumer>
      {({ address }) => <AdminHeaderLinkContent walletAddress={address} />}
    </WalletAddressConsumer>
  )
}

function AdminHeaderLinkContent({
  walletAddress
}: {
  walletAddress: string | null
}) {
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [isChecking, setIsChecking] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true

    setIsAdmin(false)

    if (!walletAddress) {
      setIsChecking(false)
      return
    }

    setIsChecking(true)

    fetch(
      `/api/admin/access?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        cache: 'no-store'
      }
    )
      .then(async response => {
        if (!isMounted) {
          return
        }

        const body = (await response.json().catch(() => null)) as {
          isAdmin?: boolean
        } | null

        setIsAdmin(Boolean(response.ok && body?.isAdmin))
      })
      .catch(() => {
        if (isMounted) {
          setIsAdmin(false)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsChecking(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [walletAddress])

  if (isChecking || !isAdmin) {
    return null
  }

  return (
    <Link
      href='/admin'
      className={buttonClasses({
        variant: 'outline',
        size: 'sm',
        className: 'gap-2 whitespace-nowrap'
      })}
    >
      <ShieldCheck className='h-4 w-4' aria-hidden />
      <span className='hidden sm:inline'>Admin panel</span>
    </Link>
  )
}
