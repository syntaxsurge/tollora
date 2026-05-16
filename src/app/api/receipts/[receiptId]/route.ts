import { NextResponse } from 'next/server'

import { getMarketplaceReceiptById } from '@/features/marketplace/receipts'

type ReceiptRouteProps = {
  params: Promise<{
    receiptId: string
  }>
}

export async function GET(_request: Request, { params }: ReceiptRouteProps) {
  const receipt = getMarketplaceReceiptById((await params).receiptId)

  if (!receipt) {
    return NextResponse.json(
      { error: 'Receipt was not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json(receipt)
}
