import Link from 'next/link'

import { Bot, ExternalLink } from 'lucide-react'

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
            <h1 className='font-display text-4xl'>Orders</h1>
            <p className='text-foreground/70 text-sm leading-6'>
              Track paid API requests, provider status, and receipts.
            </p>
          </div>
          <Link
            href='/agents'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            <Bot className='h-4 w-4' aria-hidden />
            Agents
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
                <ExternalLink className='h-4 w-4' aria-hidden />
                Open
              </Link>
            </Card>
          ))
        ) : (
          <Card>
            <p className='font-semibold'>
              No paid API orders have been created.
            </p>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              Create an order from the marketplace or run an agent.
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
