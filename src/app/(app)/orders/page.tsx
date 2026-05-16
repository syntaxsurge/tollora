import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  marketplaceOrders,
  getOrderMetrics
} from '@/features/marketplace/orders'
import { orderStatusLabels } from '@/features/marketplace/status'

export default function OrdersPage() {
  const metrics = getOrderMetrics()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Orders</Badge>
        <div className='mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end'>
          <div className='max-w-3xl space-y-3'>
            <h1 className='font-display text-4xl'>Buyer order lifecycle</h1>
            <p className='text-foreground/70 text-sm leading-6'>
              Track paid API requests from payment requirement through provider
              processing, completion, failure, or expiration. Autonomous agent
              orders link the same lifecycle to launch-pack runs and proof
              pages.
            </p>
          </div>
          <Link
            href='/agents'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Open agents
          </Link>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-4'>
        {[
          ['Total orders', metrics.total.toString()],
          ['Completed', metrics.completed.toString()],
          ['Processing', metrics.processing.toString()],
          ['Payment required', metrics.paymentRequired.toString()]
        ].map(([label, value]) => (
          <Card key={label}>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              {label}
            </p>
            <p className='mt-3 text-2xl font-semibold'>{value}</p>
          </Card>
        ))}
      </section>

      <section className='grid gap-4'>
        {marketplaceOrders.length > 0 ? (
          marketplaceOrders.map(order => (
            <Card
              key={order.id}
              className='grid gap-4 lg:grid-cols-[1fr_160px_180px_130px]'
            >
              <div>
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  {order.providerName}
                </p>
                <h2 className='mt-2 text-lg font-semibold'>
                  {order.productName}
                </h2>
                <p className='text-foreground/65 mt-2 font-mono text-xs'>
                  {order.requestId}
                </p>
              </div>
              <Metric label='Amount' value={order.amountMusd} />
              <Metric label='Status' value={orderStatusLabels[order.status]} />
              <Link
                href={`/orders/${order.id}`}
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Open order
              </Link>
            </Card>
          ))
        ) : (
          <Card>
            <p className='font-semibold'>
              No paid API orders have been created.
            </p>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              Create an order from the marketplace or execute an agent run to
              populate this lifecycle view with real request records.
            </p>
          </Card>
        )}
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
