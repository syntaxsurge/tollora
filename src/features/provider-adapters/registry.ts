import { cliploreAdapter } from '@/features/provider-adapters/cliplore/adapter'
import { demoDataAdapter } from '@/features/provider-adapters/demo-data/adapter'
import { demoPromptAdapter } from '@/features/provider-adapters/demo-prompt/adapter'
import type { ProviderAdapter } from '@/features/provider-adapters/types'

const adaptersByProductSlug: Record<string, ProviderAdapter> = {
  'cliplore-ai-video-generator': cliploreAdapter,
  'prompt-enhancer-api': demoPromptAdapter,
  'document-summary-api': demoDataAdapter,
  'market-snapshot-api': demoDataAdapter
}

export function getProviderAdapter(productSlug: string) {
  return adaptersByProductSlug[productSlug]
}

export function listProviderAdapters() {
  return Object.values(adaptersByProductSlug)
}
