import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { marketplaceOrders } from '@/features/marketplace/orders'
import { settlementReceipts } from '@/features/marketplace/receipt-store'
import type { MarketplaceOrder } from '@/features/marketplace/types'

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

const adminProviderWallet =
  '0x7CE33579392AEAF1791c9B0c8302a502B5867688' as const
const adminProviderName = 'Tollora Labs'
const adminProviderSlug = 'tollora-labs'

export const marketplaceProducts: ApiProduct[] = [
  {
    slug: 'public-wikipedia-context',
    name: 'Wikipedia Context Search',
    ownerWallet: adminProviderWallet,
    providerName: adminProviderName,
    providerSlug: adminProviderSlug,
    providerWallet: adminProviderWallet,
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
    calls: 0,
    successRate: '100%',
    revenueMusd: '0.00'
  },
  {
    slug: 'public-hn-trend-scan',
    name: 'Hacker News Trend Scan',
    ownerWallet: adminProviderWallet,
    providerName: adminProviderName,
    providerSlug: adminProviderSlug,
    providerWallet: adminProviderWallet,
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
    ownerWallet: adminProviderWallet,
    providerName: adminProviderName,
    providerSlug: adminProviderSlug,
    providerWallet: adminProviderWallet,
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
  },
  {
    slug: 'public-npm-package-signal',
    name: 'NPM Package Signal',
    ownerWallet: adminProviderWallet,
    providerName: adminProviderName,
    providerSlug: adminProviderSlug,
    providerWallet: adminProviderWallet,
    category: 'developer',
    description:
      'Searches the public npm registry for package names, descriptions, keywords, maintainers, and popularity signals around a developer product category.',
    priceUsd: 0.04,
    priceLabel: '0.04 MUSD',
    pricing: { model: 'fixed' },
    method: 'GET',
    endpointPath: '/api/x402/products/public-npm-package-signal/call',
    providerEndpointUrl: 'https://registry.npmjs.org/-/v1/search',
    providerAuth: { type: 'none' },
    timeoutSeconds: 20,
    estimatedLatency: '1-3s',
    executionMode: 'synchronous',
    settlementModel: 'pay_on_successful_response',
    resultDelivery: 'direct_response',
    requestSchema: {
      text: 'string',
      size: 'number | undefined',
      quality: 'number | undefined',
      popularity: 'number | undefined',
      maintenance: 'number | undefined'
    },
    responseSchema: {
      objects: 'array',
      total: 'number',
      time: 'string'
    },
    referencePayload: {
      text: 'AI agent API commerce',
      size: 5,
      quality: 0.65,
      popularity: 0.25,
      maintenance: 0.1
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    calls: 0,
    successRate: '100%',
    revenueMusd: '0.00'
  },
  {
    slug: 'public-openalex-research-scan',
    name: 'OpenAlex Research Scan',
    ownerWallet: adminProviderWallet,
    providerName: adminProviderName,
    providerSlug: adminProviderSlug,
    providerWallet: adminProviderWallet,
    category: 'data',
    description:
      'Searches the public OpenAlex works index for papers and research metadata that can support technical explainers, documentation, and evidence-backed narratives.',
    priceUsd: 0.04,
    priceLabel: '0.04 MUSD',
    pricing: { model: 'fixed' },
    method: 'GET',
    endpointPath: '/api/x402/products/public-openalex-research-scan/call',
    providerEndpointUrl: 'https://api.openalex.org/works',
    providerAuth: { type: 'none' },
    timeoutSeconds: 20,
    estimatedLatency: '1-3s',
    executionMode: 'synchronous',
    settlementModel: 'pay_on_successful_response',
    resultDelivery: 'direct_response',
    requestSchema: {
      search: 'string',
      'per-page': 'number | undefined',
      sort: 'string | undefined'
    },
    responseSchema: {
      meta: 'object',
      results: 'array',
      group_by: 'array'
    },
    referencePayload: {
      search: 'AI agents API payments',
      'per-page': 5,
      sort: 'relevance_score:desc'
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    calls: 0,
    successRate: '100%',
    revenueMusd: '0.00'
  },
  {
    slug: 'public-gdelt-news-scan',
    name: 'GDELT News Signal',
    ownerWallet: adminProviderWallet,
    providerName: adminProviderName,
    providerSlug: adminProviderSlug,
    providerWallet: adminProviderWallet,
    category: 'data',
    description:
      'Searches the public GDELT document API for recent news coverage, article URLs, source domains, and topical language around a product or market.',
    priceUsd: 0.05,
    priceLabel: '0.05 MUSD',
    pricing: { model: 'fixed' },
    method: 'GET',
    endpointPath: '/api/x402/products/public-gdelt-news-scan/call',
    providerEndpointUrl: 'https://api.gdeltproject.org/api/v2/doc/doc',
    providerAuth: { type: 'none' },
    timeoutSeconds: 25,
    estimatedLatency: '2-5s',
    executionMode: 'synchronous',
    settlementModel: 'pay_on_successful_response',
    resultDelivery: 'direct_response',
    requestSchema: {
      query: 'string',
      mode: '"ArtList"',
      format: '"json"',
      maxrecords: 'number | undefined',
      sort: '"HybridRel" | "DateDesc" | undefined'
    },
    responseSchema: {
      articles: 'array'
    },
    referencePayload: {
      query: 'artificial intelligence agents API payments',
      mode: 'ArtList',
      format: 'json',
      maxrecords: 5,
      sort: 'HybridRel'
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

export function getProviderOwnedProducts(ownerWallet?: string | null) {
  if (!ownerWallet) {
    return []
  }

  const normalizedOwner = ownerWallet.toLowerCase()

  return getAllProducts().filter(
    product => product.ownerWallet?.toLowerCase() === normalizedOwner
  )
}

export function getProviderPublishedProducts(ownerWallet?: string | null) {
  return getProviderOwnedProducts(ownerWallet).filter(
    product => product.status === 'published'
  )
}

export function getAllProducts() {
  return [...providerCreatedProducts, ...marketplaceProducts]
    .map(withDisplayPriceLabel)
    .map(withUsageMetrics)
}

export function getFeaturedProduct() {
  const publishedProducts = getPublishedProducts()
  const cliploreProduct = publishedProducts.find(product => {
    const provider = product.providerName.toLowerCase()
    const slug = product.slug.toLowerCase()

    return (
      provider.includes('cliplore') ||
      provider.includes('clipplorer') ||
      slug.includes('video-generation')
    )
  })

  return (
    cliploreProduct ??
    publishedProducts.find(
      product => product.featured && product.slug !== 'public-wikipedia-context'
    ) ??
    publishedProducts.find(
      product => product.slug !== 'public-wikipedia-context'
    )
  )
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
  status: ApiProductStatus,
  ownerWallet?: string | null
) {
  const product = providerCreatedProducts.find(item => item.slug === slug)

  if (!product || !isProductOwnedBy(product, ownerWallet)) {
    return null
  }

  return recordProviderProduct({
    ...product,
    status,
    featured: status === 'published' ? (product.featured ?? true) : false
  })
}

export function deleteProviderProduct(
  slug: string,
  ownerWallet?: string | null
) {
  const existingIndex = providerCreatedProducts.findIndex(
    product => product.slug === slug
  )

  if (existingIndex < 0) {
    return null
  }

  if (!isProductOwnedBy(providerCreatedProducts[existingIndex], ownerWallet)) {
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

export function getProviderDashboardMetrics(ownerWallet?: string | null) {
  const products = getProviderOwnedProducts(ownerWallet)
  const productSlugs = new Set(products.map(product => product.slug))
  const orders = marketplaceOrders.filter(order =>
    productSlugs.has(order.productSlug)
  )
  const receipts = settlementReceipts.filter(receipt =>
    productSlugs.has(receipt.productSlug)
  )
  const completedOrders = orders.filter(isCompletedProviderOrder)
  const failedOrders = orders.filter(order => order.status === 'failed')
  const processingOrders = orders.filter(order =>
    ['paid', 'processing', 'ready', 'delta_payment_required'].includes(
      order.status
    )
  )
  const providerRevenue = receipts
    .filter(receipt => isProviderEarningReceipt(receipt.orderId))
    .reduce((sum, receipt) => sum + parseMusd(receipt.providerAmountMusd), 0)
  const grossVolume = receipts.reduce(
    (sum, receipt) => sum + parseMusd(receipt.amountMusd),
    0
  )

  return {
    productCount: products.length,
    orderCount: orders.length,
    completedCalls: completedOrders.length,
    failedCalls: failedOrders.length,
    processingCalls: processingOrders.length,
    grossVolumeMusd: grossVolume.toFixed(2),
    providerRevenueMusd: providerRevenue.toFixed(2),
    platformFeeMusd: Math.max(0, grossVolume - providerRevenue).toFixed(2),
    successRate:
      orders.length > 0
        ? `${Math.round((completedOrders.length / orders.length) * 100)}%`
        : 'No calls yet'
  }
}

export function getProviderOrders(ownerWallet?: string | null) {
  const products = getProviderOwnedProducts(ownerWallet)
  const productSlugs = new Set(products.map(product => product.slug))

  return marketplaceOrders.filter(order => productSlugs.has(order.productSlug))
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

    return parsed.filter(isApiProduct).map(withDisplayPriceLabel)
  } catch {
    return []
  }
}

function withDisplayPriceLabel(product: ApiProduct): ApiProduct {
  if (product.pricing.model !== 'credit_metered') {
    return product
  }

  if (product.priceLabel === 'Metered quote') {
    return product
  }

  return {
    ...product,
    priceLabel: 'Metered quote'
  }
}

function withUsageMetrics(product: ApiProduct): ApiProduct {
  const productOrders = marketplaceOrders.filter(
    order => order.productSlug === product.slug
  )
  const completedOrders = productOrders.filter(isCompletedProviderOrder)
  const productReceipts = settlementReceipts.filter(
    receipt => receipt.productSlug === product.slug
  )
  const revenue = productReceipts
    .filter(receipt => isProviderEarningReceipt(receipt.orderId))
    .reduce((sum, receipt) => sum + parseMusd(receipt.providerAmountMusd), 0)

  return {
    ...product,
    calls: productOrders.length,
    successRate:
      productOrders.length > 0
        ? `${Math.round((completedOrders.length / productOrders.length) * 100)}%`
        : product.successRate,
    revenueMusd: revenue.toFixed(2)
  }
}

function isCompletedProviderOrder(order: MarketplaceOrder) {
  return (
    order.status === 'completed' ||
    order.resultReleaseStatus === 'released' ||
    order.escrowStatus === 'released'
  )
}

function isProviderEarningReceipt(orderId: string) {
  const order = marketplaceOrders.find(item => item.id === orderId)

  if (!order) {
    return false
  }

  return isCompletedProviderOrder(order)
}

function parseMusd(value: string | undefined) {
  const amount = Number((value ?? '').replace(/[^0-9.]/g, ''))

  return Number.isFinite(amount) ? amount : 0
}

function isProductOwnedBy(product: ApiProduct, ownerWallet?: string | null) {
  if (!ownerWallet) {
    return false
  }

  return product.ownerWallet?.toLowerCase() === ownerWallet.toLowerCase()
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
