'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'
import type { ApiProduct } from '@/features/marketplace/products'
import type { MarketplaceOrder } from '@/features/marketplace/types'

type OrderCreateFormProps = {
  product: Pick<ApiProduct, 'slug' | 'referencePayload'>
}

export function OrderCreateForm({ product }: OrderCreateFormProps) {
  return (
    <WalletAddressConsumer>
      {({ address }) => (
        <OrderCreateFormFields product={product} connectedWallet={address} />
      )}
    </WalletAddressConsumer>
  )
}

function OrderCreateFormFields({
  product,
  connectedWallet
}: OrderCreateFormProps & {
  connectedWallet: string | null
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [buyerWallet, setBuyerWallet] = useState(connectedWallet ?? '')

  useEffect(() => {
    if (connectedWallet && !buyerWallet) {
      setBuyerWallet(connectedWallet)
    }
  }, [buyerWallet, connectedWallet])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: product.slug,
          buyerWallet: formData.get('buyerWallet'),
          requestPayloadJson: formData.get('requestPayloadJson')
        })
      })
      const order = (await response.json()) as MarketplaceOrder & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(order.error ?? 'Unable to prepare the API request.')
      }

      window.sessionStorage.setItem(
        `tollora:order:${order.id}`,
        JSON.stringify(order)
      )
      router.push(`/orders/${order.id}`)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to prepare the API request.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-5'>
      <Card className='space-y-4'>
        <label className='space-y-2'>
          <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Buyer wallet
          </span>
          <Input
            name='buyerWallet'
            value={buyerWallet}
            onChange={event => setBuyerWallet(event.target.value)}
            placeholder='Connect a wallet or paste the buyer wallet address'
            required
          />
          <span className='text-foreground/60 block text-xs leading-5'>
            This wallet owns the payable request record. Creating the request
            does not charge MUSD; settlement happens only when an x402 buyer
            client signs and submits payment.
          </span>
        </label>
        <label className='space-y-2'>
          <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Request payload
          </span>
          <textarea
            name='requestPayloadJson'
            defaultValue={JSON.stringify(product.referencePayload, null, 2)}
            className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 min-h-72 w-full rounded-2xl border px-4 py-3 font-mono text-xs leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            required
          />
        </label>
      </Card>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Preparing request' : 'Create payable request'}
        </Button>
        {error ? (
          <p className='text-sm text-red-600' role='alert'>
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
