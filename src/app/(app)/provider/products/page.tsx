import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  type ApiProductStatus,
  getAllProducts
} from '@/features/marketplace/products'
import { productStatusLabels } from '@/features/marketplace/status'
import { cn } from '@/lib/utils/cn'

export default function ProviderProductsPage() {
  const products = getAllProducts()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Provider products</Badge>
        <div className='mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end'>
          <div className='max-w-3xl space-y-3'>
            <h1 className='font-display text-4xl'>API product management</h1>
            <p className='text-foreground/70 text-sm leading-6'>
              Publish draft APIs, run payable tests, inspect gateway paths, and
              track which listings are ready for marketplace buyers and agents.
            </p>
          </div>
          <Link
            href='/provider/products/new'
            className={buttonClasses({ size: 'sm' })}
          >
            Create product
          </Link>
        </div>
      </section>

      <section className='grid gap-4'>
        {products.length === 0 ? (
          <Card className='space-y-3'>
            <h2 className='text-xl font-semibold'>No API products yet</h2>
            <p className='text-foreground/65 text-sm leading-6'>
              Create a product to expose an external API through Tollora, attach
              private provider credentials, set a MUSD price, and make it
              available in the marketplace.
            </p>
            <Link
              href='/provider/products/new'
              className={buttonClasses({ size: 'sm' })}
            >
              Create product
            </Link>
          </Card>
        ) : null}
        {products.map(product => (
          <Card
            key={product.slug}
            className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_180px_180px_220px]'
          >
            <div>
              <div className='flex flex-wrap items-center gap-3'>
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  {product.providerName}
                </p>
                <StatusPill status={product.status} />
              </div>
              <h2 className='mt-3 text-xl font-semibold'>{product.name}</h2>
              <p className='text-foreground/65 mt-2 font-mono text-sm break-words'>
                {product.endpointPath}
              </p>
              <p className='text-foreground/65 mt-3 text-sm leading-6'>
                {getProductNextStep(product.status)}
              </p>
            </div>
            <Metric label='Price' value={product.priceLabel} />
            <Metric label='Calls' value={product.calls.toString()} />
            <div className='flex flex-col gap-2'>
              <Link
                href={`/provider/products/${product.slug}`}
                className={buttonClasses({ size: 'sm' })}
              >
                Manage and test
              </Link>
              <Link
                href={`/marketplace/${product.slug}`}
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                View listing
              </Link>
            </div>
          </Card>
        ))}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-foreground/60 text-xs uppercase'>{label}</p>
      <p className='mt-2 font-semibold'>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: ApiProductStatus }) {
  return (
    <span
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold',
        status === 'published' &&
          'border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        status === 'draft' &&
          'border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
        status === 'paused' &&
          'border-foreground/15 bg-muted text-foreground/70'
      )}
    >
      {productStatusLabels[status]}
    </span>
  )
}

function getProductNextStep(status: ApiProductStatus) {
  if (status === 'published') {
    return 'Live for marketplace buyers. Open management to run a paid test or pause the listing.'
  }

  if (status === 'paused') {
    return 'Hidden from buyers. Open management to republish when the provider endpoint is ready.'
  }

  return 'Drafts are private. Open management, run a payable test, then publish when the flow works.'
}
