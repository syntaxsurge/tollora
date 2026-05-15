import Link from 'next/link'

import { AccountSummary } from '@/components/dashboard/account-summary'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getFeaturedProduct,
  getMarketplaceMetrics,
  getPublishedProducts
} from '@/features/marketplace/products'

export default function DashboardPage() {
  const products = getPublishedProducts()
  const featuredProduct = getFeaturedProduct()
  const metrics = getMarketplaceMetrics()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 overflow-hidden rounded-lg border p-6'>
        <div className='grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end'>
          <div className='space-y-4'>
            <Badge>Buyer dashboard</Badge>
            <h1 className='font-display text-4xl'>Your MUSD API workspace</h1>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              Browse paid APIs, inspect x402-ready listings, monitor usage, and
              keep MUSD receipts tied to your connected wallet.
            </p>
            <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
              <Link
                href='/marketplace'
                className={buttonClasses({ variant: 'primary', size: 'sm' })}
              >
                Explore marketplace
              </Link>
              <Link
                href='/provider'
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Provider dashboard
              </Link>
            </div>
          </div>
          <Card className='bg-background/85'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Featured API
            </p>
            <p className='mt-2 text-xl font-semibold'>
              {featuredProduct?.name}
            </p>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              {featuredProduct?.priceLabel} per request through a MUSD-protected
              Tollora endpoint.
            </p>
          </Card>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[
          ['Published APIs', metrics.productCount.toString()],
          ['Recorded calls', metrics.totalCalls.toLocaleString()],
          ['MUSD volume', metrics.totalRevenueMusd],
          ['Network', 'Mezo Testnet']
        ].map(([label, value]) => (
          <Card key={label} className='relative overflow-hidden'>
            <div className='bg-accent absolute top-0 left-0 h-1 w-full' />
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              {label}
            </p>
            <p className='mt-3 text-2xl font-semibold'>{value}</p>
          </Card>
        ))}
      </section>

      <section className='grid gap-5 xl:grid-cols-[1fr_0.8fr]'>
        <Card className='space-y-5'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Marketplace shortcuts
            </p>
            <h2 className='font-display mt-2 text-2xl'>Available APIs</h2>
          </div>
          <div className='grid gap-3'>
            {products.map(product => (
              <Link
                key={product.slug}
                href={`/marketplace/${product.slug}`}
                className='border-foreground/10 hover:border-foreground/25 rounded-lg border p-4 transition'
              >
                <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
                  <div>
                    <span className='block font-semibold'>{product.name}</span>
                    <span className='text-foreground/60 mt-1 block text-sm leading-6'>
                      {product.providerName} - {product.category}
                    </span>
                  </div>
                  <span className='text-sm font-semibold'>
                    {product.priceLabel}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
        <AccountSummary />
      </section>
    </div>
  )
}
