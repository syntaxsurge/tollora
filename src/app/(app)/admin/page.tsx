import { cookies } from 'next/headers'
import Link from 'next/link'

import { BarChart3, CreditCard, ShieldCheck, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ADMIN_USER_OVERRIDES_COOKIE } from '@/lib/admin/admin-user-cookies'
import {
  applyAdminUserOverrides,
  getAdminStats,
  getAdminUserSeed,
  parseAdminUserOverrides
} from '@/lib/admin/admin-users'
import { WALLET_ADDRESS_COOKIE } from '@/lib/auth/wallet-session'
import { getProjectSnapshot } from '@/lib/config/project'

export default async function AdminPage() {
  const snapshot = await getProjectSnapshot()
  const cookieStore = await cookies()
  const currentWallet = cookieStore.get(WALLET_ADDRESS_COOKIE)?.value
  const overrides = parseAdminUserOverrides(
    cookieStore.get(ADMIN_USER_OVERRIDES_COOKIE)?.value
  )
  const users = applyAdminUserOverrides(
    getAdminUserSeed(currentWallet),
    overrides
  )
  const stats = getAdminStats(users)

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Admin</Badge>
        <div className='mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end'>
          <div className='max-w-3xl space-y-3'>
            <h1 className='font-display text-4xl'>Project control room</h1>
            <p className='text-foreground/70 text-sm leading-6'>
              Monitor subscriptions, wallet access, and user operations without
              mixing every admin workflow into a single page.
            </p>
          </div>
          <Link
            href='/admin/users'
            className={buttonClasses({
              size: 'sm',
              className: 'whitespace-nowrap'
            })}
          >
            Open users
          </Link>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <AdminMetric icon={Users} label='Users' value={`${stats.totalUsers}`} />
        <AdminMetric
          icon={ShieldCheck}
          label='Admins'
          value={`${stats.adminUsers}`}
        />
        <AdminMetric
          icon={CreditCard}
          label='Paid plans'
          value={`${stats.paidUsers}`}
        />
        <AdminMetric
          icon={BarChart3}
          label='Subscription'
          value={snapshot.subscriptionManagerAddress ? 'Ready' : 'Pending'}
        />
      </section>

      <section className='grid gap-5 lg:grid-cols-2'>
        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Admin workflows
          </p>
          <h2 className='font-display text-2xl'>Dedicated pages</h2>
          <div className='grid gap-3'>
            <Link
              href='/admin/users'
              className='border-foreground/10 hover:border-foreground/25 rounded-lg border p-4 transition'
            >
              <span className='block font-semibold'>Users</span>
              <span className='text-foreground/60 mt-1 block text-sm'>
                Server-rendered table with URL-based search, filters, sorting,
                and pagination.
              </span>
            </Link>
            <Link
              href='/admin/subscriptions'
              className='border-foreground/10 hover:border-foreground/25 rounded-lg border p-4 transition'
            >
              <span className='block font-semibold'>Subscriptions</span>
              <span className='text-foreground/60 mt-1 block text-sm'>
                Contract balance, subscribed users, plan prices, and treasury
                withdrawals.
              </span>
            </Link>
            <Link
              href='/admin/operations'
              className='border-foreground/10 hover:border-foreground/25 rounded-lg border p-4 transition'
            >
              <span className='block font-semibold'>Operations</span>
              <span className='text-foreground/60 mt-1 block text-sm'>
                Deployment checklist and subscription contract configuration.
              </span>
            </Link>
          </div>
        </Card>

        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Subscription
          </p>
          <h2 className='font-display text-2xl'>Payment readiness</h2>
          <div className='bg-muted rounded-lg p-4'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Contract address
            </p>
            <p className='mt-2 text-sm font-semibold break-all'>
              {snapshot.subscriptionManagerAddress ??
                'Deploy and configure the contract address'}
            </p>
          </div>
        </Card>
      </section>
    </div>
  )
}

function AdminMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <Card className='relative overflow-hidden'>
      <div className='bg-accent absolute top-0 left-0 h-1 w-full' />
      <Icon className='text-accent h-5 w-5' aria-hidden />
      <p className='text-foreground/60 mt-4 text-xs tracking-[0.16em] uppercase'>
        {label}
      </p>
      <p className='mt-2 text-3xl font-semibold'>{value}</p>
    </Card>
  )
}
