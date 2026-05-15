'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
    <header className='border-foreground/10 bg-background/85 sticky top-0 z-20 border-b backdrop-blur-xl'>
      <div className='mx-auto flex w-full max-w-7xl items-center gap-4 px-6 py-4'>
        <Link href='/' className='flex items-center gap-3'>
          <Image
            src='/images/tollora-logo.png'
            alt=''
            width={40}
            height={40}
            priority
            className='border-foreground/10 h-10 w-10 rounded-lg border object-cover'
          />
          <div className='hidden text-left sm:block'>
            <p className='text-sm font-semibold'>{siteConfig.name}</p>
          </div>
        </Link>
        <nav
          className='hidden flex-1 items-center justify-center gap-6 text-sm md:flex'
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
                  'hover:text-foreground rounded-md px-2.5 py-1.5 text-sm transition',
                  isActive
                    ? 'bg-foreground/8 text-foreground'
                    : 'text-foreground/70'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className='ml-auto flex items-center gap-2'>
          <details className='relative md:hidden'>
            <summary className='border-foreground/15 text-foreground/80 hover:border-foreground/40 hover:text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition'>
              Menu
            </summary>
            <div className='border-foreground/10 bg-background absolute right-0 mt-2 w-48 rounded-lg border p-2 shadow-lg'>
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
                      'hover:bg-foreground/5 hover:text-foreground block rounded-md px-3 py-2 text-sm transition',
                      isActive ? 'text-foreground' : 'text-foreground/80'
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
          <WalletConnectButton />
        </div>
      </div>
    </header>
  )
}
