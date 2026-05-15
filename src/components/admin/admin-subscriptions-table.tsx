import Link from 'next/link'

import { ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AdminSubscriptionQuery,
  AdminSubscriptionRecord
} from '@/lib/contracts/subscription-admin'

type AdminSubscriptionsTableProps = {
  subscribers: AdminSubscriptionRecord[]
  query: AdminSubscriptionQuery
  total: number
  page: number
  pageCount: number
}

export function AdminSubscriptionsTable({
  subscribers,
  query,
  total,
  page,
  pageCount
}: AdminSubscriptionsTableProps) {
  return (
    <Card className='space-y-5'>
      <div>
        <Badge>Subscribers</Badge>
        <h2 className='font-display mt-4 text-3xl'>Subscribed users</h2>
        <p className='text-foreground/65 mt-2 max-w-2xl text-sm leading-6'>
          The table reads a single on-chain subscriber page on the server, then
          resolves each row&apos;s live SubscriptionManager state.
        </p>
      </div>

      <div className='border-foreground/10 overflow-x-auto rounded-lg border'>
        <table className='w-full min-w-[860px] border-collapse text-left text-sm'>
          <thead className='bg-muted text-foreground/70'>
            <tr>
              <th scope='col' className='px-4 py-3 font-semibold'>
                Wallet
              </th>
              <th scope='col' className='px-4 py-3 font-semibold'>
                Plan
              </th>
              <th scope='col' className='px-4 py-3 font-semibold'>
                Status
              </th>
              <th scope='col' className='px-4 py-3 font-semibold'>
                Paid until
              </th>
              <th scope='col' className='px-4 py-3 font-semibold'>
                Auto renew
              </th>
              <th scope='col' className='px-4 py-3 font-semibold'>
                Canceled
              </th>
              <th scope='col' className='px-4 py-3 font-semibold'>
                Explorer
              </th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map(subscriber => (
              <tr
                key={subscriber.walletAddress}
                className='border-foreground/10 border-t'
              >
                <td className='max-w-80 px-4 py-4'>
                  <p className='font-mono text-xs break-all'>
                    {subscriber.walletAddress}
                  </p>
                </td>
                <td className='px-4 py-4'>{subscriber.planName}</td>
                <td className='px-4 py-4'>
                  <span className='bg-foreground/5 rounded-md px-2.5 py-1 text-xs font-semibold'>
                    {subscriber.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className='text-foreground/65 px-4 py-4'>
                  {formatDate(subscriber.paidUntil)}
                </td>
                <td className='px-4 py-4'>
                  {subscriber.autoRenew ? 'Enabled' : 'Disabled'}
                </td>
                <td className='text-foreground/65 px-4 py-4'>
                  {formatDate(subscriber.canceledAt)}
                </td>
                <td className='px-4 py-4'>
                  <a
                    href={subscriber.walletExplorerUrl}
                    target='_blank'
                    rel='noreferrer'
                    className={buttonClasses({
                      variant: 'outline',
                      size: 'sm',
                      className: 'gap-2 whitespace-nowrap'
                    })}
                  >
                    View wallet
                    <ExternalLink className='h-4 w-4' aria-hidden />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subscribers.length === 0 ? (
          <div className='text-foreground/65 p-6 text-center text-sm'>
            No on-chain subscribers are available for this page.
          </div>
        ) : null}
      </div>

      <div className='flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center'>
        <p className='text-foreground/60'>
          Showing page {page} of {pageCount} for {total} subscriber
          {total === 1 ? '' : 's'}.
        </p>
        <div className='flex gap-2'>
          <PaginationLink
            disabled={page <= 1}
            label='Previous'
            page={page - 1}
            query={query}
          />
          <PaginationLink
            disabled={page >= pageCount}
            label='Next'
            page={page + 1}
            query={query}
          />
        </div>
      </div>
    </Card>
  )
}

function PaginationLink({
  disabled,
  label,
  page,
  query
}: {
  disabled: boolean
  label: string
  page: number
  query: AdminSubscriptionQuery
}) {
  if (disabled) {
    return (
      <span
        className={buttonClasses({
          variant: 'outline',
          size: 'sm',
          className: 'pointer-events-none opacity-50'
        })}
      >
        {label}
      </span>
    )
  }

  return (
    <Link
      href={buildSubscriptionsHref({ ...query, page: String(page) })}
      className={buttonClasses({ variant: 'outline', size: 'sm' })}
    >
      {label}
    </Link>
  )
}

function buildSubscriptionsHref(query: AdminSubscriptionQuery) {
  const params = new URLSearchParams()

  if (query.page) {
    params.set('page', query.page)
  }

  if (query.pageSize) {
    params.set('pageSize', query.pageSize)
  }

  const search = params.toString()
  return search ? `/admin/subscriptions?${search}` : '/admin/subscriptions'
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Never'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
