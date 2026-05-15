import * as React from 'react'

import { cn } from '@/lib/utils/cn'

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-brand-cyan/35 bg-accent/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-sm shadow-brand-cyan/10 dark:text-accent',
        className
      )}
      {...props}
    />
  )
}
