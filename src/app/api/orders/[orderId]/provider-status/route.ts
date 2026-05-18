import { NextResponse } from 'next/server'

import {
  getMarketplaceOrderById,
  updateMarketplaceOrder
} from '@/features/marketplace/orders'
import { resolveFinalUsageDelta } from '@/features/marketplace/pricing'
import { getProductBySlug } from '@/features/marketplace/products'
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

  const providerResult = await adapter.getStatus(
    order.externalJobId,
    order.productSlug
  )
  const product = getProductBySlug(order.productSlug)
  const paidAmountUsd = parseMusdLabel(order.paidAmountMusd ?? order.amountMusd)
  const requestPayload = parseJsonOrEmpty(order.requestPayloadJson)
  const usageDelta =
    product && providerResult.status === 'completed'
      ? await resolveFinalUsageDelta({
          product,
          requestPayload,
          providerResponse: providerResult.responsePayload,
          paidAmountUsd
        }).catch(() => null)
      : null
  const resultReleaseStatus =
    usageDelta?.releaseStatus === 'delta_payment_required'
      ? 'delta_payment_required'
      : usageDelta?.releaseStatus === 'credit_due'
        ? 'credit_due'
        : providerResult.status === 'completed'
          ? 'released'
          : order.resultReleaseStatus
  const nextStatus =
    resultReleaseStatus === 'delta_payment_required'
      ? ('delta_payment_required' as const)
      : providerResult.status
  const responsePayload =
    resultReleaseStatus === 'delta_payment_required'
      ? {
          status: 'ready',
          message:
            'Final usage exceeded the prepaid quote. Pay the delta before Tollora reveals the provider result.',
          externalJobId: providerResult.externalJobId ?? order.externalJobId
        }
      : (providerResult.responsePayload ?? order.responsePayload)
  const nextOrder = updateMarketplaceOrder(order.id, {
    status: nextStatus,
    externalJobId: providerResult.externalJobId ?? order.externalJobId,
    responsePayload,
    lockedResponsePayload:
      resultReleaseStatus === 'delta_payment_required'
        ? providerResult.responsePayload
        : order.lockedResponsePayload,
    resultUrl:
      resultReleaseStatus === 'delta_payment_required'
        ? undefined
        : (providerResult.resultUrl ?? order.resultUrl),
    lockedResultUrl:
      resultReleaseStatus === 'delta_payment_required'
        ? providerResult.resultUrl
        : order.lockedResultUrl,
    actualCredits: usageDelta?.actualPrice?.creditValue ?? order.actualCredits,
    actualAmountMusd:
      usageDelta?.actualPrice?.amountLabel ?? order.actualAmountMusd,
    deltaAmountMusd:
      usageDelta && usageDelta.deltaUsd !== 0
        ? usageDelta.deltaLabel
        : order.deltaAmountMusd,
    resultReleaseStatus
  })

  return NextResponse.json({
    order: nextOrder ?? order,
    provider:
      resultReleaseStatus === 'delta_payment_required'
        ? {
            status: 'ready',
            externalJobId: providerResult.externalJobId ?? order.externalJobId,
            errorMessage:
              'Final usage exceeded the prepaid quote. The result is locked until the delta is paid.'
          }
        : providerResult,
    pricing: {
      actual: usageDelta?.actualPrice ?? null,
      deltaAmountMusd:
        usageDelta && usageDelta.deltaUsd !== 0
          ? usageDelta.deltaLabel
          : '0.00 MUSD',
      resultReleaseStatus
    }
  })
}

function parseMusdLabel(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ''))

  return Number.isFinite(amount) ? amount : 0
}

function parseJsonOrEmpty(value: string | undefined) {
  if (!value) {
    return {}
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return {}
  }
}
