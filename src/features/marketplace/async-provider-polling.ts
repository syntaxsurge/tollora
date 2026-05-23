import {
  getMarketplaceOrderById,
  updateMarketplaceOrder
} from '@/features/marketplace/orders'
import type {
  MarketplaceAsyncPollingResponse,
  MarketplaceOrder
} from '@/features/marketplace/types'
import {
  compactJsonPayload,
  compactProviderRequestTrace
} from '@/lib/utils/json-payload'

export type ProviderStatusResponse = {
  error?: string
  order?: MarketplaceOrder
  provider?: {
    status?: string
    externalJobId?: string
    resultUrl?: string
    responsePayload?: unknown
    errorMessage?: string
    [key: string]: unknown
  }
  pricing?: unknown
  escrow?: unknown
}

export type AsyncProviderPollingRequest = {
  method: 'GET'
  url: string
  headers: { Accept: 'application/json' }
  params: { orderId: string }
}

const terminalOrderStatuses = new Set<MarketplaceOrder['status']>([
  'completed',
  'failed',
  'expired',
  'delta_payment_required'
])

export function shouldPollMarketplaceOrder(order: MarketplaceOrder | null) {
  if (!order) {
    return false
  }

  const providerRetrying = order.resultReleaseStatus === 'provider_retrying'

  return (
    Boolean(order.externalJobId || providerRetrying) &&
    !terminalOrderStatuses.has(order.status)
  )
}

export async function syncMarketplaceOrderAsyncProviderStatus(
  orderId: string,
  appUrl: string
) {
  const order = await getMarketplaceOrderById(orderId)

  if (!shouldPollMarketplaceOrder(order)) {
    return order
  }

  const result = await pollMarketplaceOrderProviderStatus({
    orderId,
    appUrl,
    priorAttempt: order?.latestAsyncPollingResponse?.attempt
  })

  return result.order ?? (await getMarketplaceOrderById(orderId))
}

export async function pollMarketplaceOrderProviderStatus({
  orderId,
  appUrl,
  priorAttempt = 0
}: {
  orderId: string
  appUrl: string
  priorAttempt?: number
}) {
  const pollingUrl = buildProviderStatusPollingUrl(appUrl, orderId)
  const request = buildProviderStatusPollingRequest(pollingUrl, orderId)
  const attempt = priorAttempt + 1

  try {
    const response = await fetch(pollingUrl, { headers: request.headers })
    const body = (await response
      .json()
      .catch(() => null)) as ProviderStatusResponse | null
    const poll = buildMarketplaceAsyncPollingResponse({
      attempt,
      pollingUrl,
      request,
      httpStatus: response.status,
      body: body ?? { error: response.statusText }
    })

    if (!response.ok || !body?.order) {
      const order = await persistPollingError({
        orderId,
        poll,
        message:
          body?.error ??
          `Unable to poll async provider status (${response.status} ${response.statusText}).`
      })

      return { order, poll, body }
    }

    const order = await updateMarketplaceOrder(body.order.id, {
      latestAsyncPollingResponse: poll,
      asyncPollingError: undefined
    })

    return { order: order ?? body.order, poll, body }
  } catch (error) {
    const poll = buildMarketplaceAsyncPollingResponse({
      attempt,
      pollingUrl,
      request,
      error: describeUnknownError(error)
    })
    const order = await persistPollingError({
      orderId,
      poll,
      message: describeUnknownError(error)
    })

    return { order, poll, body: null }
  }
}

export function buildProviderStatusPollingUrl(appUrl: string, orderId: string) {
  return new URL(
    `/api/orders/${encodeURIComponent(orderId)}/provider-status`,
    appUrl
  ).toString()
}

export function buildProviderStatusPollingRequest(
  pollingUrl: string,
  orderId: string
): AsyncProviderPollingRequest {
  return {
    method: 'GET',
    url: pollingUrl,
    headers: { Accept: 'application/json' },
    params: { orderId }
  }
}

