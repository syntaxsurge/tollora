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
        className='border-border/80 bg-card/90 rounded-lg border p-2 shadow-sm shadow-brand-blue/5 backdrop-blur'
      >
        <div className='px-3 py-2'>
          <p className='text-muted-foreground text-xs tracking-[0.16em] uppercase'>
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
                  'rounded-md px-3 py-3 transition duration-200',
                  isActive
                    ? 'border border-primary/25 bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-accent/10 hover:text-primary dark:hover:text-accent'
                )}
              >
                <span className='block text-sm font-semibold'>
                  {item.label}
                </span>
                <span
                  className={cn(
                    'mt-1 block text-xs leading-5',
                    isActive
                      ? 'text-primary-foreground/85'
                      : 'text-muted-foreground'
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
