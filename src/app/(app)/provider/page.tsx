import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoOrders } from '@/features/marketplace/orders'
import {
  getMarketplaceMetrics,
  getPublishedProducts
} from '@/features/marketplace/products'

export default function ProviderPage() {
  const products = getPublishedProducts()
  const metrics = getMarketplaceMetrics()
  const topProduct = products
    .slice()
    .sort((a, b) => Number(b.revenueMusd) - Number(a.revenueMusd))[0]

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 overflow-hidden rounded-lg border p-6'>
        <div className='grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end'>
          <div className='space-y-4'>
            <Badge>Provider dashboard</Badge>
            <h1 className='font-display text-4xl'>
              Sell paid APIs with MUSD settlement.
            </h1>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              Track API products, call volume, success rate, MUSD earnings, and
              gateway health from one provider workspace. Tollora records a 5%
              platform fee and shows the 95% provider share for each successful
              paid request.
            </p>
            <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
              <Link
                href='/provider/products'
                className={buttonClasses({ variant: 'primary', size: 'sm' })}
              >
                Manage products
              </Link>
              <Link
                href='/provider/usage'
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                View usage
              </Link>
            </div>
          </div>
          <Card className='bg-background/85'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Top product
            </p>
            <p className='mt-2 text-xl font-semibold'>{topProduct.name}</p>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              {topProduct.revenueMusd} MUSD recorded across {topProduct.calls}{' '}
              calls.
            </p>
          </Card>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[
          ['Total MUSD earned', metrics.totalRevenueMusd],
          ['Total API calls', metrics.totalCalls.toLocaleString()],
          ['Successful calls', '99.0%'],
          ['Provider share', '95%']
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

      <section className='grid gap-5 xl:grid-cols-[1.15fr_0.85fr]'>
        <Card className='space-y-5'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              API products
            </p>
            <h2 className='font-display mt-2 text-2xl'>
              Listings and gateway health
            </h2>
          </div>
          <div className='grid gap-3'>
            {products.map(product => (
              <Link
                key={product.slug}
                href={`/marketplace/${product.slug}`}
                className='border-foreground/10 hover:border-foreground/25 grid gap-4 rounded-lg border p-4 transition lg:grid-cols-[1fr_140px_120px]'
              >
                <div>
                  <p className='font-semibold'>{product.name}</p>
                  <p className='text-foreground/60 mt-1 text-sm'>
                    {product.providerName} - {product.priceLabel}
                  </p>
                </div>
                <div>
                  <p className='text-foreground/60 text-xs uppercase'>Calls</p>
                  <p className='font-semibold'>{product.calls}</p>
                </div>
                <div>
                  <p className='text-foreground/60 text-xs uppercase'>
                    Success
                  </p>
                  <p className='font-semibold'>{product.successRate}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className='space-y-5'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Settlement model
            </p>
            <h2 className='font-display mt-2 text-2xl'>Fee split</h2>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              Tollora records a transparent revenue split for every MUSD-paid
              request. Provider payout automation can build on the same receipt
              and usage records.
            </p>
          </div>
          <div className='grid gap-3'>
            {[
              ['Provider amount', `${metrics.providerShareBps / 100}%`],
              ['Platform fee', `${metrics.platformFeeBps / 100}%`],
              ['Network', 'Mezo Testnet'],
              ['Receipt asset', 'MUSD']
            ].map(([label, value]) => (
              <div key={label} className='bg-muted rounded-lg p-4'>
                <p className='text-foreground/60 text-xs uppercase'>{label}</p>
                <p className='mt-1 font-semibold'>{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className='grid gap-5 xl:grid-cols-[0.9fr_1.1fr]'>
        <Card className='space-y-5'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Recent orders
            </p>
            <h2 className='font-display mt-2 text-2xl'>
              Paid request activity
            </h2>
          </div>
          <div className='grid gap-3'>
            {demoOrders.slice(0, 3).map(order => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className='border-foreground/10 hover:border-foreground/25 rounded-lg border p-4 transition'
              >
                <p className='font-semibold'>{order.productName}</p>
                <div className='text-foreground/60 mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs'>
                  <span>{order.amountMusd}</span>
                  <span>{order.status.replace(/_/g, ' ')}</span>
                  <span>{order.requestId}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className='space-y-5'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Gateway readiness
            </p>
            <h2 className='font-display mt-2 text-2xl'>Demo narrative</h2>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              Providers can show how a listing becomes a paid x402 endpoint, how
              Tollora records the MUSD receipt, and how the dashboard separates
              provider earnings from the platform fee.
            </p>
          </div>
          <Link
            href='/developers/docs'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Open gateway docs
          </Link>
        </Card>
      </section>
    </div>
  )
}
