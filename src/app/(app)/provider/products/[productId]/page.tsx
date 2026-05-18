import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyEndpointButton } from '@/features/marketplace/copy-endpoint-button'
import { getProductBySlug } from '@/features/marketplace/products'
import { productStatusLabels } from '@/features/marketplace/status'

type ProviderProductPageProps = {
  params: Promise<{
    productId: string
  }>
}

export default async function ProviderProductPage({
  params
}: ProviderProductPageProps) {
  const { productId } = await params
  const product = getProductBySlug(productId)

  if (!product) {
    notFound()
  }

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Product operations</Badge>
        <div className='mt-4 grid gap-5 lg:grid-cols-[1fr_280px] lg:items-end'>
          <div className='space-y-3'>
            <h1 className='font-display text-4xl'>{product.name}</h1>
            <p className='text-foreground/70 max-w-3xl text-sm leading-6'>
              Manage listing metadata, endpoint health, pricing, and Tollora
              gateway actions for this MUSD-paid API.
            </p>
          </div>
          <Link
            href={`/marketplace/${product.slug}`}
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Open marketplace listing
          </Link>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[
          ['Status', productStatusLabels[product.status]],
          ['Price', product.priceLabel],
          ['Calls', product.calls.toString()],
          ['Success rate', product.successRate]
        ].map(([label, value]) => (
          <Card key={label}>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              {label}
            </p>
            <p className='mt-3 text-2xl font-semibold'>{value}</p>
          </Card>
        ))}
      </section>

      <section className='grid gap-5 xl:grid-cols-[1fr_0.8fr]'>
        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Gateway endpoint
          </p>
          <p className='font-mono text-sm break-words'>
            {product.endpointPath}
          </p>
          {product.providerEndpointUrl ? (
            <p className='text-foreground/65 text-sm break-words'>
              Upstream: {product.providerEndpointUrl}
            </p>
          ) : null}
          <div className='grid gap-3 md:grid-cols-3'>
            <Link
              href={`/orders/new?product=${product.slug}`}
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              Create payable request
            </Link>
            <Link
              href='/provider/usage'
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              View usage
            </Link>
            <CopyEndpointButton endpoint={product.endpointPath} />
          </div>
        </Card>
        <Card>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Request schema
          </p>
          <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
            {JSON.stringify(product.requestSchema, null, 2)}
          </pre>
        </Card>
      </section>
    </div>
  )
}
