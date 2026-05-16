import { cliploreAdapter } from '@/features/provider-adapters/cliplore/adapter'
import { localDataAdapter } from '@/features/provider-adapters/local-data/adapter'
import { localPromptAdapter } from '@/features/provider-adapters/local-prompt/adapter'
import type { ProviderAdapter } from '@/features/provider-adapters/types'

const adaptersByProductSlug: Record<string, ProviderAdapter> = {
  'cliplore-ai-video-generator': cliploreAdapter,
  'prompt-enhancer-api': localPromptAdapter,
  'document-summary-api': localDataAdapter,
  'market-snapshot-api': localDataAdapter
}

export function getProviderAdapter(productSlug: string) {
  return adaptersByProductSlug[productSlug]
}

export function listProviderAdapters() {
  return Object.values(adaptersByProductSlug)
}
