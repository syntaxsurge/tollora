import { Buffer } from 'node:buffer'

import { getProductBySlug } from '@/features/marketplace/products'
import type {
  ProviderAdapter,
  ProviderAdapterInput,
  ProviderAdapterResult
} from '@/features/provider-adapters/types'
import { omitIndexedCharacterMaps } from '@/lib/utils/json-payload'

export const externalHttpAdapter: ProviderAdapter = {
  id: 'external-http',
  async call(input) {
    const product = getProductBySlug(input.productSlug)

    if (!product?.providerEndpointUrl) {
      return {
        status: 'failed',
        errorMessage: 'Provider endpoint URL is not configured.'
      }
    }

    return callExternalApi({
      endpointUrl: product.providerEndpointUrl,
      method: product.method,
      auth: product.providerAuth,
      idempotencyHeader: product.idempotencyHeader,
      requestPayload: buildProviderRequestPayload({
        product,
        input
      }),
      orderId: input.orderId,
      timeoutSeconds: product.timeoutSeconds,
      executionMode: product.executionMode,
      externalJobIdPath: product.polling?.externalJobIdPath,
      statusPath: product.polling?.statusPath,
      resultUrlPath: product.polling?.resultUrlPath,
      errorMessagePath: product.polling?.errorMessagePath
    })
  },
  async getStatus(externalJobId, productSlug) {
    const product = productSlug ? getProductBySlug(productSlug) : undefined

    if (!product?.polling?.statusEndpointUrl) {
      return {
        status: 'failed',
        errorMessage: 'Status endpoint URL is not configured for this product.'
      }
    }

    const endpointUrl = product.polling.statusEndpointUrl.replace(
      '{externalJobId}',
      encodeURIComponent(externalJobId)
    )

    return callExternalApi({
      endpointUrl,
      method: product.polling.method,
      auth: product.providerAuth,
      requestPayload: { externalJobId },
      timeoutSeconds: product.timeoutSeconds,
      executionMode: product.executionMode,
      externalJobIdPath: product.polling.externalJobIdPath,
      statusPath: product.polling.statusPath,
      resultUrlPath: product.polling.resultUrlPath,
      errorMessagePath: product.polling.errorMessagePath
    })
  }
}

function buildProviderRequestPayload({
  product,
  input
}: {
  product: NonNullable<ReturnType<typeof getProductBySlug>>
  input: ProviderAdapterInput
}) {
  if (
    product.pricing.model !== 'credit_metered' ||
    product.executionMode !== 'asynchronous' ||
    !isRecord(input.requestPayload)
  ) {
    return input.requestPayload
  }

  return {
    ...input.requestPayload,
    billingMode: 'external_prepaid',
    externalReference: {
      ...asRecord(input.requestPayload.externalReference),
      requestedBillingMode:
        typeof input.requestPayload.billingMode === 'string'
          ? input.requestPayload.billingMode
          : undefined,
      orderId: input.orderId,
      receiptId: input.receiptId,
      buyerReference: input.buyerWallet,
      settlementReference: input.receiptId
    }
  }
}

async function callExternalApi({
  endpointUrl,
  method,
  auth,
  idempotencyHeader,
  requestPayload,
  orderId,
  timeoutSeconds = 60,
  executionMode,
  externalJobIdPath,
  statusPath,
  resultUrlPath,
  errorMessagePath
}: {
  endpointUrl: string
  method: 'GET' | 'POST'
  auth?: {
    type: string
    headerName?: string
    queryParam?: string
    secret?: string
    username?: string
    password?: string
  }
  idempotencyHeader?: string
  requestPayload: unknown
  orderId?: string
  timeoutSeconds?: number
  executionMode: 'synchronous' | 'asynchronous'
  externalJobIdPath?: string
  statusPath?: string
  resultUrlPath?: string
  errorMessagePath?: string
}): Promise<ProviderAdapterResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000)
  const url = new URL(endpointUrl)
  const headers = new Headers({ Accept: 'application/json' })

  applyAuth({ url, headers, auth })

  if (idempotencyHeader && orderId) {
    headers.set(idempotencyHeader, `tollora_${orderId}`)
  }

  const init: RequestInit = {
    method,
    headers,
    signal: controller.signal
  }

  if (method === 'GET') {
    for (const [key, value] of Object.entries(asRecord(requestPayload))) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  } else {
    headers.set('Content-Type', 'application/json')
    init.body = JSON.stringify(requestPayload ?? {})
  }

  try {
    const response = await fetch(url, init)
    const data = await readProviderResponse(response)

    if (!response.ok) {
      return {
        status: 'failed',
        errorMessage: `Provider request failed with status ${response.status}.`,
        responsePayload: data
      }
    }

    return normalizeResult({
      data,
      executionMode,
      externalJobIdPath,
      statusPath,
      resultUrlPath,
      errorMessagePath
    })
  } catch (error) {
    return {
      status: 'failed',
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Provider request failed before a response was returned.'
    }
  } finally {
    clearTimeout(timeout)
  }
}

