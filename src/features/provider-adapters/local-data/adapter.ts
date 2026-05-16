import type { ProviderAdapter } from '@/features/provider-adapters/types'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export const localDataAdapter: ProviderAdapter = {
  id: 'local-data',
  async call(input) {
    const payload = asRecord(input.requestPayload)

    if (input.productSlug === 'document-summary-api') {
      return {
        status: 'completed',
        responsePayload: {
          summary:
            'The document describes a paid API request settled with MUSD and returned with receipt metadata.',
          actionItems: [
            'Confirm the request schema',
            'Send the x402 payment payload',
            'Store the returned receipt'
          ],
          requestId: input.requestId
        }
      }
    }

    return {
      status: 'completed',
      responsePayload: {
        symbol: String(payload.symbol ?? 'MUSD'),
        venue: String(payload.venue ?? 'Mezo'),
        priceUsd: 1,
        liquidityUsd: 1250000,
        observedAt: new Date().toISOString(),
        requestId: input.requestId
      }
    }
  }
}
