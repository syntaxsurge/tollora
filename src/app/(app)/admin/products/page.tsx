import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getPublishedProducts } from '@/features/marketplace/products'
import { productStatusLabels } from '@/features/marketplace/status'

export default function AdminProductsPage() {
  const products = getPublishedProducts()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Product moderation</Badge>
        <div className='mt-4 max-w-3xl space-y-3'>
          <h1 className='font-display text-4xl'>API listing review</h1>
          <p className='text-foreground/70 text-sm leading-6'>
            Review published products, provider identity, MUSD price, x402
            status, agent readiness, and listing health before promoting
            provider APIs.
          </p>
        </div>
      </section>

      <Card className='overflow-hidden p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[860px] text-left text-sm'>
            <thead className='bg-muted text-foreground/60'>
              <tr>
                {[
                  'Product',
                  'Provider',
                  'Category',
                  'Price',
                  'Agent',
                  'Status',
                  'Actions'
                ].map(header => (
                  <th key={header} className='px-5 py-3 font-medium'>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr
                  key={product.slug}
                  className='border-foreground/10 border-t'
                >
                  <td className='px-5 py-4 font-semibold'>{product.name}</td>
                  <td className='px-5 py-4'>{product.providerName}</td>
                  <td className='px-5 py-4'>{product.category}</td>
                  <td className='px-5 py-4'>{product.priceLabel}</td>
                  <td className='px-5 py-4'>
                    {product.isAgentReady ? 'Ready' : 'Manual'}
                  </td>
                  <td className='px-5 py-4'>
                    {productStatusLabels[product.status]}
                  </td>
                  <td className='px-5 py-4'>
                    <Link
                      href={`/provider/products/${product.slug}`}
                      className={buttonClasses({
                        variant: 'outline',
                        size: 'sm'
                      })}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
