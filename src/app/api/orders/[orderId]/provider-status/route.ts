import { NextResponse } from 'next/server'

import {
  getMarketplaceOrderById,
  updateMarketplaceOrder
} from '@/features/marketplace/orders'
import { getProviderAdapter } from '@/features/provider-adapters/registry'

type OrderProviderStatusRouteProps = {
  params: Promise<{
    orderId: string
  }>
}

export async function GET(
  _request: Request,
  { params }: OrderProviderStatusRouteProps
) {
  const { orderId } = await params
  const order = getMarketplaceOrderById(orderId)

  if (!order) {
    return NextResponse.json({ error: 'Order was not found.' }, { status: 404 })
  }

  if (!order.externalJobId) {
    return NextResponse.json(
      { error: 'This order does not have an async provider job.' },
      { status: 400 }
    )
  }

  const adapter = getProviderAdapter(order.productSlug)

  if (!adapter?.getStatus) {
    return NextResponse.json(
      { error: 'This provider does not expose a status polling adapter.' },
      { status: 400 }
    )
  }

  const providerResult = await adapter.getStatus(order.externalJobId)
  const nextOrder = updateMarketplaceOrder(order.id, {
    status: providerResult.status,
    externalJobId: providerResult.externalJobId ?? order.externalJobId,
    responsePayload: providerResult.responsePayload ?? order.responsePayload,
    resultUrl: providerResult.resultUrl ?? order.resultUrl
  })

  return NextResponse.json({
    order: nextOrder ?? order,
    provider: providerResult
  })
}
