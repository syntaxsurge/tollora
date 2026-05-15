import { NextResponse } from 'next/server'

import { getDemoOrderById } from '@/features/marketplace/orders'

type OrderRouteProps = {
  params: Promise<{
    orderId: string
  }>
}

export async function GET(_request: Request, { params }: OrderRouteProps) {
  const { orderId } = await params
  const order = getDemoOrderById(orderId)

  if (!order) {
    return NextResponse.json({ error: 'Order was not found.' }, { status: 404 })
  }

  return NextResponse.json(order)
}
