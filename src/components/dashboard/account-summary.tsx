'use client'

import { Mail, UserRound, WalletCards } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'
import { useUserSettings } from '@/hooks/use-user-settings'
import { userDisplayName } from '@/lib/settings/user-settings'

export function AccountSummary() {
  return (
    <WalletAddressConsumer>
      {({ address }) => <AccountSummaryContent address={address} />}
    </WalletAddressConsumer>
  )
}

function AccountSummaryContent({ address }: { address: string | null }) {
  const { settings } = useUserSettings(address)

  return (
    <Card className='space-y-5'>
      <div>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Account
        </p>
        <h2 className='font-display mt-2 text-2xl'>Connected user</h2>
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='bg-muted rounded-lg p-4'>
          <UserRound className='text-accent h-5 w-5' aria-hidden />
          <p className='text-foreground/60 mt-4 text-xs tracking-[0.16em] uppercase'>
            Name
          </p>
          <p className='mt-2 text-sm font-semibold'>
            {userDisplayName(settings)}
          </p>
        </div>
        <div className='bg-muted rounded-lg p-4'>
          <WalletCards className='text-accent h-5 w-5' aria-hidden />
          <p className='text-foreground/60 mt-4 text-xs tracking-[0.16em] uppercase'>
            Wallet
          </p>
          <p className='mt-2 text-sm font-semibold break-all'>
            {address ?? 'Resolving wallet'}
          </p>
        </div>
        <div className='bg-muted rounded-lg p-4'>
          <Mail className='text-accent h-5 w-5' aria-hidden />
          <p className='text-foreground/60 mt-4 text-xs tracking-[0.16em] uppercase'>
            Email
          </p>
          <p className='mt-2 text-sm font-semibold capitalize'>
            {settings.email || 'Not provided'}
          </p>
        </div>
        <div className='bg-muted rounded-lg p-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Plan
          </p>
          <p className='mt-2 text-sm font-semibold capitalize'>
            {settings.plan}
          </p>
        </div>
      </div>
    </Card>
  )
}
