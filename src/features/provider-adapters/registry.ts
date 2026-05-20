import { getProductBySlug } from '@/features/marketplace/products'
import { externalHttpAdapter } from '@/features/provider-adapters/external-http/adapter'
import { publicDataAdapter } from '@/features/provider-adapters/public-data/adapter'

export function getProviderAdapter(productSlug: string) {
  const product = getProductBySlug(productSlug)

  if (product?.providerSlug === 'tollora-public-data') {
    return publicDataAdapter
  }

  return product?.providerEndpointUrl ? externalHttpAdapter : undefined
}

export function listProviderAdapters() {
  return [publicDataAdapter, externalHttpAdapter]
}
