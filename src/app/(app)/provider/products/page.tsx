import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getPublishedProducts } from '@/features/marketplace/products'
import { productStatusLabels } from '@/features/marketplace/status'

export default function ProviderProductsPage() {
  const products = getPublishedProducts()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Provider products</Badge>
        <div className='mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end'>
          <div className='max-w-3xl space-y-3'>
            <h1 className='font-display text-4xl'>API product management</h1>
            <p className='text-foreground/70 text-sm leading-6'>
              Review listings, pricing, status, gateway paths, and operational
              actions for MUSD-paid API products.
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
        {products.map(product => (
          <Card
            key={product.slug}
            className='grid gap-4 lg:grid-cols-[1fr_160px_160px_160px]'
          >
            <div>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                {product.providerName}
              </p>
              <h2 className='mt-2 text-lg font-semibold'>{product.name}</h2>
              <p className='text-foreground/65 mt-2 text-sm leading-6'>
                {product.endpointPath}
              </p>
            </div>
            <Metric label='Price' value={product.priceLabel} />
            <Metric
              label='Status'
              value={productStatusLabels[product.status]}
            />
            <div className='flex flex-col gap-2'>
              <Link
                href={`/provider/products/${product.slug}`}
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Manage
              </Link>
              <Link
                href={`/marketplace/${product.slug}`}
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
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
