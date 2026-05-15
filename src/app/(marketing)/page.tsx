import Link from 'next/link'

import { AuthRequiredToast } from '@/components/feedback/auth-required-toast'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getFeaturedProduct,
  getMarketplaceMetrics
} from '@/features/marketplace/products'
import { siteConfig } from '@/lib/config/site'

type MarketingPageSearchParams = {
  auth?: string
  next?: string
}

export default async function MarketingPage({
  searchParams
}: {
  searchParams: Promise<MarketingPageSearchParams>
}) {
  const params = await searchParams
  const featuredProduct = getFeaturedProduct()
  const metrics = getMarketplaceMetrics()
  const flow = [
    {
      title: 'Discover',
      detail:
        'Browse paid APIs by category, provider, price, x402 support, and agent readiness.'
    },
    {
      title: 'Pay',
      detail:
        'Authorize MUSD payment on Mezo Testnet through a wallet-native x402 flow.'
    },
    {
      title: 'Call',
      detail:
        'Tollora verifies payment, forwards the request, and records usage for the buyer and provider.'
    },
    {
      title: 'Receive',
      detail:
        'The buyer receives the paid response, receipt metadata, and explorer-linked settlement details.'
    }
  ]

  const useCases = [
    'AI video and media generation',
    'Premium data APIs',
    'Paid MCP and agent tools',
    'Creator services',
    'Developer utilities',
    'Commerce automation'
  ]

  return (
    <div className='bg-app-grid relative overflow-hidden'>
      <AuthRequiredToast reason={params.auth} nextPath={params.next} />
      <section className='mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-20'>
        <div className='space-y-7'>
          <Badge>MUSD API marketplace</Badge>
          <div className='space-y-5'>
            <h1 className='font-display max-w-3xl text-4xl leading-tight sm:text-5xl lg:text-6xl'>
              MUSD-native API commerce for humans and AI agents.
            </h1>
            <p className='text-foreground/70 max-w-2xl text-base leading-7'>
              {siteConfig.description} Providers list paid endpoints, buyers and
              agents pay per request, and Tollora handles discovery, payment
              verification, request forwarding, receipts, and usage logs.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Link href='/marketplace' className={buttonClasses({ size: 'lg' })}>
              Explore marketplace
            </Link>
            <Link
              href='/provider'
              className={buttonClasses({ variant: 'outline', size: 'lg' })}
            >
              List an API
            </Link>
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            {[
              { label: 'Published APIs', value: metrics.productCount },
              { label: 'API calls', value: metrics.totalCalls },
              { label: 'Provider share', value: '95%' }
            ].map(item => (
              <div
                key={item.label}
                className='border-foreground/10 bg-card/90 rounded-lg border p-4'
              >
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  {item.label}
                </p>
                <p className='mt-2 text-2xl font-semibold'>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {featuredProduct ? (
          <div className='bg-panel-sheen border-foreground/10 rounded-lg border p-4 shadow-sm'>
            <div className='border-foreground/10 bg-background/85 rounded-md border'>
              <div className='border-foreground/10 flex items-start justify-between gap-4 border-b p-5'>
                <div>
                  <Badge>Featured provider</Badge>
                  <h2 className='font-display mt-4 text-3xl'>
                    {featuredProduct.name}
                  </h2>
                  <p className='text-foreground/65 mt-2 text-sm leading-6'>
                    {featuredProduct.description}
                  </p>
                </div>
                <div className='bg-accent h-3 w-3 rounded-full' />
              </div>
              <div className='grid gap-4 p-5'>
                {[
                  ['Price', featuredProduct.priceLabel],
                  ['Settlement network', 'Mezo Testnet'],
                  ['Endpoint', featuredProduct.endpointPath],
                  ['Processing', featuredProduct.estimatedLatency]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className='bg-muted flex flex-col gap-1 rounded-md p-4'
                  >
                    <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                      {label}
                    </span>
                    <span className='text-sm font-semibold break-words'>
                      {value}
                    </span>
                  </div>
                ))}
                <Link
                  href={`/marketplace/${featuredProduct.slug}`}
                  className={buttonClasses({ variant: 'primary', size: 'sm' })}
                >
                  Open paid API
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className='mx-auto w-full max-w-6xl px-6 py-14'>
        <div className='mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end'>
          <div className='space-y-3'>
            <Badge>Payment flow</Badge>
            <h2 className='font-display text-3xl'>
              Discover, pay, call, and receive through one gateway.
            </h2>
          </div>
          <p className='text-foreground/70 max-w-md text-sm leading-6'>
            Tollora makes Bitcoin-backed MUSD usable for metered APIs, expensive
            AI workflows, and programmatic agent calls without account-specific
            API key setup.
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-4'>
          {flow.map(item => (
            <Card key={item.title} className='min-h-48'>
              <p className='text-lg font-semibold'>{item.title}</p>
              <p className='text-foreground/65 mt-4 text-sm leading-6'>
                {item.detail}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className='mx-auto w-full max-w-6xl px-6 py-14'>
        <div className='grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-start'>
          <div className='space-y-3'>
            <Badge>Use cases</Badge>
            <h2 className='font-display text-3xl'>
              API commerce for products that need instant settlement.
            </h2>
            <p className='text-foreground/70 text-sm leading-6'>
              MUSD is the medium of exchange across every listing, receipt, and
              provider dashboard.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            {useCases.map(item => (
              <Card key={item} className='min-h-28'>
                <p className='text-sm font-semibold'>{item}</p>
                <div className='bg-accent mt-6 h-1 w-12 rounded-full' />
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
