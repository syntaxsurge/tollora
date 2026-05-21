import { NextResponse } from 'next/server'

import { recordMarketplaceOrder } from '@/features/marketplace/orders'
import { resolveProductPrice } from '@/features/marketplace/pricing'
import { getProductBySlug } from '@/features/marketplace/products'
import { sanitizeProductRequestPayload } from '@/features/marketplace/request-payload'
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

  const product = await getProductBySlug(parsed.data.productSlug)

  if (!product) {
    return NextResponse.json(
      { error: 'API product was not found.' },
      { status: 404 }
    )
  }

  if (
    product.status === 'draft' &&
    product.ownerWallet &&
    parsed.data.buyerWallet.toLowerCase() !==
      product.ownerWallet.toLowerCase() &&
    !parsed.data.allowDraftTest
  ) {
    return NextResponse.json(
      {
        error: 'Draft product is private.',
        message:
          'Only the provider owner wallet can create payable test orders for a draft listing.'
      },
      { status: 403 }
    )
  }

  let requestPayload: unknown

  try {
    requestPayload = JSON.parse(parsed.data.requestPayloadJson)
  } catch {
    return NextResponse.json(
      { error: 'Request payload must contain valid JSON.' },
      { status: 400 }
    )
  }

  const sanitizedRequestPayload = sanitizeProductRequestPayload({
    product,
    payload: requestPayload
  })
  const resolvedPrice = await resolveProductPrice({
    product,
    requestPayload: sanitizedRequestPayload
  }).catch(error => ({
    error:
      error instanceof Error
        ? error.message
        : 'Could not calculate a payable quote for this request.'
  }))

  if ('error' in resolvedPrice) {
    return NextResponse.json(
      {
        error: 'Could not price this request.',
        message: resolvedPrice.error
      },
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
    amountMusd: resolvedPrice.amountLabel,
    quotedCredits: resolvedPrice.creditValue,
    quotedAmountMusd: resolvedPrice.amountLabel,
    pricingSource: resolvedPrice.source,
    resultReleaseStatus:
      product.pricing.model === 'credit_metered'
        ? 'reserved'
        : 'not_applicable',
    isProviderTest: product.status === 'draft' && parsed.data.allowDraftTest,
    requestId,
    requestPayloadJson: JSON.stringify(sanitizedRequestPayload),
    createdAt,
    updatedAt: createdAt
  }

  recordMarketplaceOrder(order)

  return NextResponse.json(order)
}
