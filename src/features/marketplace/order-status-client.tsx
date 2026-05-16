'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { MarketplaceReceipt } from '@/features/marketplace/receipts'
import {
  orderStatusDetails,
  orderStatusLabels
} from '@/features/marketplace/status'
import type { MarketplaceOrder } from '@/features/marketplace/types'

type OrderStatusClientProps = {
  orderId: string
  initialOrder: MarketplaceOrder | null
}

export function OrderStatusClient({
  orderId,
  initialOrder
}: OrderStatusClientProps) {
  const [order, setOrder] = useState<MarketplaceOrder | null>(initialOrder)
  const [status, setStatus] = useState('')
  const [paymentHeader, setPaymentHeader] = useState('')
  const [paymentRequirements, setPaymentRequirements] = useState<unknown>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (order) {
      return
    }

    const saved = window.sessionStorage.getItem(`tollora:order:${orderId}`)

    if (saved) {
      setOrder(JSON.parse(saved) as MarketplaceOrder)
    }
  }, [order, orderId])

  async function runOrder() {
    if (!order) {
      return
    }

    setIsRunning(true)
    setStatus('')
    setPaymentRequirements(null)

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    if (paymentHeader.trim()) {
      headers['X-PAYMENT'] = paymentHeader.trim()
    }

    try {
      const response = await fetch(
        `/api/x402/products/${order.productSlug}/call`,
        {
          method: 'POST',
          headers,
          body: order.requestPayloadJson ?? '{}'
        }
      )
      const body = (await response.json()) as {
        error?: string
        order?: Partial<MarketplaceOrder>
        receipt?: MarketplaceReceipt
      }

      if (response.status === 402) {
        setPaymentRequirements(body)
        setStatus(
          'Payment requirements returned. Sign the request and retry with the X-PAYMENT header.'
        )
        return
      }

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to run the paid API request.')
      }

      const receipt = body.receipt
        ? {
            ...body.receipt,
            orderId: order.id
          }
        : undefined
      const nextOrder: MarketplaceOrder = {
        ...order,
        ...body.order,
        id: order.id,
        status: (body.order?.status as MarketplaceOrder['status']) ?? 'paid',
        receiptId: receipt?.id,
        explorerUrl: receipt?.explorerUrl,
        updatedAt: new Date().toISOString()
      }

      window.sessionStorage.setItem(
        `tollora:order:${order.id}`,
        JSON.stringify(nextOrder)
      )

      if (receipt) {
        window.sessionStorage.setItem(
          `tollora:receipt:${receipt.id}`,
          JSON.stringify(receipt)
        )
      }

      setOrder(nextOrder)
      setStatus('MUSD payment settled and provider response returned.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to run the paid API request.'
      )
    } finally {
      setIsRunning(false)
    }
  }

  if (!order) {
    return (
      <div>
        <p className='font-semibold'>Order not found</p>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          The order record is not available in the current browser session.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-5'>
      <div className='grid gap-4 md:grid-cols-3'>
        {[
          ['Product', order.productName],
          ['Amount', order.amountMusd],
          ['Status', orderStatusLabels[order.status]]
        ].map(([label, value]) => (
          <div key={label} className='bg-muted rounded-lg p-4'>
            <p className='text-foreground/60 text-xs uppercase'>{label}</p>
            <p className='mt-1 font-semibold'>{value}</p>
          </div>
        ))}
      </div>
      <div className='border-foreground/10 rounded-lg border p-5'>
        <p className='text-sm font-semibold'>
          {orderStatusLabels[order.status]}
        </p>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          {orderStatusDetails[order.status]}
        </p>
      </div>
      {order.status === 'payment_required' ? (
        <Card className='space-y-4'>
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Signed x402 payment header
            </span>
            <Input
              value={paymentHeader}
              onChange={event => setPaymentHeader(event.target.value)}
              aria-label='Signed x402 payment header'
            />
          </label>
          <p className='text-foreground/65 text-sm leading-6'>
            Run without a header to inspect the HTTP 402 response. Run again
            with a signed x402 payment header to settle MUSD on Mezo Testnet and
            receive the paid API result.
          </p>
        </Card>
      ) : null}
      {paymentRequirements ? (
        <Card>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Payment requirements
          </p>
          <pre className='bg-muted mt-4 max-h-80 overflow-auto rounded-lg p-4 text-xs leading-6'>
            {JSON.stringify(paymentRequirements, null, 2)}
          </pre>
        </Card>
      ) : null}
      <div className='grid gap-3 text-sm md:grid-cols-2'>
        {[
          ['Order ID', order.id],
          ['Request ID', order.requestId],
          ['Provider', order.providerName],
          ['Provider wallet', order.providerWallet ?? ''],
          ['Buyer wallet', order.buyerWallet],
          ['Created', new Date(order.createdAt).toLocaleString()],
          ['Updated', new Date(order.updatedAt).toLocaleString()]
        ].map(([label, value]) => (
          <div
            key={label}
            className='border-foreground/10 rounded-lg border p-4'
          >
            <p className='text-foreground/60 text-xs uppercase'>{label}</p>
            <p className='mt-1 font-semibold break-words'>{value}</p>
          </div>
        ))}
      </div>
      {order.receiptId ? (
        <div className='grid gap-3 text-sm md:grid-cols-2'>
          <div className='border-foreground/10 rounded-lg border p-4'>
            <p className='text-foreground/60 text-xs uppercase'>Receipt</p>
            <a
              className='text-foreground mt-1 block font-semibold underline-offset-4 hover:underline'
              href={`/receipts/${order.receiptId}`}
            >
              {order.receiptId}
            </a>
          </div>
          {order.explorerUrl ? (
            <div className='border-foreground/10 rounded-lg border p-4'>
              <p className='text-foreground/60 text-xs uppercase'>
                Explorer
              </p>
              <a
                className='text-foreground mt-1 block font-semibold underline-offset-4 hover:underline'
                href={order.explorerUrl}
                target='_blank'
                rel='noreferrer'
              >
                View transaction
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
      {order.agentRunId ? (
        <div className='border-foreground/10 rounded-lg border p-4 text-sm'>
          <p className='text-foreground/60 text-xs uppercase'>Agent run</p>
          <a
            className='text-foreground mt-1 block font-semibold underline-offset-4 hover:underline'
            href={`/agents/${order.agentRunId}`}
          >
            {order.agentRunId}
          </a>
        </div>
      ) : null}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button
          onClick={runOrder}
          disabled={order.status !== 'payment_required' || isRunning}
        >
          {isRunning ? 'Running paid request' : 'Pay and run'}
        </Button>
        {status ? (
          <p className='text-foreground/65 text-sm' role='status'>
            {status}
          </p>
        ) : null}
      </div>
    </div>
  )
}
