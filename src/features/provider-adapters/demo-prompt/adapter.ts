import type { ProviderAdapter } from '@/features/provider-adapters/types'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export const demoPromptAdapter: ProviderAdapter = {
  id: 'demo-prompt',
  async call(input) {
    const payload = asRecord(input.requestPayload)
    const prompt = String(payload.prompt ?? '')

    return {
      status: 'completed',
      responsePayload: {
        enhancedPrompt: `Create a concise, developer-ready response for: ${prompt}`,
        rationale:
          'The request is structured with audience, output style, and delivery constraints for a model-ready instruction.',
        requestId: input.requestId
      }
    }
  }
}
