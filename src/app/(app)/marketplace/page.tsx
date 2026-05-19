import Link from 'next/link'

import { Search, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProductCard } from '@/features/marketplace/product-card'
import {
  getMarketplaceMetrics,
  getPublishedProducts
} from '@/features/marketplace/products'
import { cn } from '@/lib/utils/cn'

type MarketplacePageProps = {
  searchParams?: Promise<{
    category?: string
    q?: string
  }>
}

export default async function MarketplacePage({
  searchParams
}: MarketplacePageProps) {
  const products = getPublishedProducts()
  const metrics = getMarketplaceMetrics()
  const categories = Array.from(
    new Set(products.map(product => product.category))
  )
  const params = await searchParams
  const query = params?.q?.trim() ?? ''
  const category = params?.category?.trim() ?? ''
  const normalizedQuery = query.toLowerCase()
  const visibleProducts = products.filter(product => {
    const matchesCategory = !category || product.category === category
    const matchesQuery =
      !normalizedQuery ||
      [
        product.name,
        product.providerName,
        product.description,
        product.category,
        product.priceLabel
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)

    return matchesCategory && matchesQuery
  })

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 overflow-hidden rounded-lg border p-6'>
        <div className='grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end'>
          <div className='space-y-4'>
            <Badge>Marketplace</Badge>
            <h1 className='font-display text-4xl'>Find paid APIs faster.</h1>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              Browse wallet-ready tools for agents, data, media, and commerce.
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

      <section className='space-y-3'>
        <form
          action='/marketplace'
          className='grid gap-3 lg:grid-cols-[1fr_auto]'
          role='search'
        >
          <label className='border-foreground/10 bg-card focus-within:ring-ring/35 flex min-h-12 items-center gap-3 rounded-lg border px-4 transition focus-within:ring-2'>
            <Search aria-hidden className='text-foreground/50 h-4 w-4' />
            <span className='sr-only'>Search APIs</span>
            <input
              name='q'
              defaultValue={query}
              className='placeholder:text-foreground/45 h-11 flex-1 bg-transparent text-sm outline-none'
              placeholder='Search APIs, providers, categories'
            />
          </label>
          {category ? (
            <input type='hidden' name='category' value={category} />
          ) : null}
          <button
            type='submit'
            className={buttonClasses({
              variant: 'primary',
              size: 'md',
              className: 'min-w-32'
            })}
          >
            <Search className='h-4 w-4' aria-hidden />
            Search
          </button>
        </form>
        <div className='flex flex-wrap gap-2'>
          <Link
            href={
              query
                ? `/marketplace?q=${encodeURIComponent(query)}`
                : '/marketplace'
            }
            className={cn(
              'border-border bg-card hover:border-brand-cyan/60 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
              !category && 'border-primary bg-primary text-primary-foreground'
            )}
          >
            <Sparkles className='h-4 w-4' aria-hidden />
            All
          </Link>
          {categories.map(categoryName => {
            const href = `/marketplace?category=${encodeURIComponent(categoryName)}${
              query ? `&q=${encodeURIComponent(query)}` : ''
            }`

            return (
              <Link
                key={categoryName}
                href={href}
                className={cn(
                  'border-border bg-card hover:border-brand-cyan/60 inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition',
                  category === categoryName &&
                    'border-primary bg-primary text-primary-foreground'
                )}
              >
                {categoryName}
              </Link>
            )
          })}
        </div>
      </section>

      <section className='grid gap-5 xl:grid-cols-2'>
        {visibleProducts.length === 0 ? (
          <Card className='space-y-3 xl:col-span-2'>
            <h2 className='text-xl font-semibold'>No APIs match this view</h2>
            <p className='text-foreground/65 max-w-2xl text-sm leading-6'>
              Clear the search or choose another category.
            </p>
            <Link href='/marketplace' className={buttonClasses({ size: 'sm' })}>
              Reset filters
            </Link>
          </Card>
        ) : null}
        {visibleProducts.map(product => (
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
