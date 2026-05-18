import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

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
export type ApiProductPricingModel = 'fixed' | 'credit_metered'

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

export type ApiProductPricingConfig = {
  model: ApiProductPricingModel
  quoteEndpointUrl?: string
  quoteMethod?: 'GET' | 'POST'
  creditUnitPath?: string
  usageCreditPath?: string
  creditToMusdRate?: number
  multiplier?: number
  minimumChargeUsd?: number
  maximumChargeUsd?: number
}

export type ApiProduct = {
  slug: string
  name: string
  ownerWallet?: `0x${string}`
  providerName: string
  providerSlug: string
  providerWallet: `0x${string}`
  category: ApiProductCategory
  description: string
  priceUsd: number
  priceLabel: string
  pricing: ApiProductPricingConfig
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
const providerProductsStorePath = join(
  process.cwd(),
  '.tollora',
  'provider-products.json'
)

export const marketplaceProducts: ApiProduct[] = []

export const providerCreatedProducts =
  globalForMarketplaceProducts.__tolloraProviderProducts ??
  readProviderProducts()

globalForMarketplaceProducts.__tolloraProviderProducts = providerCreatedProducts

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
    persistProviderProducts(providerCreatedProducts)
    return product
  }

  providerCreatedProducts.unshift(product)
  persistProviderProducts(providerCreatedProducts)

  return product
}

export function updateProviderProductStatus(
  slug: string,
  status: ApiProductStatus
) {
  const product = getProductBySlug(slug)

  if (!product) {
    return null
  }

  return recordProviderProduct({
    ...product,
    status,
    featured: status === 'published' ? (product.featured ?? true) : false
  })
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

function readProviderProducts() {
  if (!existsSync(providerProductsStorePath)) {
    return []
  }

  try {
    const parsed = JSON.parse(
      readFileSync(providerProductsStorePath, 'utf8')
    ) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isApiProduct)
  } catch {
    return []
  }
}

function persistProviderProducts(products: ApiProduct[]) {
  try {
    mkdirSync(dirname(providerProductsStorePath), { recursive: true })
    writeFileSync(
      providerProductsStorePath,
      `${JSON.stringify(products, null, 2)}\n`
    )
  } catch {
    // Runtime persistence is best-effort for local demos; the in-memory catalog
    // remains available for the current process if the filesystem is read-only.
  }
}

function isApiProduct(value: unknown): value is ApiProduct {
  if (!value || typeof value !== 'object') {
    return false
  }

  const product = value as Partial<ApiProduct>

  return (
    typeof product.slug === 'string' &&
    typeof product.name === 'string' &&
    typeof product.providerName === 'string' &&
    typeof product.endpointPath === 'string' &&
    ['draft', 'published', 'paused'].includes(String(product.status))
  )
}
