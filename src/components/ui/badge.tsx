import * as React from 'react'

import { cn } from '@/lib/utils/cn'

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'border-foreground/15 bg-foreground/5 text-foreground/70 inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-[0.16em] uppercase',
        className
      )}
      {...props}
    />
  )
}
