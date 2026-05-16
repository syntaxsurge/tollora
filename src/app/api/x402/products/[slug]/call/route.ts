import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import type { HTTPProcessResult } from '@x402/core/server'

import { getProductBySlug } from '@/features/marketplace/products'
import {
  buildExplorerUrl,
  buildReceiptAmounts,
  recordMarketplaceReceipt
} from '@/features/marketplace/receipts'
import {
  getMarketplaceOrderById,
  recordMarketplaceOrder,
  updateMarketplaceOrder
} from '@/features/marketplace/orders'
import { getProviderAdapter } from '@/features/provider-adapters/registry'
import type { ProviderAdapterResult } from '@/features/provider-adapters/types'
import { x402Network } from '@/lib/config/chains'
import { envServer } from '@/lib/env/env.server'
import { NextRequestAdapter } from '@/lib/x402/next-request-adapter'
import {
  getTolloraPaywallConfig,
  getTolloraX402Server
} from '@/lib/x402/tollora-resource-server'

export const dynamic = 'force-dynamic'

type ProductCallRouteProps = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: ProductCallRouteProps
) {
  const payload = Object.fromEntries(request.nextUrl.searchParams.entries())

  return handlePaidProductCall(request, (await params).slug, payload)
}

export async function POST(
  request: NextRequest,
  { params }: ProductCallRouteProps
) {
  const payload = await request.json().catch(() => ({}))

  return handlePaidProductCall(request, (await params).slug, payload)
}