export function buildMarketplaceAsyncPollingResponse({
  attempt,
  pollingUrl,
  request,
  httpStatus,
  body,
  error
}: {
  attempt: number
  pollingUrl: string
  request: AsyncProviderPollingRequest
  httpStatus?: number
  body?: ProviderStatusResponse
  error?: string
}): MarketplaceAsyncPollingResponse {
  const resultUrl =
    body?.order?.resultUrl ??
    body?.provider?.resultUrl ??
    readStringPath(body?.order?.responsePayload, 'previewUrl') ??
    readStringPath(body?.provider?.responsePayload, 'previewUrl') ??
    readStringPath(body?.order?.responsePayload, 'renderUrl') ??
    readStringPath(body?.provider?.responsePayload, 'renderUrl') ??
    readStringPath(body?.order?.responsePayload, 'resultUrl') ??
    readStringPath(body?.provider?.responsePayload, 'resultUrl') ??
    readStringPath(body?.order?.responsePayload, 'result.previewUrl') ??
    readStringPath(body?.provider?.responsePayload, 'result.previewUrl')

  return {
    id: `poll_${Date.now().toString(36)}_${attempt}`,
    attempt,
    polledAt: new Date().toISOString(),
    pollingUrl,
    request,
    httpStatus,
    orderStatus: body?.order?.status,
    resultReleaseStatus: body?.order?.resultReleaseStatus,
    externalJobId: body?.order?.externalJobId ?? body?.provider?.externalJobId,
    resultUrl,
    error: error ?? body?.error,
    response: body ? buildStoredProviderStatusPayload(body) : undefined
  }
}

function buildStoredProviderStatusPayload(
  body: ProviderStatusResponse
): Record<string, unknown> {
  const resultUrl =
    body.order?.resultUrl ??
    body.provider?.resultUrl ??
    readStringPath(body.order?.responsePayload, 'previewUrl') ??
    readStringPath(body.provider?.responsePayload, 'previewUrl') ??
    readStringPath(body.order?.responsePayload, 'renderUrl') ??
    readStringPath(body.provider?.responsePayload, 'renderUrl') ??
    readStringPath(body.order?.responsePayload, 'resultUrl') ??
    readStringPath(body.provider?.responsePayload, 'resultUrl') ??
    readStringPath(body.order?.responsePayload, 'result.previewUrl') ??
    readStringPath(body.provider?.responsePayload, 'result.previewUrl')

  return {
    status: body.order?.status ?? body.provider?.status,
    resultReleaseStatus: body.order?.resultReleaseStatus,
    externalJobId: body.order?.externalJobId ?? body.provider?.externalJobId,
    resultUrl,
    order: body.order
      ? {
          id: body.order.id,
          status: body.order.status,
          externalJobId: body.order.externalJobId,
          resultReleaseStatus: body.order.resultReleaseStatus,
          resultUrl: body.order.resultUrl,
          providerRequest: compactProviderRequestTrace(
            body.order.providerRequest
          ),
          responsePayload: compactJsonPayload(body.order.responsePayload, 0)
        }
      : undefined,
    provider: compactJsonPayload(body.provider, 0),
    pricing: compactJsonPayload(body.pricing),
    escrow: compactJsonPayload(body.escrow),
    error: body.error
  }
}

async function persistPollingError({
  orderId,
  poll,
  message
}: {
  orderId: string
  poll: MarketplaceAsyncPollingResponse
  message: string
}) {
  return await updateMarketplaceOrder(orderId, {
    latestAsyncPollingResponse: poll,
    asyncPollingError: {
      message,
      status: poll.httpStatus,
      polledAt: poll.polledAt,
      response: poll.response
    }
  })
}

function readStringPath(value: unknown, path: string) {
  const result = path.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[part]
  }, value)

  return typeof result === 'string' && result.trim() ? result : undefined
}

function describeUnknownError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
