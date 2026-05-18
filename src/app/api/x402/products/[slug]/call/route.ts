import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import type { HTTPProcessResult } from '@x402/core/server'

import {
  getMarketplaceOrderById,
  recordMarketplaceOrder,
  updateMarketplaceOrder
} from '@/features/marketplace/orders'
import type { ResolvedProductPrice } from '@/features/marketplace/pricing'
import {
  resolveFinalUsageDelta,
  resolveProductPrice
} from '@/features/marketplace/pricing'
import { getProductBySlug } from '@/features/marketplace/products'
import {
  buildExplorerUrl,
  buildReceiptAmounts,
  recordMarketplaceReceipt
} from '@/features/marketplace/receipts'
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

type VerifiedPaymentResult = Extract<
  HTTPProcessResult,
  { type: 'payment-verified' }
>

type TolloraRequestContext = {
  adapter: NextRequestAdapter
  path: string
  method: string
  paymentHeader?: string
}

type ProductCallRouteProps = {
  params: Promise<{
    slug: string
  }>
}

type ProductForCall = NonNullable<ReturnType<typeof getProductBySlug>>

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
  const requestedOrderId = request.headers.get('x-tollora-order-id')
  const existingOrder = requestedOrderId
    ? getMarketplaceOrderById(requestedOrderId)
    : undefined

  if (!product || !canCallProduct(product, existingOrder)) {
    return NextResponse.json(
      {
        error: 'API product was not found.',
        message:
          product?.status === 'draft'
            ? 'Draft products can only be tested by the provider owner from a matching Tollora order.'
            : 'The product is not published or available for this request.'
      },
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
  } satisfies TolloraRequestContext
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
  let resolvedPrice: ResolvedProductPrice

  try {
    resolvedPrice = await resolveProductPrice({
      product,
      requestPayload: payload
    })
  } catch (caughtError) {
    await processResult.cancellationDispatcher.cancel({
      reason: 'handler_failed',
      responseStatus: 400
    })

    return NextResponse.json(
      {
        error: 'Could not price this request.',
        message: describeUnknownError(caughtError),
        guidance:
          'Credit-metered products must expose a quote endpoint or a deterministic credit field before Tollora can request x402 payment.'
      },
      { status: 400 }
    )
  }

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

  const shouldSettleBeforeProvider =
    product.pricing.model === 'credit_metered' &&
    product.executionMode === 'asynchronous'

  if (shouldSettleBeforeProvider) {
    return handlePrepaidAsyncProviderCall({
      server,
      processResult,
      context,
      product,
      providerAdapter,
      payload,
      orderId,
      requestId,
      receiptId,
      resolvedPrice,
      createdAt,
      existingOrder
    })
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
    adapterResult,
    resolvedPrice
  })
  const settlementResponse = await settlePayment({
    server,
    processResult,
    context,
    responseBody: paidResponse
  })

  if (settlementResponse instanceof NextResponse) {
    return settlementResponse
  }

  const settlement = settlementResponse

  const receipt = {
    id: receiptId,
    orderId,
    requestId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    buyerWallet: settlement.payer ?? '',
    providerWallet: product.providerWallet,
    amountMusd: resolvedPrice.amountLabel,
    ...buildReceiptAmounts(resolvedPrice.amountUsd),
    network: x402Network as 'eip155:31611',
    txHash: settlement.transaction,
    explorerUrl: buildExplorerUrl(settlement.transaction),
    createdAt,
    resultUrl: adapterResult.resultUrl
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
    amountMusd: resolvedPrice.amountLabel,
    ...buildOrderPricingFields(resolvedPrice, resolvedPrice),
    resultReleaseStatus: 'released' as const,
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

function canCallProduct(
  product: ProductForCall,
  order: ReturnType<typeof getMarketplaceOrderById> | undefined
) {
  if (product.status === 'published') {
    return true
  }

  if (
    product.status !== 'draft' ||
    !order ||
    order.productSlug !== product.slug
  ) {
    return false
  }

  if (!product.ownerWallet) {
    return true
  }

  return order.buyerWallet.toLowerCase() === product.ownerWallet.toLowerCase()
}

async function handlePrepaidAsyncProviderCall({
  server,
  processResult,
  context,
  product,
  providerAdapter,
  payload,
  orderId,
  requestId,
  receiptId,
  resolvedPrice,
  createdAt,
  existingOrder
}: {
  server: Awaited<ReturnType<typeof getTolloraX402Server>>
  processResult: VerifiedPaymentResult
  context: TolloraRequestContext
  product: NonNullable<ReturnType<typeof getProductBySlug>>
  providerAdapter: NonNullable<ReturnType<typeof getProviderAdapter>>
  payload: unknown
  orderId: string
  requestId: string
  receiptId: string
  resolvedPrice: ResolvedProductPrice
  createdAt: string
  existingOrder: ReturnType<typeof getMarketplaceOrderById> | undefined
}) {
  const reservationResponse = buildReservationResponse({
    product,
    orderId,
    requestId,
    resolvedPrice
  })
  const settlementResponse = await settlePayment({
    server,
    processResult,
    context,
    responseBody: reservationResponse
  })

  if (settlementResponse instanceof NextResponse) {
    return settlementResponse
  }

  const settlement = settlementResponse
  const receipt = {
    id: receiptId,
    orderId,
    requestId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    buyerWallet: settlement.payer ?? '',
    providerWallet: product.providerWallet,
    amountMusd: resolvedPrice.amountLabel,
    ...buildReceiptAmounts(resolvedPrice.amountUsd),
    network: x402Network as 'eip155:31611',
    txHash: settlement.transaction,
    explorerUrl: buildExplorerUrl(settlement.transaction),
    createdAt
  }
  recordMarketplaceReceipt(receipt)

  const baseOrder = {
    id: orderId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    providerWallet: product.providerWallet,
    buyerWallet:
      settlement.payer ?? extractBuyerWallet(processResult.paymentPayload),
    status: 'paid' as const,
    amountMusd: resolvedPrice.amountLabel,
    ...buildOrderPricingFields(resolvedPrice, resolvedPrice),
    resultReleaseStatus: 'reserved' as const,
    requestId,
    requestPayloadJson:
      existingOrder?.requestPayloadJson ?? JSON.stringify(payload, null, 2),
    receiptId,
    explorerUrl: receipt.explorerUrl,
    createdAt: existingOrder?.createdAt ?? createdAt,
    updatedAt: createdAt
  }

  if (existingOrder) {
    updateMarketplaceOrder(orderId, baseOrder)
  } else {
    recordMarketplaceOrder(baseOrder)
  }

  const adapterResult = await providerAdapter.call({
    productSlug: product.slug,
    requestPayload: payload,
    orderId,
    requestId,
    receiptId,
    buyerWallet: baseOrder.buyerWallet
  })

  if (adapterResult.status === 'failed') {
    const failedOrder = updateMarketplaceOrder(orderId, {
      status: 'failed',
      responsePayload: adapterResult.responsePayload,
      resultReleaseStatus: 'refundable',
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json(
      {
        ...reservationResponse,
        error: adapterResult.errorMessage ?? 'Provider request failed.',
        order: failedOrder ?? {
          ...baseOrder,
          status: 'failed',
          responsePayload: adapterResult.responsePayload,
          resultReleaseStatus: 'refundable' as const
        },
        receipt,
        provider: {
          id: providerAdapter.id,
          response: adapterResult.responsePayload
        },
        x402: {
          network: settlement.network,
          transaction: settlement.transaction
        }
      },
      {
        headers: {
          ...settlement.headers,
          'X-Tollora-Receipt-Id': receiptId
        }
      }
    )
  }

  const usageDelta =
    adapterResult.status === 'completed'
      ? await resolveFinalUsageDelta({
          product,
          requestPayload: payload,
          providerResponse: adapterResult.responsePayload,
          paidAmountUsd: resolvedPrice.amountUsd
        }).catch(() => null)
      : null
  const resultReleaseStatus =
    usageDelta?.releaseStatus === 'delta_payment_required'
      ? 'delta_payment_required'
      : usageDelta?.releaseStatus === 'credit_due'
        ? 'credit_due'
        : adapterResult.status === 'completed'
          ? 'released'
          : 'reserved'
  const nextStatus =
    resultReleaseStatus === 'delta_payment_required'
      ? ('delta_payment_required' as const)
      : adapterResult.status
  const responsePayload =
    resultReleaseStatus === 'delta_payment_required'
      ? {
          status: 'ready',
          message:
            'Final usage exceeded the prepaid quote. Pay the delta before Tollora reveals the provider result.',
          externalJobId: adapterResult.externalJobId
        }
      : adapterResult.responsePayload

  const finalOrder = updateMarketplaceOrder(orderId, {
    status: nextStatus,
    externalJobId: adapterResult.externalJobId,
    responsePayload,
    lockedResponsePayload:
      resultReleaseStatus === 'delta_payment_required'
        ? adapterResult.responsePayload
        : undefined,
    resultUrl:
      resultReleaseStatus === 'delta_payment_required'
        ? undefined
        : adapterResult.resultUrl,
    lockedResultUrl:
      resultReleaseStatus === 'delta_payment_required'
        ? adapterResult.resultUrl
        : undefined,
    actualCredits: usageDelta?.actualPrice?.creditValue,
    actualAmountMusd: usageDelta?.actualPrice?.amountLabel,
    deltaAmountMusd:
      usageDelta && usageDelta.deltaUsd !== 0
        ? usageDelta.deltaLabel
        : '0.00 MUSD',
    resultReleaseStatus,
    updatedAt: new Date().toISOString()
  })

  const finalBody = {
    order: finalOrder,
    receipt,
    pricing: {
      quoted: resolvedPrice,
      actual: usageDelta?.actualPrice ?? null,
      deltaAmountMusd:
        usageDelta && usageDelta.deltaUsd !== 0
          ? usageDelta.deltaLabel
          : '0.00 MUSD',
      resultReleaseStatus
    },
    data: responsePayload,
    x402: {
      network: settlement.network,
      transaction: settlement.transaction
    }
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

async function settlePayment({
  server,
  processResult,
  context,
  responseBody
}: {
  server: Awaited<ReturnType<typeof getTolloraX402Server>>
  processResult: VerifiedPaymentResult
  context: TolloraRequestContext
  responseBody: unknown
}) {
  let settlementErrorMessage = ''
  const settlement = await server
    .processSettlement(
      processResult.paymentPayload,
      processResult.paymentRequirements,
      processResult.declaredExtensions,
      {
        request: context,
        responseBody: Buffer.from(JSON.stringify(responseBody)),
        responseHeaders: {
          'content-type': 'application/json'
        }
      }
    )
    .catch(error => {
      settlementErrorMessage = describeUnknownError(error)

      return null
    })

  if (!settlement) {
    return NextResponse.json(
      {
        error: 'MUSD settlement failed.',
        reason: 'settlement_exception',
        message:
          settlementErrorMessage ||
          'The x402 facilitator did not return a valid settlement response.',
        guidance:
          'Confirm the buyer wallet has MUSD, BTC gas, and MUSD Permit2 allowance on Mezo Testnet, then try again.',
        settlement: {
          status: 402
        }
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
        details: settlement.response.body ?? null,
        guidance: buildSettlementGuidance(
          settlement.errorReason,
          settlement.errorMessage,
          settlement.response.body
        ),
        settlement: {
          errorReason: settlement.errorReason,
          errorMessage: settlement.errorMessage,
          transaction: settlement.transaction,
          network: settlement.network,
          status: settlement.response.status
        }
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

  return settlement
}

function buildPaidResponse({
  product,
  orderId,
  requestId,
  adapterResult,
  resolvedPrice
}: {
  product: NonNullable<ReturnType<typeof getProductBySlug>>
  orderId: string
  requestId: string
  adapterResult: ProviderAdapterResult
  resolvedPrice: ResolvedProductPrice
}) {
  return {
    order: {
      id: orderId,
      requestId,
      status: adapterResult.status,
      productSlug: product.slug,
      productName: product.name,
      providerName: product.providerName,
      amountMusd: resolvedPrice.amountLabel,
      externalJobId: adapterResult.externalJobId,
      resultUrl: adapterResult.resultUrl
    },
    pricing: resolvedPrice,
    data: adapterResult.responsePayload ?? {
      status: adapterResult.status,
      requestId,
      externalJobId: adapterResult.externalJobId,
      resultUrl: adapterResult.resultUrl
    }
  }
}

function buildReservationResponse({
  product,
  orderId,
  requestId,
  resolvedPrice
}: {
  product: NonNullable<ReturnType<typeof getProductBySlug>>
  orderId: string
  requestId: string
  resolvedPrice: ResolvedProductPrice
}) {
  return {
    order: {
      id: orderId,
      requestId,
      status: 'paid',
      productSlug: product.slug,
      productName: product.name,
      providerName: product.providerName,
      amountMusd: resolvedPrice.amountLabel,
      resultReleaseStatus: 'reserved'
    },
    pricing: {
      quoted: resolvedPrice,
      resultReleaseStatus: 'reserved'
    },
    data: {
      status: 'paid',
      message:
        'The x402 payment settled before Tollora started the credit-metered provider job.'
    }
  }
}

function buildOrderPricingFields(
  quotedPrice: ResolvedProductPrice,
  paidPrice: ResolvedProductPrice
) {
  return {
    quotedCredits: quotedPrice.creditValue,
    quotedAmountMusd: quotedPrice.amountLabel,
    paidAmountMusd: paidPrice.amountLabel,
    reservedAmountMusd:
      quotedPrice.model === 'credit_metered'
        ? paidPrice.amountLabel
        : undefined,
    pricingSource: quotedPrice.source
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

function buildSettlementGuidance(
  reason: string | undefined,
  message: string | undefined,
  details: unknown
) {
  const haystack = [
    reason,
    message,
    typeof details === 'string' ? details : JSON.stringify(details ?? '')
  ]
    .join(' ')
    .toLowerCase()

  if (haystack.includes('balance') || haystack.includes('funds')) {
    return 'The paying wallet does not appear to have enough MUSD on Mezo Testnet for this API call.'
  }

  if (haystack.includes('allowance') || haystack.includes('permit2')) {
    return 'The paying wallet needs to approve MUSD Permit2 allowance before this x402 payment can settle.'
  }

  if (haystack.includes('signature') || haystack.includes('authorization')) {
    return 'The wallet signature was rejected by settlement. Re-run the payment and approve the latest x402 signature prompt.'
  }

  return 'Confirm the wallet has Mezo Testnet MUSD, BTC gas, and MUSD Permit2 allowance, then try again.'
}

function describeUnknownError(error: unknown) {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error
        ? ` Cause: ${error.cause.message}`
        : error.cause
          ? ` Cause: ${JSON.stringify(error.cause)}`
          : ''

    return `${error.message}${cause}`
  }

  return typeof error === 'string' ? error : 'Unknown settlement error'
}
