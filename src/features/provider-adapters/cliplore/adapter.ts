import { cliploreRequestSchema } from '@/features/provider-adapters/cliplore/schemas'
import type {
  ProviderAdapter,
  ProviderAdapterResult
} from '@/features/provider-adapters/types'
import { envServer } from '@/lib/env/env.server'

function getClipLoreConfig() {
  if (!envServer.CLIPLORE_API_URL || !envServer.CLIPLORE_API_KEY) {
    return null
  }

  return {
    apiUrl: envServer.CLIPLORE_API_URL.replace(/\/$/, ''),
    apiKey: envServer.CLIPLORE_API_KEY
  }
}

function normalizeStatus(data: Record<string, unknown>): ProviderAdapterResult {
  const rawStatus = String(data.status ?? 'processing')
  const status =
    rawStatus === 'completed'
      ? 'completed'
      : rawStatus === 'failed'
        ? 'failed'
        : 'processing'

  return {
    status,
    externalJobId: String(data.jobId ?? data.id ?? ''),
    resultUrl: typeof data.resultUrl === 'string' ? data.resultUrl : undefined,
    responsePayload: data,
    errorMessage:
      typeof data.errorMessage === 'string' ? data.errorMessage : undefined
  }
}

export const cliploreAdapter: ProviderAdapter = {
  id: 'cliplore',
  async call(input) {
    const parsed = cliploreRequestSchema.safeParse(input.requestPayload)

    if (!parsed.success) {
      return {
        status: 'failed',
        errorMessage: 'ClipLore request payload failed validation.',
        responsePayload: {
          issues: parsed.error.flatten().fieldErrors
        }
      }
    }

    const config = getClipLoreConfig()

    if (!config) {
      return {
        status: 'failed',
        errorMessage:
          'ClipLore API credentials are required before starting video jobs.'
      }
    }

    const response = await fetch(`${config.apiUrl}/api/v1/video/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `tollora_${input.orderId}`
      },
      body: JSON.stringify({
        ...parsed.data,
        externalReference: {
          platform: 'tollora',
          orderId: input.orderId,
          receiptId: input.receiptId,
          buyerWallet: input.buyerWallet
        }
      })
    })

    if (!response.ok) {
      return {
        status: 'failed',
        errorMessage: `ClipLore request failed with status ${response.status}.`
      }
    }

    return normalizeStatus((await response.json()) as Record<string, unknown>)
  },
  async getStatus(externalJobId) {
    const config = getClipLoreConfig()

    if (!config) {
      return {
        status: 'failed',
        errorMessage:
          'ClipLore API credentials are required before reading video job status.'
      }
    }

    const response = await fetch(
      `${config.apiUrl}/api/v1/video/jobs/${externalJobId}`,
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`
        }
      }
    )

    if (!response.ok) {
      return {
        status: 'failed',
        errorMessage: `ClipLore status request failed with status ${response.status}.`
      }
    }

    return normalizeStatus((await response.json()) as Record<string, unknown>)
  }
}
