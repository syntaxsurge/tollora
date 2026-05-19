import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react'

import {
  ServerDataTableSelection,
  type ServerDataTableBulkAction
} from '@/components/data-display/server-data-table-selection'
import { buttonClasses } from '@/components/ui/button'
import type { ServerTableDirection } from '@/lib/table/server-table'
import { cn } from '@/lib/utils/cn'

export type ServerDataTableColumn<T> = {
  key: string
  label: string
  sortKey?: string
  className?: string
  render: (row: T) => ReactNode
}

export function ServerDataTable<T>({
  id,
  rows,
  columns,
  getRowId,
  basePath,
  query,
  sort,
  dir,
  page,
  pageSize,
  totalRows,
  totalPages,
  preserveParams = {},
  emptyTitle,
  emptyDescription,
  searchPlaceholder = 'Search',
  bulkActions = []
}: {
  id: string
  rows: T[]
  columns: ServerDataTableColumn<T>[]
  getRowId: (row: T) => string
  basePath: string
  query: string
  sort: string
  dir: ServerTableDirection
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
  preserveParams?: Record<string, string | undefined>
  emptyTitle: string
  emptyDescription: string
  searchPlaceholder?: string
  bulkActions?: ServerDataTableBulkAction[]
}) {
  return (
    <div className='border-border bg-card/90 overflow-hidden rounded-lg border shadow-sm'>
      <div className='border-border bg-background/50 border-b p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <form action={basePath} className='min-w-0 flex-1' role='search'>
            {Object.entries(preserveParams).map(([key, value]) =>
              value ? (
                <input key={key} type='hidden' name={key} value={value} />
              ) : null
            )}
            <input type='hidden' name='sort' value={sort} />
            <input type='hidden' name='dir' value={dir} />
            <input type='hidden' name='pageSize' value={pageSize} />
            <label className='border-border bg-card focus-within:ring-ring/35 flex min-h-11 items-center gap-3 rounded-lg border px-3 transition focus-within:ring-2'>
              <Search className='text-foreground/50 h-4 w-4' aria-hidden />
              <span className='sr-only'>Search table</span>
              <input
                name='q'
                defaultValue={query}
                placeholder={searchPlaceholder}
                className='placeholder:text-muted-foreground h-10 min-w-0 flex-1 bg-transparent text-sm outline-none'
              />
            </label>
          </form>
          <div className='text-muted-foreground text-sm'>
            {totalRows.toLocaleString()} result{totalRows === 1 ? '' : 's'}
          </div>
        </div>
        <div className='mt-3'>
          <ServerDataTableSelection tableId={id} bulkActions={bulkActions} />
        </div>
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full min-w-[760px] text-left text-sm'>
          <thead className='bg-muted/30 text-muted-foreground'>
            <tr>
              <th className='w-12 px-4 py-3'>
                <span className='sr-only'>Select row</span>
              </th>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold tracking-[0.12em] uppercase',
                    column.className
                  )}
                >
                  {column.sortKey ? (
                    <Link
                      href={buildHref({
                        basePath,
                        preserveParams,
                        q: query,
                        sort: column.sortKey,
                        dir:
                          sort === column.sortKey && dir === 'desc'
                            ? 'asc'
                            : 'desc',
                        page: 1,
                        pageSize
                      })}
                      className='hover:text-foreground inline-flex items-center gap-1 transition'
                    >
                      {column.label}
                      {sort === column.sortKey ? (
                        dir === 'desc' ? (
                          <ArrowDown className='h-3.5 w-3.5' aria-hidden />
                        ) : (
                          <ArrowUp className='h-3.5 w-3.5' aria-hidden />
                        )
                      ) : null}
                    </Link>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-border divide-y'>
            {rows.map(row => {
              const rowId = getRowId(row)

              return (
                <tr key={rowId} className='hover:bg-muted/25 transition'>
                  <td className='px-4 py-4 align-top'>
                    <input
                      value={rowId}
                      data-table-id={id}
                      data-row-checkbox
                      type='checkbox'
                      aria-label={`Select ${rowId}`}
                      className='border-border text-primary focus:ring-ring h-4 w-4 rounded'
                    />
                  </td>
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-4 align-top', column.className)}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className='p-8 text-center'>
          <p className='text-lg font-semibold'>{emptyTitle}</p>
          <p className='text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6'>
            {emptyDescription}
          </p>
        </div>
      ) : null}

      <div className='border-border flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-muted-foreground text-sm'>
          Page {page} of {totalPages}
        </p>
        <div className='flex gap-2'>
          <Link
            aria-disabled={page <= 1}
            href={buildHref({
              basePath,
              preserveParams,
              q: query,
              sort,
              dir,
              page: Math.max(1, page - 1),
              pageSize
            })}
            className={buttonClasses({
              variant: 'outline',
              size: 'sm',
              className: page <= 1 ? 'pointer-events-none opacity-50' : ''
            })}
          >
            <ChevronLeft className='h-4 w-4' aria-hidden />
            Previous
          </Link>
          <Link
            aria-disabled={page >= totalPages}
            href={buildHref({
              basePath,
              preserveParams,
              q: query,
              sort,
              dir,
              page: Math.min(totalPages, page + 1),
              pageSize
            })}
            className={buttonClasses({
              variant: 'outline',
              size: 'sm',
              className:
                page >= totalPages ? 'pointer-events-none opacity-50' : ''
            })}
          >
            Next
            <ChevronRight className='h-4 w-4' aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  )
}

function buildHref({
  basePath,
  preserveParams,
  q,
  sort,
  dir,
  page,
  pageSize
}: {
  basePath: string
  preserveParams: Record<string, string | undefined>
  q: string
  sort: string
  dir: ServerTableDirection
  page: number
  pageSize: number
}) {
  const params = new URLSearchParams()

  Object.entries(preserveParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  if (q) {
    params.set('q', q)
  }

  params.set('sort', sort)
  params.set('dir', dir)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  return `${basePath}?${params.toString()}`
}
