import { NextResponse } from 'next/server'

import { recordMarketplaceOrder } from '@/features/marketplace/orders'
import { getProductBySlug } from '@/features/marketplace/products'
import { createOrderSchema } from '@/features/marketplace/schemas'
import type { MarketplaceOrder } from '@/features/marketplace/types'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createOrderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid order payload.',
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  const product = getProductBySlug(parsed.data.productSlug)

  if (!product) {
    return NextResponse.json(
      { error: 'API product was not found.' },
      { status: 404 }
    )
  }

  try {
    JSON.parse(parsed.data.requestPayloadJson)
  } catch {
    return NextResponse.json(
      { error: 'Request payload must contain valid JSON.' },
      { status: 400 }
    )
  }

  const requestId = `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  const createdAt = new Date().toISOString()

  const order: MarketplaceOrder = {
    id: orderId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    providerWallet: product.providerWallet,
    buyerWallet: parsed.data.buyerWallet,
    status: 'payment_required',
    amountMusd: product.priceLabel,
    requestId,
    requestPayloadJson: parsed.data.requestPayloadJson,
    createdAt,
    updatedAt: createdAt
  }

  recordMarketplaceOrder(order)

  return NextResponse.json(order)
}
