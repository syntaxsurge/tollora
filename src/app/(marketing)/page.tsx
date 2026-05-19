import Link from 'next/link'

import {
  ArrowRight,
  Bot,
  Braces,
  CircleDollarSign,
  Clapperboard,
  DatabaseZap,
  FileCheck2,
  KeyRound,
  Network,
  ShieldCheck,
  Sparkles,
  WalletCards
} from 'lucide-react'

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
      icon: Bot,
      title: 'Plan',
      detail: 'OpenAI chooses the smallest useful set of paid tools.'
    },
    {
      icon: WalletCards,
      title: 'Spend',
      detail: 'x402 requests settle in MUSD before provider work starts.'
    },
    {
      icon: DatabaseZap,
      title: 'Deliver',
      detail: 'Tollora forwards paid calls and tracks direct or async results.'
    },
    {
      icon: FileCheck2,
      title: 'Prove',
      detail: 'Receipts, hashes, and proof pages make the run auditable.'
    }
  ]

  const useCases = [
    {
      icon: Clapperboard,
      title: 'AI media services',
      detail: 'Sell async video, design, rendering, and creative jobs.'
    },
    {
      icon: Network,
      title: 'Public data wrappers',
      detail: 'Package public APIs as priced tools with receipts.'
    },
    {
      icon: Bot,
      title: 'Agent tool markets',
      detail: 'Let agents buy only the tools that fit their budget.'
    },
    {
      icon: ShieldCheck,
      title: 'Auditable API spend',
      detail: 'Show customers what was paid, returned, and proved.'
    }
  ]
  const earningPaths = [
    {
      icon: Braces,
      title: 'Developers monetize their own APIs',
      detail:
        'List an endpoint, set fixed or metered pricing, and earn from every paid call routed through Tollora.'
    },
    {
      icon: KeyRound,
      title: 'Bring an upstream API key',
      detail:
        'Wrap a service you are authorized to use, keep the key server-side, and resell request access with your own margin.'
    },
    {
      icon: WalletCards,
      title: 'Accept MUSD without rebuilding billing',
      detail:
        'Use browser checkout, x402 programmatic calls, or funded agent runs without adding card billing flows.'
    },
    {
      icon: ShieldCheck,
      title: 'Show receipts customers can audit',
      detail:
        'Every paid action can attach order details, receipt IDs, settlement transactions, and proof metadata.'
    }
  ]

  return (
    <div className='bg-app-grid relative overflow-hidden'>
      <AuthRequiredToast reason={params.auth} nextPath={params.next} />
      <section className='container-page grid gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center lg:py-20'>
        <div className='space-y-7'>
          <Badge className='w-fit'>
            <Sparkles className='h-3.5 w-3.5' aria-hidden />
            Autonomous API commerce
          </Badge>
          <div className='space-y-5'>
            <h1 className='font-display max-w-3xl text-4xl leading-tight font-semibold text-balance sm:text-5xl lg:text-6xl'>
              AI agents that buy APIs, finish work, and prove every paid step.
            </h1>
            <p className='text-lead'>
              {siteConfig.description} Providers list paid tools, buyers run
              them with wallet checkout, and autonomous agents spend from a
              funded budget with receipts attached to the run.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Link href='/agents/new' className={buttonClasses({ size: 'lg' })}>
              Create agent run
              <ArrowRight className='h-4 w-4' aria-hidden />
            </Link>
            <Link
              href='/marketplace'
              className={buttonClasses({
                variant: 'outline',
                size: 'lg',
                className:
                  'hover:border-brand-orange/80 hover:bg-brand-orange/10 hover:shadow-brand-orange/25 focus-visible:ring-brand-orange/60 hover:shadow-md'
              })}
            >
              Browse APIs
            </Link>
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            {[
              { label: 'Agent-ready APIs', value: metrics.productCount },
              { label: 'Provider share', value: '95%' },
              { label: 'Settlement rail', value: 'MUSD' }
            ].map(item => (
              <div
                key={item.label}
                className='border-border bg-card/95 rounded-lg border p-4 shadow-sm'
              >
                <p className='text-muted-foreground text-xs tracking-[0.16em] uppercase'>
                  {item.label}
                </p>
                <p className='text-foreground mt-2 text-2xl font-semibold'>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {featuredProduct ? (
          <div className='border-border bg-card/95 rounded-lg border p-4 shadow-lg'>
            <div className='border-border bg-background/90 overflow-hidden rounded-lg border'>
              <div className='border-border flex items-start justify-between gap-4 border-b p-5'>
                <div className='min-w-0'>
                  <Badge className='w-fit'>
                    <Clapperboard className='h-3.5 w-3.5' aria-hidden />
                    Featured provider
                  </Badge>
                  <h2 className='font-display mt-4 text-3xl font-semibold text-balance'>
                    {featuredProduct.name}
                  </h2>
                  <p className='text-muted-foreground mt-2 text-sm leading-6'>
                    {featuredProduct.description}
                  </p>
                </div>
                <div className='bg-primary/10 text-primary rounded-lg p-3'>
                  <Clapperboard className='h-5 w-5' aria-hidden />
                </div>
              </div>
              <div className='grid gap-3 p-5 sm:grid-cols-2'>
                {[
                  ['Provider', featuredProduct.providerName],
                  ['Price', featuredProduct.priceLabel],
                  ['Mode', featuredProduct.executionMode],
                  ['Processing', featuredProduct.estimatedLatency],
                  ['Gateway', featuredProduct.endpointPath]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className='bg-muted/50 border-border flex flex-col gap-1 rounded-md border p-4'
                  >
                    <span className='text-muted-foreground text-xs tracking-[0.16em] uppercase'>
                      {label}
                    </span>
                    <span className='text-sm font-semibold break-words'>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className='border-border flex flex-wrap gap-3 border-t p-5'>
                <Link
                  href={`/marketplace/${featuredProduct.slug}`}
                  className={buttonClasses({ size: 'sm' })}
                >
                  View API
                </Link>
                <Link
                  href={`/agents/new?tool=${featuredProduct.slug}`}
                  className={buttonClasses({ variant: 'outline', size: 'sm' })}
                >
                  Use in agent
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className='container-page py-14'>
        <div className='mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end'>
          <div className='space-y-3'>
            <Badge>How it works</Badge>
            <h2 className='font-display text-3xl font-semibold'>
              One flow from AI plan to on-chain audit.
            </h2>
          </div>
          <p className='text-muted-foreground max-w-md text-sm leading-6'>
            Tollora keeps the user experience simple while preserving the parts
            judges care about: autonomous decisions, paid actions, settlement,
            and public proof.
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-4'>
          {flow.map(({ icon: Icon, ...item }) => (
            <Card
              key={item.title}
              className='hover:border-primary/50 min-h-48 transition hover:shadow-lg'
            >
              <Icon className='text-primary h-5 w-5' aria-hidden />
              <p className='text-lg font-semibold'>{item.title}</p>
              <p className='text-muted-foreground mt-4 text-sm leading-6'>
                {item.detail}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className='container-page py-14'>
        <div className='grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-start'>
          <div className='space-y-3'>
            <Badge>Use cases</Badge>
            <h2 className='font-display text-3xl font-semibold'>
              Useful APIs, not demo placeholders.
            </h2>
            <p className='text-muted-foreground text-sm leading-6'>
              Public no-key data tools make demos reliable. Provider-created
              products can add authenticated, credit-metered, or async services
              like media generation.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            {useCases.map(({ icon: Icon, title, detail }) => (
              <Card key={title} className='min-h-36'>
                <Icon className='text-primary h-5 w-5' aria-hidden />
                <p className='mt-4 text-sm font-semibold'>{title}</p>
                <p className='text-muted-foreground mt-2 text-sm leading-6'>
                  {detail}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className='container-page pb-16'>
        <div className='border-border bg-card/95 grid gap-6 rounded-lg border p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center'>
          <div>
            <Badge className='w-fit'>
              <CircleDollarSign className='h-3.5 w-3.5' aria-hidden />
              Marketplace revenue
            </Badge>
            <h2 className='font-display mt-4 text-3xl font-semibold'>
              List an API once. Let humans, apps, and agents pay per call.
            </h2>
            <p className='text-muted-foreground mt-3 max-w-2xl text-sm leading-6'>
              Tollora supports fixed pricing, credit-metered async work, browser
              checkout, programmatic x402 calls, and funded autonomous agent
              runs.
            </p>
          </div>
          <Link
            href='/provider/products/new'
            className={buttonClasses({ size: 'lg' })}
          >
            List a paid API
            <ArrowRight className='h-4 w-4' aria-hidden />
          </Link>
        </div>
      </section>

      <section className='container-page pb-16'>
        <div className='mb-8 max-w-3xl space-y-3'>
          <Badge>Provider upside</Badge>
          <h2 className='font-display text-3xl font-semibold'>
            Earn from APIs you build, own, or are allowed to resell.
          </h2>
          <p className='text-muted-foreground text-sm leading-6'>
            Tollora is not only for buyers and agents. It gives developers,
            creators, and power users a way to turn useful API access into a
            paid marketplace product.
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {earningPaths.map(({ icon: Icon, title, detail }) => (
            <Card key={title} className='min-h-44'>
              <Icon className='text-primary h-5 w-5' aria-hidden />
              <p className='mt-4 text-sm font-semibold'>{title}</p>
              <p className='text-muted-foreground mt-2 text-sm leading-6'>
                {detail}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
