import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoOrders } from '@/features/marketplace/orders'
import { orderStatusLabels } from '@/features/marketplace/status'

export default function AdminOrdersPage() {
  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Order operations</Badge>
        <div className='mt-4 max-w-3xl space-y-3'>
          <h1 className='font-display text-4xl'>API request supervision</h1>
          <p className='text-foreground/70 text-sm leading-6'>
            Inspect buyer requests, provider routing, status, request IDs, and
            MUSD amounts across the Tollora gateway.
          </p>
        </div>
      </section>

      <Card className='overflow-hidden p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[860px] text-left text-sm'>
            <thead className='bg-muted text-foreground/60'>
              <tr>
                {[
                  'Order',
                  'Product',
                  'Buyer wallet',
                  'Amount',
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
              {demoOrders.map(order => (
                <tr key={order.id} className='border-foreground/10 border-t'>
                  <td className='px-5 py-4 font-mono'>{order.id}</td>
                  <td className='px-5 py-4'>{order.productName}</td>
                  <td className='px-5 py-4 font-mono'>{order.buyerWallet}</td>
                  <td className='px-5 py-4'>{order.amountMusd}</td>
                  <td className='px-5 py-4'>
                    {orderStatusLabels[order.status]}
                  </td>
                  <td className='px-5 py-4'>
                    <Link
                      href={`/orders/${order.id}`}
                      className={buttonClasses({
                        variant: 'outline',
                        size: 'sm'
                      })}
                    >
                      Inspect
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
