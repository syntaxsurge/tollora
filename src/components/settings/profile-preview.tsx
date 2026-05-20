'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'
import {
  UserSettings,
  defaultUserSettings,
  readUserSettings,
  userDisplayName,
  userInitials
} from '@/lib/settings/user-settings'

export function ProfilePreview() {
  return (
    <WalletAddressConsumer>
      {wallet => <ProfilePreviewContent walletAddress={wallet.address} />}
    </WalletAddressConsumer>
  )
}

function ProfilePreviewContent({
  walletAddress
}: {
  walletAddress: string | null
}) {
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setSettings(readUserSettings(walletAddress))
    setIsReady(true)
  }, [walletAddress])

  if (!isReady) {
    return <div className='skeleton h-80 rounded-lg' />
  }

  const displayName = userDisplayName(settings)
  const username = settings.username ? `@${settings.username}` : '@builder'

  return (
    <div className='grid gap-5 lg:grid-cols-[0.9fr_1.1fr]'>
      <Card className='bg-panel-sheen space-y-6'>
        <div className='bg-foreground text-background flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-semibold'>
          {userInitials(settings) || 'NB'}
        </div>
        <div>
          <Badge>{settings.publicProfile ? 'Public' : 'Private'}</Badge>
          <h2 className='font-display mt-4 text-3xl'>{displayName}</h2>
          <p className='text-foreground/65 mt-1 text-sm'>{username}</p>
        </div>
        <div className='space-y-3 text-sm'>
          <ProfileLine label='Email' value={settings.email || 'Not provided'} />
          <ProfileLine label='Plan' value={settings.plan} />
        </div>
        <Link
          href='/settings'
          className={buttonClasses({ variant: 'outline', className: 'w-full' })}
        >
          Edit profile
        </Link>
      </Card>

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Workspace preferences
          </p>
          <h2 className='font-display mt-2 text-2xl'>Account snapshot</h2>
        </div>
        <div className='grid gap-3 sm:grid-cols-2'>
          <Metric label='Timezone' value={settings.timezone} />
          <Metric label='Dashboard view' value={settings.dashboardLanding} />
          <Metric label='Density' value={settings.dashboardDensity} />
          <Metric
            label='Security alerts'
            value={settings.securityAlerts ? 'Enabled' : 'Disabled'}
          />
        </div>
      </Card>
    </div>
  )
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className='border-foreground/10 flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0'>
      <span className='text-foreground/60'>{label}</span>
      <span className='font-medium break-all'>{value}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='bg-muted rounded-lg p-4'>
      <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {label}
      </p>
      <p className='mt-2 text-sm font-semibold capitalize'>{value}</p>
    </div>
  )
}
