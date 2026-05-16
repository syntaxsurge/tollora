import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getProductBySlug,
  marketplaceProducts
} from '@/features/marketplace/products'

type ProductPageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return marketplaceProducts.map(product => ({ slug: product.slug }))
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <div className='grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge>{product.category}</Badge>
              <Badge>{product.method}</Badge>
              {product.isX402Protected ? <Badge>x402 protected</Badge> : null}
              {product.isAgentReady ? <Badge>Agent-ready</Badge> : null}
            </div>
            <div>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                {product.providerName}
              </p>
              <h1 className='font-display mt-2 text-4xl'>{product.name}</h1>
            </div>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              {product.description}
            </p>
            <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
              <Link
                href={`/orders/new?product=${product.slug}`}
                className={buttonClasses({ size: 'sm' })}
              >
                Pay and run
              </Link>
              <Link
                href={`/agents/new?tool=${product.slug}`}
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Use in agent run
              </Link>
              <Link
                href='/developers/docs'
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Open developer example
              </Link>
            </div>
          </div>
          <Card className='bg-background/85 space-y-4'>
            {[
              ['Price', product.priceLabel],
              ['Settlement', 'MUSD on Mezo Testnet'],
              ['Processing', product.estimatedLatency],
              ['Endpoint', product.endpointPath]
            ].map(([label, value]) => (
              <div key={label}>
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  {label}
                </p>
                <p className='mt-1 text-sm font-semibold break-words'>
                  {value}
                </p>
              </div>
            ))}
          </Card>
        </div>
      </section>

      <section className='grid gap-5 xl:grid-cols-2'>
        <SchemaCard title='Request schema' schema={product.requestSchema} />
        <SchemaCard title='Response schema' schema={product.responseSchema} />
      </section>

      <section className='grid gap-5 xl:grid-cols-[0.9fr_1.1fr]'>
        <Card>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Reference request body
          </p>
          <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
            {JSON.stringify(product.referencePayload, null, 2)}
          </pre>
        </Card>
        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Agent call
          </p>
          <p className='text-foreground/70 text-sm leading-6'>
            A programmatic client calls the Tollora endpoint, receives HTTP 402
            payment requirements, signs an MUSD payment for Mezo Testnet,
            retries with the payment payload, and receives the provider response
            plus receipt metadata. Launch Pack Agent can call this tool as one
            paid action and include the receipt in its public Mezo proof.
          </p>
          <pre className='bg-muted overflow-auto rounded-lg p-4 text-xs leading-6'>
            {`curl -X ${product.method} ${product.endpointPath} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(product.referencePayload)}'`}
          </pre>
        </Card>
      </section>
    </div>
  )
}

function SchemaCard({
  title,
  schema
}: {
  title: string
  schema: Record<string, string>
}) {
  return (
    <Card>
      <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {title}
      </p>
      <div className='mt-4 grid gap-3'>
        {Object.entries(schema).map(([field, type]) => (
          <div
            key={field}
            className='border-foreground/10 grid gap-2 rounded-lg border p-4 sm:grid-cols-[180px_1fr]'
          >
            <span className='font-mono text-sm font-semibold'>{field}</span>
            <span className='text-foreground/70 font-mono text-sm'>{type}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
