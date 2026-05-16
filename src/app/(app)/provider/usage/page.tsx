import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { getAgentMetrics } from '@/features/agents/store'
import { marketplaceOrders } from '@/features/marketplace/orders'
import { getPublishedProducts } from '@/features/marketplace/products'
import { orderStatusLabels } from '@/features/marketplace/status'

export default function ProviderUsagePage() {
  const products = getPublishedProducts()
  const agentMetrics = getAgentMetrics()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Usage analytics</Badge>
        <div className='mt-4 max-w-3xl space-y-3'>
          <h1 className='font-display text-4xl'>API calls and revenue</h1>
          <p className='text-foreground/70 text-sm leading-6'>
            Monitor call volume, revenue, autonomous agent calls, buyer wallets,
            latency, and request IDs across provider listings.
          </p>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {products.slice(0, 4).map(product => (
          <Card key={product.slug}>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              {product.name}
            </p>
            <p className='mt-3 text-2xl font-semibold'>{product.calls}</p>
            <p className='text-foreground/65 mt-1 text-sm'>
              {product.revenueMusd} MUSD
            </p>
          </Card>
        ))}
      </section>

      <Card className='overflow-hidden p-0'>
        <div className='border-foreground/10 border-b p-5'>
          <h2 className='font-display text-2xl'>Recent API calls</h2>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[760px] text-left text-sm'>
            <thead className='bg-muted text-foreground/60'>
              <tr>
                {[
                  'Request ID',
                  'Product',
                  'Buyer wallet',
                  'Amount',
                  'Status'
                ].map(header => (
                  <th key={header} className='px-5 py-3 font-medium'>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marketplaceOrders.length > 0 ? (
                marketplaceOrders.map(order => (
                  <tr key={order.id} className='border-foreground/10 border-t'>
                    <td className='px-5 py-4 font-mono'>{order.requestId}</td>
                    <td className='px-5 py-4'>{order.productName}</td>
                    <td className='px-5 py-4 font-mono'>{order.buyerWallet}</td>
                    <td className='px-5 py-4'>{order.amountMusd}</td>
                    <td className='px-5 py-4'>
                      {orderStatusLabels[order.status]}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className='border-foreground/10 border-t'>
                  <td className='text-foreground/65 px-5 py-5' colSpan={5}>
                    No provider API calls have settled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className='grid gap-4 md:grid-cols-4'>
        {[
          ['Agent runs', agentMetrics.totalRuns.toString()],
          ['Completed runs', agentMetrics.completedRuns.toString()],
          ['Proofs', agentMetrics.proofCount.toString()],
          ['Agent spend', `${agentMetrics.totalSpendMusd} MUSD`]
        ].map(([label, value]) => (
          <div key={label}>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              {label}
            </p>
            <p className='mt-2 text-xl font-semibold'>{value}</p>
          </div>
        ))}
      </Card>
    </div>
  )
}
