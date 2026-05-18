import { getProductBySlug } from '@/features/marketplace/products'
import { externalHttpAdapter } from '@/features/provider-adapters/external-http/adapter'

export function getProviderAdapter(productSlug: string) {
  const product = getProductBySlug(productSlug)

  return product?.providerEndpointUrl ? externalHttpAdapter : undefined
}

export function listProviderAdapters() {
  return [externalHttpAdapter]
}
