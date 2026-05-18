'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ShieldCheck } from 'lucide-react'

import { adminNav } from '@/lib/config/navigation'
import { cn } from '@/lib/utils/cn'

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className='lg:sticky lg:top-24 lg:self-start'>
      <nav
        aria-label='Admin'
        className='border-border/80 bg-card/90 shadow-brand-purple/5 rounded-lg border p-2 shadow-sm backdrop-blur'
      >
        <div className='flex items-center gap-2 px-3 py-2'>
          <ShieldCheck className='text-accent h-4 w-4' aria-hidden />
          <p className='text-muted-foreground text-xs tracking-[0.16em] uppercase'>
            Admin panel
          </p>
        </div>
        <div className='grid gap-1'>
          {adminNav.map(item => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-3 transition duration-200',
                  isActive
                    ? 'border-primary/25 bg-primary text-primary-foreground border shadow-sm'
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
        <Link
          href='/dashboard'
          className='text-muted-foreground hover:bg-accent/10 hover:text-primary dark:hover:text-accent mt-3 block rounded-md px-3 py-2 text-sm transition'
        >
          Back to workspace
        </Link>
      </nav>
    </aside>
  )
}
