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

const tolloraPublicProviderWallet =
  '0x7CE33579392AEAF1791c9B0c8302a502B5867688' as const

export const marketplaceProducts: ApiProduct[] = [
  {
    slug: 'public-wikipedia-context',
    name: 'Wikipedia Context Search',
    providerName: 'Tollora Public Data',
    providerSlug: 'tollora-public-data',
    providerWallet: tolloraPublicProviderWallet,
    category: 'data',
    description:
      'Searches public Wikipedia pages for factual context the agent can use in launch briefs, market summaries, and positioning copy.',
    priceUsd: 0.03,
    priceLabel: '0.03 MUSD',
    pricing: { model: 'fixed' },
    method: 'GET',
    endpointPath: '/api/x402/products/public-wikipedia-context/call',
    providerEndpointUrl: 'https://en.wikipedia.org/w/api.php',
    providerAuth: { type: 'none' },
    timeoutSeconds: 20,
    estimatedLatency: '1-3s',
    executionMode: 'synchronous',
    settlementModel: 'pay_on_successful_response',
    resultDelivery: 'direct_response',
    requestSchema: {
      action: '"query"',
      list: '"search"',
      format: '"json"',
      srsearch: 'string',
      srlimit: 'number | undefined'
    },
    responseSchema: {
      query: 'object',
      search: 'array',
      searchinfo: 'object'
    },
    referencePayload: {
      action: 'query',
      list: 'search',
      format: 'json',
      srsearch: 'AI API marketplace',
      srlimit: 5,
      origin: '*'
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    featured: true,
    calls: 0,
    successRate: '100%',
    revenueMusd: '0.00'
  },
  {
    slug: 'public-hn-trend-scan',
    name: 'Hacker News Trend Scan',
    providerName: 'Tollora Public Data',
    providerSlug: 'tollora-public-data',
    providerWallet: tolloraPublicProviderWallet,
    category: 'data',
    description:
      'Searches public Hacker News story metadata for recent developer interest around a launch topic, technology, or market category.',
    priceUsd: 0.04,
    priceLabel: '0.04 MUSD',
    pricing: { model: 'fixed' },
    method: 'GET',
    endpointPath: '/api/x402/products/public-hn-trend-scan/call',
    providerEndpointUrl: 'https://hn.algolia.com/api/v1/search_by_date',
    providerAuth: { type: 'none' },
    timeoutSeconds: 20,
    estimatedLatency: '1-3s',
    executionMode: 'synchronous',
    settlementModel: 'pay_on_successful_response',
    resultDelivery: 'direct_response',
    requestSchema: {
      query: 'string',
      tags: 'string | undefined',
      hitsPerPage: 'number | undefined'
    },
    responseSchema: {
      hits: 'array',
      nbHits: 'number',
      page: 'number'
    },
    referencePayload: {
      query: 'AI agents API marketplace',
      tags: 'story',
      hitsPerPage: 5
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    calls: 0,
    successRate: '100%',
    revenueMusd: '0.00'
  },
  {
    slug: 'public-github-repo-search',
    name: 'GitHub Repository Signal',
    providerName: 'Tollora Public Data',
    providerSlug: 'tollora-public-data',
    providerWallet: tolloraPublicProviderWallet,
    category: 'developer',
    description:
      'Searches public GitHub repositories for developer traction signals, related projects, languages, stars, forks, and repo descriptions.',
    priceUsd: 0.04,
    priceLabel: '0.04 MUSD',
    pricing: { model: 'fixed' },
    method: 'GET',
    endpointPath: '/api/x402/products/public-github-repo-search/call',
    providerEndpointUrl: 'https://api.github.com/search/repositories',
    providerAuth: { type: 'none' },
    timeoutSeconds: 20,
    estimatedLatency: '1-3s',
    executionMode: 'synchronous',
    settlementModel: 'pay_on_successful_response',
    resultDelivery: 'direct_response',
    requestSchema: {
      q: 'string',
      sort: '"stars" | "updated" | undefined',
      order: '"desc" | "asc" | undefined',
      per_page: 'number | undefined'
    },
    responseSchema: {
      total_count: 'number',
      items: 'array',
      incomplete_results: 'boolean'
    },
    referencePayload: {
      q: 'AI agent API marketplace in:name,description,readme',
      sort: 'stars',
      order: 'desc',
      per_page: 5
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    calls: 0,
    successRate: '100%',
    revenueMusd: '0.00'
  }
]

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

export function deleteProviderProduct(slug: string) {
  const existingIndex = providerCreatedProducts.findIndex(
    product => product.slug === slug
  )

  if (existingIndex < 0) {
    return null
  }

  const [deletedProduct] = providerCreatedProducts.splice(existingIndex, 1)
  persistProviderProducts(providerCreatedProducts)

  return deletedProduct
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
