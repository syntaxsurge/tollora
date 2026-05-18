export type ApiProductCategory =
  | 'ai'
  | 'data'
  | 'media'
  | 'agent'
  | 'commerce'
  | 'developer'

export type ApiProductStatus = 'published' | 'draft' | 'paused'
export type ApiProductExecutionMode = 'synchronous' | 'asynchronous'
export type ApiProductSettlementModel =
  | 'pay_on_successful_response'
  | 'pay_on_job_acceptance'
  | 'pay_to_claim_result'
export type ApiProductResultDelivery =
  | 'direct_response'
  | 'poll_or_webhook'
  | 'claim_after_completion'
export type ApiProductAuthType =
  | 'none'
  | 'bearer'
  | 'api_key_header'
  | 'api_key_query'
  | 'basic'

export type ApiProductProviderAuth = {
  type: ApiProductAuthType
  headerName?: string
  queryParam?: string
  secret?: string
  username?: string
  password?: string
}

export type ApiProductPollingConfig = {
  statusEndpointUrl?: string
  method: 'GET' | 'POST'
  externalJobIdPath?: string
  statusPath?: string
  resultUrlPath?: string
  errorMessagePath?: string
}

export type ApiProduct = {
  slug: string
  name: string
  providerName: string
  providerSlug: string
  providerWallet: `0x${string}`
  category: ApiProductCategory
  description: string
  priceUsd: number
  priceLabel: string
  method: 'GET' | 'POST'
  endpointPath: string
  providerEndpointUrl?: string
  providerAuth?: ApiProductProviderAuth
  polling?: ApiProductPollingConfig
  timeoutSeconds?: number
  idempotencyHeader?: string
  estimatedLatency: string
  executionMode: ApiProductExecutionMode
  settlementModel: ApiProductSettlementModel
  resultDelivery: ApiProductResultDelivery
  requestSchema: Record<string, string>
  responseSchema: Record<string, string>
  referencePayload: Record<string, unknown>
  isX402Protected: boolean
  isAgentReady: boolean
  status: ApiProductStatus
  featured?: boolean
  calls: number
  successRate: string
  revenueMusd: string
}

const globalForMarketplaceProducts = globalThis as typeof globalThis & {
  __tolloraProviderProducts?: ApiProduct[]
}

export const marketplaceProducts: ApiProduct[] = []

export const providerCreatedProducts =
  globalForMarketplaceProducts.__tolloraProviderProducts ?? []

globalForMarketplaceProducts.__tolloraProviderProducts =
  providerCreatedProducts

export function getPublishedProducts() {
  return getAllProducts().filter(product => product.status === 'published')
}

export function getAllProducts() {
  return [...providerCreatedProducts, ...marketplaceProducts]
}

export function getFeaturedProduct() {
  return getPublishedProducts().find(product => product.featured)
}

export function getProductBySlug(slug: string) {
  return getAllProducts().find(product => product.slug === slug)
}

export function recordProviderProduct(product: ApiProduct) {
  const existingIndex = providerCreatedProducts.findIndex(
    item => item.slug === product.slug
  )

  if (existingIndex >= 0) {
    providerCreatedProducts[existingIndex] = product
    return product
  }

  providerCreatedProducts.unshift(product)

  return product
}

export function getMarketplaceMetrics() {
  const products = getPublishedProducts()
  const totalCalls = products.reduce((sum, product) => sum + product.calls, 0)
  const totalRevenue = products.reduce(
    (sum, product) => sum + Number(product.revenueMusd),
    0
  )

  return {
    productCount: products.length,
    totalCalls,
    totalRevenueMusd: totalRevenue.toFixed(2),
    platformFeeBps: 500,
    providerShareBps: 9500
  }
}
