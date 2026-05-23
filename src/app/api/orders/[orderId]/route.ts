import { NextResponse } from 'next/server'

import { syncMarketplaceOrderAsyncProviderStatus } from '@/features/marketplace/async-provider-polling'

type OrderRouteProps = {
  params: Promise<{
    orderId: string
  }>
}

export async function GET(request: Request, { params }: OrderRouteProps) {
  const { orderId } = await params
  const order = await syncMarketplaceOrderAsyncProviderStatus(
    orderId,
    new URL(request.url).origin
  )

  if (!order) {
    return NextResponse.json({ error: 'Order was not found.' }, { status: 404 })
  }

  return NextResponse.json(order)
}
