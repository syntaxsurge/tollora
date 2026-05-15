'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Menu, Search, UserRound } from 'lucide-react'

import { ThemeToggle } from '@/components/ui/theme-toggle'
import { WalletConnectButton } from '@/components/ui/wallet-connect-button'
import { primaryNav } from '@/lib/config/navigation'
import { siteConfig } from '@/lib/config/site'
import { cn } from '@/lib/utils/cn'

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className='border-border bg-background sticky top-0 z-50 border-b'>
      <div className='mx-auto flex min-h-[6.25rem] w-full max-w-[98rem] items-center gap-6 px-4 py-4 sm:px-6 lg:px-8'>
        <Link href='/' className='group flex w-44 shrink-0 items-center gap-3'>
          <span className='logo-mark-surface ring-border grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-lg p-2 ring-1 transition group-hover:scale-[1.02]'>
            <Image
              src='/images/tollora-logo.png'
              alt='Tollora'
              width={64}
              height={64}
              priority
              className='h-14 w-14 object-contain'
            />
          </span>
          <div className='min-w-0 text-left'>
            <p className='truncate text-lg leading-5 font-semibold'>
              {siteConfig.name}
            </p>
            <p className='text-muted-foreground text-sm leading-5'>
              MUSD API commerce
            </p>
          </div>
        </Link>

        <form
          action='/marketplace'
          className='border-border bg-card focus-within:ring-ring/35 hidden h-14 max-w-[18rem] min-w-[14rem] flex-1 items-center gap-3 rounded-lg border px-4 shadow-sm transition focus-within:ring-2 md:flex xl:w-[20rem] xl:max-w-none xl:flex-none 2xl:w-[30rem]'
          role='search'
        >
          <Search
            className='text-muted-foreground h-5 w-5 shrink-0'
            aria-hidden
          />
          <label htmlFor='global-search' className='sr-only'>
            Search marketplace
          </label>
          <input
            id='global-search'
            name='q'
            className='placeholder:text-muted-foreground h-12 min-w-0 flex-1 bg-transparent text-base outline-none'
            placeholder='Search paid APIs'
          />
        </form>

        <nav
          className='hidden min-w-0 flex-1 items-center justify-center gap-6 text-sm xl:flex 2xl:gap-8'
          aria-label='Primary'
        >
          {primaryNav.map(item => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-md px-1 py-2 text-base font-medium whitespace-nowrap transition',
                  isActive
                    ? 'text-primary dark:text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className='ml-auto flex shrink-0 items-center gap-3'>
          <details className='relative xl:hidden'>
            <summary className='border-border bg-card text-foreground hover:border-brand-cyan/60 flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-lg border transition'>
              <Menu className='h-4 w-4' aria-hidden />
              <span className='sr-only'>Open navigation menu</span>
            </summary>
            <div className='border-border bg-card absolute right-0 mt-2 w-56 rounded-lg border p-2 shadow-lg'>
              {primaryNav.map(item => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'block rounded-md px-3 py-2 text-sm transition',
                      isActive
                        ? 'bg-accent/12 text-primary dark:text-accent'
                        : 'text-muted-foreground hover:bg-accent/8 hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </details>
          <ThemeToggle />
          <Link
            href='/profile'
            aria-label='Open profile'
            className='border-border bg-card text-foreground hover:border-brand-purple/60 hidden h-12 w-12 items-center justify-center rounded-lg border shadow-sm transition sm:flex'
          >
            <UserRound className='h-4 w-4' aria-hidden />
          </Link>
          <WalletConnectButton />
        </div>
      </div>
    </header>
  )
}
