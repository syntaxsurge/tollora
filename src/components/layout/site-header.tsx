'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Menu, Search, UserRound } from 'lucide-react'

import { AdminHeaderLink } from '@/components/layout/admin-header-link'
import { ChainSelectorButton } from '@/components/ui/chain-selector-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { WalletConnectButton } from '@/components/ui/wallet-connect-button'
import { primaryNav } from '@/lib/config/navigation'
import { siteConfig } from '@/lib/config/site'
import { cn } from '@/lib/utils/cn'

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className='border-border/80 bg-background/86 supports-[backdrop-filter]:bg-background/72 sticky top-0 z-20 border-b backdrop-blur-xl'>
      <div className='container-page flex min-h-20 items-center gap-3 py-3'>
        <Link href='/' className='group flex min-w-0 items-center gap-3'>
          <span className='logo-mark-surface grid h-14 w-14 shrink-0 place-items-center rounded-lg p-1.5 ring-1 ring-border transition group-hover:scale-[1.02]'>
            <Image
              src='/images/tollora-logo.png'
              alt='Tollora'
              width={56}
              height={56}
              priority
              className='h-12 w-12 object-contain'
            />
          </span>
          <div className='hidden min-w-0 text-left sm:block'>
            <p className='truncate text-base font-semibold leading-5'>
              {siteConfig.name}
            </p>
            <p className='text-muted-foreground hidden text-xs lg:block'>
              MUSD API commerce
            </p>
          </div>
        </Link>

        <form
          action='/marketplace'
          className='border-border bg-card/80 focus-within:ring-ring/40 ml-2 hidden h-11 w-full max-w-sm items-center gap-2 rounded-lg border px-3 shadow-sm transition focus-within:ring-2 lg:flex'
          role='search'
        >
          <Search className='text-muted-foreground h-4 w-4' aria-hidden />
          <label htmlFor='global-search' className='sr-only'>
            Search marketplace
          </label>
          <input
            id='global-search'
            name='q'
            className='placeholder:text-muted-foreground h-10 min-w-0 flex-1 bg-transparent text-sm outline-none'
            placeholder='Search paid APIs'
          />
        </form>

        <nav
          className='hidden flex-1 items-center justify-center gap-2 text-sm md:flex'
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
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-accent/12 text-primary shadow-sm dark:text-accent'
                    : 'text-muted-foreground hover:bg-accent/8 hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className='ml-auto flex items-center gap-2'>
          <details className='relative md:hidden'>
            <summary className='border-border bg-card text-foreground hover:border-brand-cyan/60 flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border transition'>
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
          <AdminHeaderLink />
          <ThemeToggle />
          <ChainSelectorButton />
          <Link
            href='/profile'
            aria-label='Open profile'
            className='border-border bg-card text-foreground hover:border-brand-purple/60 hidden h-10 w-10 items-center justify-center rounded-lg border shadow-sm transition sm:flex'
          >
            <UserRound className='h-4 w-4' aria-hidden />
          </Link>
          <WalletConnectButton />
        </div>
      </div>
    </header>
  )
}