function applyAuth({
  url,
  headers,
  auth
}: {
  url: URL
  headers: Headers
  auth?: {
    type: string
    headerName?: string
    queryParam?: string
    secret?: string
    username?: string
    password?: string
  }
}) {
  if (!auth || auth.type === 'none') {
    return
  }

  if (auth.type === 'bearer' && auth.secret) {
    headers.set(auth.headerName || 'Authorization', `Bearer ${auth.secret}`)
    return
  }

  if (auth.type === 'api_key_header' && auth.secret) {
    headers.set(auth.headerName || 'x-api-key', auth.secret)
    return
  }

  if (auth.type === 'api_key_query' && auth.secret) {
    url.searchParams.set(auth.queryParam || 'api_key', auth.secret)
    return
  }

  if (auth.type === 'basic' && auth.username && auth.password) {
    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
        'base64'
      )}`
    )
  }
}

async function readProviderResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return (await response.json().catch(() => null)) as unknown
  }

  return {
    body: await response.text().catch(() => '')
  }
}

function normalizeResult({
  data,
  executionMode,
  externalJobIdPath,
  statusPath,
  resultUrlPath,
  errorMessagePath
}: {
  data: unknown
  executionMode: 'synchronous' | 'asynchronous'
  externalJobIdPath?: string
  statusPath?: string
  resultUrlPath?: string
  errorMessagePath?: string
}): ProviderAdapterResult {
  const externalJobId =
    stringifyPath(data, externalJobIdPath) ??
    stringifyPath(data, 'jobId') ??
    stringifyPath(data, 'id') ??
    stringifyPath(data, 'mediaJobId') ??
    stringifyPath(data, 'renderId')
  const rawStatus = (
    stringifyPath(data, statusPath) ?? stringifyPath(data, 'status')
  )?.toLowerCase()
  const resultUrl =
    stringifyPath(data, resultUrlPath) ??
    stringifyPath(data, 'result.publicProjectUrl') ??
    stringifyPath(data, 'publicProjectUrl') ??
    stringifyPath(data, 'result.cloneUrl') ??
    stringifyPath(data, 'cloneUrl') ??
    stringifyPath(data, 'previewUrl') ??
    stringifyPath(data, 'renderUrl') ??
    stringifyPath(data, 'resultUrl') ??
    stringifyPath(data, 'url') ??
    stringifyPath(data, 'outputUrl')
  const errorMessage =
    stringifyPath(data, errorMessagePath) ??
    stringifyPath(data, 'errorMessage') ??
    stringifyPath(data, 'error')
  const status =
    rawStatus === 'failed' ||
    rawStatus === 'error' ||
    rawStatus === 'cancelled' ||
    rawStatus === 'canceled'
      ? 'failed'
      : resultUrl &&
          (rawStatus === 'review_required' ||
            rawStatus === 'awaiting_approval' ||
            rawStatus === 'preview_ready')
        ? 'completed'
      : rawStatus === 'completed' ||
          rawStatus === 'complete' ||
          rawStatus === 'preview_ready' ||
          rawStatus === 'succeeded' ||
          rawStatus === 'success' ||
          (executionMode === 'synchronous' && !externalJobId)
        ? 'completed'
        : 'processing'

  return {
    status,
    externalJobId,
    resultUrl,
    responsePayload: omitIndexedCharacterMaps(data),
    errorMessage
  }
}

function stringifyPath(data: unknown, path?: string) {
  if (!path) {
    return undefined
  }

  const value = readPath(data, path)

  return value === undefined || value === null ? undefined : String(value)
}

function readPath(data: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[segment]
  }, data)
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
