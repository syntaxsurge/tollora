import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ApiProduct } from '@/features/marketplace/products'

type ProductCardProps = {
  product: ApiProduct
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className='flex min-h-[260px] flex-col gap-5'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge>{product.category}</Badge>
        {product.isX402Protected ? <Badge>x402 protected</Badge> : null}
        {product.isAgentReady ? <Badge>Agent-ready</Badge> : null}
      </div>
      <div className='space-y-2'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            {product.providerName}
          </p>
          <h2 className='font-display mt-2 text-2xl'>{product.name}</h2>
        </div>
        <p className='text-foreground/70 text-sm leading-6'>
          {product.description}
        </p>
      </div>
      <div className='border-foreground/10 mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-foreground/60 text-xs uppercase'>Price</p>
          <p className='text-lg font-semibold'>{product.priceLabel}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Link
            href={`/agents/new?tool=${product.slug}`}
            className={buttonClasses({ variant: 'primary', size: 'sm' })}
          >
            Use in agent
          </Link>
          <Link
            href={`/marketplace/${product.slug}`}
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            View API
          </Link>
        </div>
      </div>
    </Card>
  )
}
