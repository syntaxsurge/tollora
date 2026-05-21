'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { CreditCard, Settings, WalletCards } from 'lucide-react'

import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'
import { useUserSettings } from '@/hooks/use-user-settings'
import {
  formatBpsPercent,
  subscriptionPlans
} from '@/lib/contracts/subscription'

export function BillingOverview({
  subscriptionConfigured
}: {
  subscriptionConfigured: boolean
}) {
  return (
    <WalletAddressConsumer>
      {({ address }) => (
        <BillingOverviewContent
          address={address}
          subscriptionConfigured={subscriptionConfigured}
        />
      )}
    </WalletAddressConsumer>
  )
}

function BillingOverviewContent({
  address,
  subscriptionConfigured
}: {
  address: string | null
  subscriptionConfigured: boolean
}) {
  const { settings } = useUserSettings(address)

  const plan =
    subscriptionPlans.find(item => item.key === settings.plan) ??
    subscriptionPlans[0]
  const usage = useMemo(
    () => [
      {
        label: 'Connected wallets',
        value: address ? 1 : 0,
        limit: 1,
        icon: WalletCards
      },
      {
        label: 'Subscription contract',
        value: subscriptionConfigured ? 1 : 0,
        limit: 1,
        icon: CreditCard
      }
    ],
    [address, subscriptionConfigured]
  )

  return (
    <section className='grid gap-5 lg:grid-cols-[0.9fr_1.1fr]'>
      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Current plan
          </p>
          <h2 className='font-display mt-2 text-3xl'>{plan.name}</h2>
          <p className='text-foreground/65 mt-2 text-sm leading-6'>
            {plan.description}
          </p>
        </div>
        <div className='bg-muted rounded-lg p-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Contract price
          </p>
          <p className='mt-2 text-4xl font-semibold'>{plan.priceLabel}</p>
        </div>
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='border-foreground/10 rounded-lg border p-4'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Provider share
            </p>
            <p className='mt-2 text-2xl font-semibold'>
              {formatBpsPercent(plan.providerShareBps)}
            </p>
          </div>
          <div className='border-foreground/10 rounded-lg border p-4'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Platform fee
            </p>
            <p className='mt-2 text-2xl font-semibold'>
              {formatBpsPercent(plan.platformFeeBps)}
            </p>
          </div>
        </div>
        <div className='grid gap-3 text-sm'>
          <div className='border-foreground/10 rounded-lg border p-4'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Billing wallet
            </p>
            <p className='mt-2 font-semibold break-all'>
              {address ?? 'Connect a wallet to assign billing ownership'}
            </p>
          </div>
          <div className='border-foreground/10 rounded-lg border p-4'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Subscription manager
            </p>
            <p className='mt-2 font-semibold'>
              {subscriptionConfigured ? 'Configured' : 'Not configured'}
            </p>
          </div>
        </div>
        <Link
          href='/settings'
          className={buttonClasses({
            className:
              'w-full text-center whitespace-normal sm:whitespace-nowrap'
          })}
        >
          <Settings className='h-4 w-4' aria-hidden />
          Billing contact
        </Link>
      </Card>

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Usage
          </p>
          <h2 className='font-display mt-2 text-2xl'>Plan limits</h2>
        </div>
        <div className='space-y-5'>
          {usage.map(item => {
            const Icon = item.icon
            const percent = Math.min((item.value / item.limit) * 100, 100)

            return (
              <div key={item.label}>
                <div className='flex items-center justify-between gap-4 text-sm'>
                  <span className='flex min-w-0 items-center gap-2 font-medium'>
                    <Icon
                      className='text-accent h-4 w-4 shrink-0'
                      aria-hidden
                    />
                    <span className='truncate'>{item.label}</span>
                  </span>
                  <span className='text-foreground/60 shrink-0'>
                    {item.value} / {item.limit}
                  </span>
                </div>
                <div className='bg-muted mt-2 h-2 rounded-full'>
                  <div
                    className='bg-accent h-2 rounded-full'
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </section>
  )
}
