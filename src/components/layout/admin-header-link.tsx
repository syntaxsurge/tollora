'use client'

import Link from 'next/link'

import { ShieldCheck } from 'lucide-react'

import { useWalletRuntimeReady } from '@/components/providers/wallet-provider'
import { buttonClasses } from '@/components/ui/button'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'
import { isAdminWalletAddress } from '@/lib/auth/admin'

export function AdminHeaderLink() {
  const walletRuntimeReady = useWalletRuntimeReady()

  if (!walletRuntimeReady) {
    return null
  }

  return (
    <WalletAddressConsumer>
      {({ address }) =>
        isAdminWalletAddress(address) ? (
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
        ) : null
      }
    </WalletAddressConsumer>
  )
}
