import { NextResponse } from 'next/server'

import {
  apiProductSchema,
  formatMusdAmount
} from '@/features/marketplace/schemas'

const createProviderProductSchema = apiProductSchema.extend({
  ownerWallet: apiProductSchema.shape.receivingWallet,
  providerDisplayName: apiProductSchema.shape.name
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createProviderProductSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid product payload.',
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  const payload = parsed.data

  try {
    JSON.parse(payload.requestSchemaJson)
    JSON.parse(payload.responseSchemaJson)

    if (payload.demoPayloadJson) {
      JSON.parse(payload.demoPayloadJson)
    }
  } catch {
    return NextResponse.json(
      { error: 'Schema and demo payload fields must contain valid JSON.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    productId: `product_${payload.slug}`,
    slug: payload.slug,
    status: payload.status,
    priceLabel: formatMusdAmount(payload.priceUsd)
  })
}
