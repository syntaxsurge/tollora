'use client'

import { useEffect, useMemo, useState } from 'react'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'nextjs-toploader/app'

import { Button } from '@/components/ui/button'

export type ServerDataTableBulkAction = {
  label: string
  endpoint: string
  method?: 'POST' | 'DELETE'
  confirmMessage?: string
}

export function ServerDataTableSelection({
  tableId,
  bulkActions = []
}: {
  tableId: string
  bulkActions?: ServerDataTableBulkAction[]
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  function getCheckboxes() {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `[data-table-id="${tableId}"][data-row-checkbox]`
      )
    )
  }

  useEffect(() => {
    const checkboxes = getCheckboxes()

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', syncFromDom)
    })

    return () => {
      checkboxes.forEach(checkbox => {
        checkbox.removeEventListener('change', syncFromDom)
      })
    }
  })

  function syncFromDom() {
    setSelectedIds(
      getCheckboxes()
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value)
    )
  }

  function toggleCurrentPage(checked: boolean) {
    const checkboxes = getCheckboxes()

    checkboxes.forEach(checkbox => {
      checkbox.checked = checked
    })
    setSelectedIds(checked ? checkboxes.map(checkbox => checkbox.value) : [])
  }

  async function runBulkAction(action: ServerDataTableBulkAction) {
    if (selectedIds.length === 0) {
      return
    }

    if (action.confirmMessage && !window.confirm(action.confirmMessage)) {
      return
    }

    const response = await fetch(action.endpoint, {
      method: action.method ?? 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds })
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string
      } | null

      window.alert(body?.error ?? 'Bulk action failed.')
      return
    }

    setSelectedIds([])
    router.refresh()
  }

  return (
    <div className='border-border bg-card/90 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'>
      <label className='flex items-center gap-3 text-sm font-semibold'>
        <input
          type='checkbox'
          className='border-border text-primary focus:ring-ring h-4 w-4 rounded'
          aria-label='Select all rows on this page'
          onChange={event => toggleCurrentPage(event.currentTarget.checked)}
        />
        <span>{selectedIds.length} selected on this page</span>
      </label>
      {bulkActions.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {bulkActions.map(action => (
            <Button
              key={action.label}
              type='button'
              variant='outline'
              size='sm'
              disabled={selectedSet.size === 0}
              onClick={() => void runBulkAction(action)}
            >
              <Trash2 className='h-4 w-4' aria-hidden />
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
      <span className='sr-only' aria-live='polite'>
        {selectedIds.length} rows selected
      </span>
    </div>
  )
}