async function handlePaidProductCall(
  request: NextRequest,
  slug: string,
  payload: unknown
) {
  const product = getProductBySlug(slug)

  if (!product || product.status !== 'published') {
    return NextResponse.json(
      { error: 'API product was not found.' },
      { status: 404 }
    )
  }

  const adapter = new NextRequestAdapter(request, payload)
  const context = {
    adapter,
    path: request.nextUrl.pathname,
    method: request.method,
    paymentHeader:
      adapter.getHeader('payment-signature') ?? adapter.getHeader('x-payment')
  }
  const server = await getTolloraX402Server()
  const processResult = await server.processHTTPRequest(
    context,
    getTolloraPaywallConfig(request.url)
  )

  if (processResult.type === 'payment-error') {
    return toNextResponse(processResult, product)
  }

  if (processResult.type === 'no-payment-required') {
    return NextResponse.json(
      { error: 'Payment configuration was not available for this route.' },
      { status: 500 }
    )
  }

  const createdAt = new Date().toISOString()
  const requestedOrderId = adapter.getHeader('x-tollora-order-id')
  const existingOrder = requestedOrderId
    ? getMarketplaceOrderById(requestedOrderId)
    : undefined
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(payload))
    .update(product.slug)
    .digest('hex')
    .slice(0, 12)
  const requestId = existingOrder?.requestId ?? `req_${payloadHash}`
  const orderId = existingOrder?.id ?? `ord_${payloadHash}`
  const receiptId = `rcpt_${createHash('sha256')
    .update(orderId)
    .update(requestId)
    .digest('hex')
    .slice(0, 12)}`
  const providerAdapter = getProviderAdapter(product.slug)

  if (!providerAdapter) {
    await processResult.cancellationDispatcher.cancel({
      reason: 'handler_failed',
      responseStatus: 502
    })

    return NextResponse.json(
      { error: 'Provider adapter was not found.' },
      { status: 502 }
    )
  }

  const adapterResult = await providerAdapter.call({
    productSlug: product.slug,
    requestPayload: payload,
    orderId,
    requestId,
    receiptId,
    buyerWallet: extractBuyerWallet(processResult.paymentPayload)
  })

  if (adapterResult.status === 'failed') {
    await processResult.cancellationDispatcher.cancel({
      reason: 'handler_failed',
      responseStatus: 502
    })

    return NextResponse.json(
      {
        error: adapterResult.errorMessage ?? 'Provider request failed.',
        provider: {
          id: providerAdapter.id,
          response: adapterResult.responsePayload
        }
      },
      { status: 502 }
    )
  }

  const paidResponse = buildPaidResponse({
    product,
    orderId,
    requestId,
    adapterResult
  })
  const responseBody = Buffer.from(JSON.stringify(paidResponse))
  let settlementErrorMessage = ''
  const settlement = await server
    .processSettlement(
      processResult.paymentPayload,
      processResult.paymentRequirements,
      processResult.declaredExtensions,
      {
        request: context,
        responseBody,
        responseHeaders: {
          'content-type': 'application/json'
        }
      }
    )
    .catch(error => {
      settlementErrorMessage =
        error instanceof Error ? error.message : 'Unknown settlement error'

      return null
    })

  if (!settlement) {
    return NextResponse.json(
      {
        error: 'MUSD settlement failed.',
        message:
          settlementErrorMessage ||
          'The x402 facilitator did not return a valid settlement response. Confirm the buyer wallet has MUSD on Mezo Testnet and try again.'
      },
      { status: 402 }
    )
  }

  if (!settlement.success) {
    return NextResponse.json(
      {
        error: 'MUSD settlement failed.',
        reason: settlement.errorReason,
        message: settlement.errorMessage,
        details: settlement.response.body ?? null
      },
      {
        status: settlement.response.status,
        headers: {
          ...settlement.response.headers,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  const receipt = {
    id: receiptId,
    orderId,
    requestId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    buyerWallet: settlement.payer ?? '',
    providerWallet: product.providerWallet,
    amountMusd: product.priceLabel,
    ...buildReceiptAmounts(product.priceUsd),
    network: x402Network as 'eip155:31611',
    txHash: settlement.transaction,
    explorerUrl: buildExplorerUrl(settlement.transaction),
    createdAt
  }
  recordMarketplaceReceipt(receipt)

  const finalBody = {
    ...paidResponse,
    order: {
      ...paidResponse.order,
      receiptId,
      externalJobId: adapterResult.externalJobId,
      resultUrl: adapterResult.resultUrl,
      explorerUrl: receipt.explorerUrl
    },
    receipt,
    x402: {
      network: settlement.network,
      transaction: settlement.transaction
    }
  }
  const nextOrder = {
    id: orderId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    providerWallet: product.providerWallet,
    buyerWallet:
      settlement.payer ?? extractBuyerWallet(processResult.paymentPayload),
    status: adapterResult.status,
    amountMusd: product.priceLabel,
    requestId,
    requestPayloadJson:
      existingOrder?.requestPayloadJson ?? JSON.stringify(payload, null, 2),
    receiptId,
    externalJobId: adapterResult.externalJobId,
    explorerUrl: receipt.explorerUrl,
    responsePayload: adapterResult.responsePayload ?? finalBody.data,
    resultUrl: adapterResult.resultUrl,
    createdAt: existingOrder?.createdAt ?? createdAt,
    updatedAt: createdAt
  }

  if (existingOrder) {
    updateMarketplaceOrder(orderId, nextOrder)
  } else {
    recordMarketplaceOrder(nextOrder)
  }

  return NextResponse.json(finalBody, {
    headers: {
      ...settlement.headers,
      'X-Tollora-Receipt-Id': receiptId
    }
  })
}

function toNextResponse(
  processResult: Extract<HTTPProcessResult, { type: 'payment-error' }>,
  product: NonNullable<ReturnType<typeof getProductBySlug>>
) {
  const { response } = processResult

  if (response.isHtml) {
    return new NextResponse(
      JSON.stringify({
        error: 'MUSD payment required.',
        product: {
          slug: product.slug,
          name: product.name,
          providerName: product.providerName,
          priceLabel: product.priceLabel,
          endpointPath: product.endpointPath
        },
        payment: {
          network: x402Network,
          scheme: 'exact',
          facilitatorUrl:
            envServer.X402_FACILITATOR_URL ?? 'https://facilitator.vativ.io/'
        }
      }),
      {
        status: response.status,
        headers: {
          ...response.headers,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  return new NextResponse(JSON.stringify(response.body ?? {}), {
    status: response.status,
    headers: {
      ...response.headers,
      'Content-Type': 'application/json'
    }
  })
}

function buildPaidResponse({
  product,
  orderId,
  requestId,
  adapterResult
}: {
  product: NonNullable<ReturnType<typeof getProductBySlug>>
  orderId: string
  requestId: string
  adapterResult: ProviderAdapterResult
}) {
  return {
    order: {
      id: orderId,
      requestId,
      status: adapterResult.status,
      productSlug: product.slug,
      productName: product.name,
      providerName: product.providerName,
      amountMusd: product.priceLabel,
      externalJobId: adapterResult.externalJobId,
      resultUrl: adapterResult.resultUrl
    },
    data: adapterResult.responsePayload ?? {
      status: adapterResult.status,
      requestId,
      externalJobId: adapterResult.externalJobId,
      resultUrl: adapterResult.resultUrl
    }
  }
}

function extractBuyerWallet(paymentPayload: unknown) {
  const payload = paymentPayload as {
    payload?: {
      authorization?: {
        from?: string
      }
    }
  }

  return payload.payload?.authorization?.from ?? ''
}
