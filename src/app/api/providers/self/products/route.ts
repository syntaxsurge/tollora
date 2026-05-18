import { NextResponse } from 'next/server'

import {
  type ApiProduct,
  recordProviderProduct,
  getProductBySlug
} from '@/features/marketplace/products'
import {
  formatMusdAmount,
  providerProductInputSchema
} from '@/features/marketplace/schemas'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = providerProductInputSchema.safeParse(body)

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
  const existing = getProductBySlug(payload.slug)

  if (existing) {
    return NextResponse.json(
      { error: 'API product slug is already in use.' },
      { status: 409 }
    )
  }

  let requestSchema: Record<string, string>
  let responseSchema: Record<string, string>
  let referencePayload: Record<string, unknown>
  try {
    requestSchema = parseSchemaJson(payload.requestSchemaJson, 'request schema')
    responseSchema = parseSchemaJson(
      payload.responseSchemaJson,
      'response schema'
    )
    referencePayload = payload.referencePayloadJson
      ? parseReferencePayload(payload.referencePayloadJson)
      : {}
  } catch {
    return NextResponse.json(
      { error: 'Schema and reference payload fields must contain valid JSON.' },
      { status: 400 }
    )
  }

  const product: ApiProduct = {
    slug: payload.slug,
    name: payload.name,
    providerName: payload.providerDisplayName,
    providerSlug: slugify(payload.providerDisplayName),
    providerWallet: payload.receivingWallet as `0x${string}`,
    category: payload.category,
    description: payload.description,
    priceUsd: payload.priceUsd,
    priceLabel: formatMusdAmount(payload.priceUsd),
    method: payload.method,
    endpointPath: `/api/x402/products/${payload.slug}/call`,
    providerEndpointUrl: payload.endpointUrl,
    providerAuth: {
      type: payload.authType,
      headerName: payload.authHeaderName || undefined,
      queryParam: payload.authQueryParam || undefined,
      secret: payload.authSecret || undefined,
      username: payload.authUsername || undefined,
      password: payload.authPassword || undefined
    },
    polling: {
      statusEndpointUrl: payload.statusEndpointUrl || undefined,
      method: payload.statusMethod,
      externalJobIdPath: payload.externalJobIdPath || undefined,
      statusPath: payload.statusPath || undefined,
      resultUrlPath: payload.resultUrlPath || undefined,
      errorMessagePath: payload.errorMessagePath || undefined
    },
    timeoutSeconds: payload.timeoutSeconds,
    idempotencyHeader: payload.idempotencyHeader || undefined,
    estimatedLatency: payload.estimatedLatency,
    executionMode: payload.executionMode,
    settlementModel: payload.settlementModel,
    resultDelivery: payload.resultDelivery,
    requestSchema,
    responseSchema,
    referencePayload,
    isX402Protected: payload.isX402Protected,
    isAgentReady: payload.isAgentReady,
    status: payload.status,
    featured: payload.status === 'published',
    calls: 0,
    successRate: 'No calls yet',
    revenueMusd: '0.00'
  }
  recordProviderProduct(product)

  return NextResponse.json({
    productId: `product_${payload.slug}`,
    slug: payload.slug,
    status: payload.status,
    priceLabel: formatMusdAmount(payload.priceUsd)
  })
}

function parseSchemaJson(value: string, label: string) {
  const parsed = JSON.parse(value) as unknown

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`)
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, type]) => [key, String(type)])
  )
}

function parseReferencePayload(value: string) {
  const parsed = JSON.parse(value) as unknown

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('reference payload must be a JSON object.')
  }

  return parsed as Record<string, unknown>
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'provider'
  )
}
