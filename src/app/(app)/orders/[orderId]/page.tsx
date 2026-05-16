import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OrderStatusClient } from '@/features/marketplace/order-status-client'
import { getMarketplaceOrderById } from '@/features/marketplace/orders'

type OrderDetailPageProps = {
  params: Promise<{
    orderId: string
  }>
}

export default async function OrderDetailPage({
  params
}: OrderDetailPageProps) {
  const { orderId } = await params
  const order = getMarketplaceOrderById(orderId) ?? null

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Order detail</Badge>
        <div className='mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end'>
          <div className='max-w-3xl space-y-3'>
            <h1 className='font-display text-4xl'>API request status</h1>
            <p className='text-foreground/70 text-sm leading-6'>
              Review payment state, provider processing state, request ID,
              amount, buyer wallet, and result readiness for a Tollora API call.
            </p>
          </div>
          <Link
            href='/orders'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Back to orders
          </Link>
        </div>
      </section>

      <Card>
        <OrderStatusClient orderId={orderId} initialOrder={order} />
      </Card>
    </div>
  )
}
