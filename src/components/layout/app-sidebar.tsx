'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { appNav } from '@/lib/config/navigation'
import { cn } from '@/lib/utils/cn'

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className='lg:sticky lg:top-24 lg:self-start'>
      <nav
        aria-label='Workspace'
        className='border-foreground/10 bg-card rounded-lg border p-2 shadow-sm'
      >
        <div className='px-3 py-2'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Workspace
          </p>
        </div>
        <div className='grid gap-1'>
          {appNav.map(item => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-3 transition',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'hover:bg-foreground/5 text-foreground'
                )}
              >
                <span className='block text-sm font-semibold'>
                  {item.label}
                </span>
                <span
                  className={cn(
                    'mt-1 block text-xs leading-5',
                    isActive ? 'text-background/70' : 'text-foreground/60'
                  )}
                >
                  {item.description}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
