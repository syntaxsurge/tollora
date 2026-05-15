import Link from 'next/link'

import { ArrowDown, ArrowUp, Search } from 'lucide-react'

import { AdminUserRowActions } from '@/components/admin/admin-user-row-actions'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AdminUserQuery,
  AdminUserRecord,
  AdminUserSortKey,
  getSubscriptionStatus
} from '@/lib/admin/admin-users'
import { cn } from '@/lib/utils/cn'

type AdminUsersTableProps = {
  users: AdminUserRecord[]
  query: AdminUserQuery
  total: number
  page: number
  pageCount: number
  sort: AdminUserSortKey
  direction: 'asc' | 'desc'
}

const columns: Array<{ key: AdminUserSortKey; label: string }> = [
  { key: 'walletAddress', label: 'Wallet' },
  { key: 'role', label: 'Role' },
  { key: 'subscriptionStatus', label: 'Subscription' },
  { key: 'plan', label: 'Tier' },
  { key: 'status', label: 'Status' },
  { key: 'lastSeenAt', label: 'Last seen' }
]

export function AdminUsersTable({
  users,
  query,
  total,
  page,
  pageCount,
  sort,
  direction
}: AdminUsersTableProps) {
  return (
    <Card className='space-y-5'>
      <div className='flex flex-col justify-between gap-4 xl:flex-row xl:items-end'>
        <div>
          <Badge>Users</Badge>
          <h1 className='font-display mt-4 text-4xl'>User directory</h1>
          <p className='text-foreground/65 mt-2 max-w-2xl text-sm leading-6'>
            Search, filter, sort, and paginate users through URL parameters so
            the table work stays server-rendered and cacheable.
          </p>
        </div>
        <form
          className='grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]'
          action='/admin/users'
        >
          <label className='relative'>
            <Search
              className='text-foreground/45 pointer-events-none absolute top-3 left-3 h-4 w-4'
              aria-hidden
            />
            <input
              name='search'
              defaultValue={query.search}
              placeholder='Search users'
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-lg border pr-4 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none'
            />
          </label>
          <FilterSelect
            name='role'
            value={query.role}
            options={['admin', 'member']}
          />
          <FilterSelect
            name='plan'
            value={query.plan}
            options={['free', 'base', 'plus']}
          />
          <button className={buttonClasses({ size: 'sm', className: 'h-11' })}>
            Apply
          </button>
        </form>
      </div>

      <div className='border-foreground/10 overflow-x-auto rounded-lg border'>
        <table className='w-full min-w-[980px] border-collapse text-left text-sm'>
          <thead className='bg-muted text-foreground/70'>
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  scope='col'
                  className='px-4 py-3 font-semibold'
                >
                  <SortLink
                    label={column.label}
                    column={column.key}
                    query={query}
                    activeSort={sort}
                    direction={direction}
                  />
                </th>
              ))}
              <th scope='col' className='px-4 py-3 font-semibold'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className='border-foreground/10 border-t'>
                <td className='max-w-72 px-4 py-4'>
                  <p className='font-semibold'>{user.displayName}</p>
                  <p className='text-foreground/60 mt-1 truncate text-xs'>
                    {user.walletAddress}
                  </p>
                </td>
                <td className='px-4 py-4 capitalize'>{user.role}</td>
                <td className='px-4 py-4'>
                  <span className='bg-foreground/5 rounded-md px-2.5 py-1 text-xs font-semibold capitalize'>
                    {getSubscriptionStatus(user.plan)}
                  </span>
                </td>
                <td className='px-4 py-4 capitalize'>{user.plan}</td>
                <td className='px-4 py-4'>
                  <span className='bg-foreground/5 rounded-md px-2.5 py-1 text-xs font-semibold capitalize'>
                    {user.status}
                  </span>
                </td>
                <td className='text-foreground/65 px-4 py-4'>
                  {new Intl.DateTimeFormat('en', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }).format(new Date(user.lastSeenAt))}
                </td>
                <td className='px-4 py-4'>
                  <AdminUserRowActions
                    user={user}
                    returnTo={buildUsersHref(query)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <div className='text-foreground/65 p-6 text-center text-sm'>
            No users match the current server-side filters.
          </div>
        ) : null}
      </div>

      <div className='flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center'>
        <p className='text-foreground/60'>
          Showing page {page} of {pageCount} for {total} user
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

function SortLink({
  label,
  column,
  query,
  activeSort,
  direction
}: {
  label: string
  column: AdminUserSortKey
  query: AdminUserQuery
  activeSort: AdminUserSortKey
  direction: 'asc' | 'desc'
}) {
  const nextDirection =
    activeSort === column && direction === 'asc' ? 'desc' : 'asc'
  const href = buildUsersHref({
    ...query,
    sort: column,
    direction: nextDirection,
    page: '1'
  })
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <Link href={href} className='inline-flex items-center gap-1.5'>
      {label}
      {activeSort === column ? (
        <Icon className='h-3.5 w-3.5' aria-hidden />
      ) : null}
    </Link>
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
  query: AdminUserQuery
}) {
  if (disabled) {
    return (
      <span
        className={cn(
          buttonClasses({ variant: 'outline', size: 'sm' }),
          'pointer-events-none opacity-50'
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <Link
      href={buildUsersHref({ ...query, page: `${page}` })}
      className={buttonClasses({ variant: 'outline', size: 'sm' })}
    >
      {label}
    </Link>
  )
}

function FilterSelect({
  name,
  value,
  options
}: {
  name: string
  value?: string
  options: string[]
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ''}
      className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 rounded-lg border px-3 text-sm capitalize focus-visible:ring-2 focus-visible:outline-none'
    >
      <option value=''>All {name}</option>
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function buildUsersHref(query: AdminUserQuery) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }

  const search = params.toString()

  return search ? `/admin/users?${search}` : '/admin/users'
}
