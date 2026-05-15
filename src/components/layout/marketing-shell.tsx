import Link from 'next/link'

import { SiteHeader } from '@/components/layout/site-header'
import { footerNav } from '@/lib/config/navigation'
import { siteConfig } from '@/lib/config/site'

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col'>
      <SiteHeader />
      <main className='flex-1'>{children}</main>
      <footer className='border-foreground/10 border-t'>
        <div className='mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-sm font-semibold'>{siteConfig.name}</p>
            <p className='text-foreground/60 text-xs'>
              MUSD-native API commerce on Mezo.
            </p>
          </div>
          <div className='text-foreground/70 flex flex-wrap gap-4 text-xs'>
            {footerNav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className='hover:text-foreground transition'
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
