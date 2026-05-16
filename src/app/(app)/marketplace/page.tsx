import { Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ProductCard } from '@/features/marketplace/product-card'
import {
  getMarketplaceMetrics,
  getPublishedProducts
} from '@/features/marketplace/products'

export default function MarketplacePage() {
  const products = getPublishedProducts()
  const metrics = getMarketplaceMetrics()
  const categories = Array.from(
    new Set(products.map(product => product.category))
  )

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 overflow-hidden rounded-lg border p-6'>
        <div className='grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end'>
          <div className='space-y-4'>
            <Badge>Marketplace</Badge>
            <h1 className='font-display text-4xl'>
              Discover MUSD-paid APIs on Mezo.
            </h1>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              Browse x402-protected API products for AI workflows, data access,
              media generation, commerce automation, and autonomous agent
              runs. Every listing exposes a stable Tollora endpoint and records
              MUSD receipts for buyers, providers, and proof-backed agent work.
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-1'>
            {[
              ['Published APIs', metrics.productCount.toString()],
              ['Recorded calls', metrics.totalCalls.toLocaleString()],
              ['MUSD volume', metrics.totalRevenueMusd]
            ].map(([label, value]) => (
              <div key={label} className='bg-background/80 rounded-lg p-4'>
                <p className='text-foreground/60 text-xs uppercase'>{label}</p>
                <p className='mt-1 text-xl font-semibold'>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-[1fr_260px]'>
        <label className='border-foreground/10 bg-card flex min-h-12 items-center gap-3 rounded-lg border px-4'>
          <Search aria-hidden className='text-foreground/50 h-4 w-4' />
          <span className='sr-only'>Search APIs</span>
          <input
            className='placeholder:text-foreground/45 h-11 flex-1 bg-transparent text-sm outline-none'
            placeholder='Search APIs, providers, and categories'
          />
        </label>
        <div className='flex flex-wrap gap-2'>
          {categories.map(category => (
            <Badge key={category}>{category}</Badge>
          ))}
        </div>
      </section>

      <section className='grid gap-5 xl:grid-cols-2'>
        {products.map(product => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </section>

      <Card className='grid gap-4 md:grid-cols-3'>
        {[
          {
            label: 'Payment asset',
            value: 'MUSD',
            detail: 'Prices are denominated in Bitcoin-backed MUSD.'
          },
          {
            label: 'Network',
            value: 'Mezo Testnet',
            detail: 'Gateway payments settle against eip155:31611.'
          },
          {
            label: 'Agent access',
            value: 'Launch Pack',
            detail:
              'Autonomous agents can select tools, pay, retry, and publish proofs.'
          }
        ].map(item => (
          <div key={item.label}>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              {item.label}
            </p>
            <p className='mt-2 text-xl font-semibold'>{item.value}</p>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              {item.detail}
            </p>
          </div>
        ))}
      </Card>
    </div>
  )
}
