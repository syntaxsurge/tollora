'use client'

import { useEffect, useRef } from 'react'

type UseAutoRefreshOptions = {
  enabled: boolean
  intervalMs: number
  onRefresh: () => void | Promise<void>
  immediate?: boolean
  refreshKey?: string
}

export function useAutoRefresh({
  enabled,
  intervalMs,
  onRefresh,
  immediate = true,
  refreshKey = ''
}: UseAutoRefreshOptions) {
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || intervalMs <= 0) {
      return
    }

    if (immediate) {
      void onRefreshRef.current()
    }

    const interval = window.setInterval(() => {
      void onRefreshRef.current()
    }, intervalMs)

    return () => window.clearInterval(interval)
  }, [enabled, intervalMs, immediate, refreshKey])
}
