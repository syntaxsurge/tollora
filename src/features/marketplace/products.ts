export type ApiProductCategory =
  | 'ai'
  | 'data'
  | 'media'
  | 'agent'
  | 'commerce'
  | 'developer'

export type ApiProductStatus = 'published' | 'draft' | 'paused'

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
  estimatedLatency: string
  requestSchema: Record<string, string>
  responseSchema: Record<string, string>
  demoPayload: Record<string, unknown>
  isX402Protected: boolean
  isAgentReady: boolean
  status: ApiProductStatus
  featured?: boolean
  calls: number
  successRate: string
  revenueMusd: string
}

export const marketplaceProducts: ApiProduct[] = [
  {
    slug: 'cliplore-ai-video-generator',
    name: 'ClipLore AI Video Generator',
    providerName: 'ClipLore',
    providerSlug: 'cliplore',
    providerWallet: '0x3161100000000000000000000000000000000001',
    category: 'media',
    description:
      'Generate short-form AI videos from a prompt, format selection, optional script, and source preferences through a paid API listing.',
    priceUsd: 18,
    priceLabel: '18.00 MUSD',
    method: 'POST',
    endpointPath: '/api/x402/products/cliplore-ai-video-generator/call',
    estimatedLatency: '4-8 minutes',
    requestSchema: {
      prompt: 'string',
      format: '"short" | "square" | "vertical"',
      duration: '"15s" | "30s" | "60s"',
      script: 'string | undefined',
      sourcePreferences: 'string[] | undefined'
    },
    responseSchema: {
      orderId: 'string',
      status: '"processing" | "completed"',
      externalJobId: 'string',
      resultUrl: 'string | undefined'
    },
    demoPayload: {
      prompt: 'Create a product teaser for a MUSD-native paid API gateway.',
      format: 'vertical',
      duration: '30s',
      sourcePreferences: ['clean motion graphics', 'developer audience']
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    featured: true,
    calls: 42,
    successRate: '97.6%',
    revenueMusd: '756.00'
  },
  {
    slug: 'prompt-enhancer-api',
    name: 'Prompt Enhancer API',
    providerName: 'Tollora Labs',
    providerSlug: 'tollora-labs',
    providerWallet: '0x3161100000000000000000000000000000000002',
    category: 'ai',
    description:
      'Transform rough prompts into structured, model-ready instructions with tone, constraints, and output formatting.',
    priceUsd: 0.08,
    priceLabel: '0.08 MUSD',
    method: 'POST',
    endpointPath: '/api/x402/products/prompt-enhancer-api/call',
    estimatedLatency: '< 2 seconds',
    requestSchema: {
      prompt: 'string',
      audience: 'string | undefined',
      outputStyle: 'string | undefined'
    },
    responseSchema: {
      enhancedPrompt: 'string',
      rationale: 'string',
      requestId: 'string'
    },
    demoPayload: {
      prompt: 'Write a launch post for my API product.',
      audience: 'developers',
      outputStyle: 'concise'
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    calls: 1280,
    successRate: '99.2%',
    revenueMusd: '102.40'
  },
  {
    slug: 'document-summary-api',
    name: 'Document Summary API',
    providerName: 'Tollora Labs',
    providerSlug: 'tollora-labs',
    providerWallet: '0x3161100000000000000000000000000000000002',
    category: 'developer',
    description:
      'Summarize long documents into executive notes, action items, and structured metadata for workflow automation.',
    priceUsd: 0.24,
    priceLabel: '0.24 MUSD',
    method: 'POST',
    endpointPath: '/api/x402/products/document-summary-api/call',
    estimatedLatency: '< 10 seconds',
    requestSchema: {
      documentText: 'string',
      summaryDepth: '"brief" | "standard" | "detailed"'
    },
    responseSchema: {
      summary: 'string',
      actionItems: 'string[]',
      requestId: 'string'
    },
    demoPayload: {
      documentText: 'Paste the document content to summarize.',
      summaryDepth: 'standard'
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    calls: 864,
    successRate: '98.8%',
    revenueMusd: '207.36'
  },
  {
    slug: 'market-snapshot-api',
    name: 'Market Snapshot API',
    providerName: 'Signal Foundry',
    providerSlug: 'signal-foundry',
    providerWallet: '0x3161100000000000000000000000000000000003',
    category: 'data',
    description:
      'Fetch a compact market snapshot with price, liquidity, volatility, and timestamp fields for trading and treasury dashboards.',
    priceUsd: 0.12,
    priceLabel: '0.12 MUSD',
    method: 'GET',
    endpointPath: '/api/x402/products/market-snapshot-api/call',
    estimatedLatency: '< 1 second',
    requestSchema: {
      symbol: 'string',
      venue: 'string | undefined'
    },
    responseSchema: {
      symbol: 'string',
      priceUsd: 'number',
      liquidityUsd: 'number',
      observedAt: 'string'
    },
    demoPayload: {
      symbol: 'MUSD',
      venue: 'Mezo'
    },
    isX402Protected: true,
    isAgentReady: true,
    status: 'published',
    calls: 512,
    successRate: '99.6%',
    revenueMusd: '61.44'
  }
]

export function getPublishedProducts() {
  return marketplaceProducts.filter(product => product.status === 'published')
}

export function getFeaturedProduct() {
  return marketplaceProducts.find(product => product.featured)
}

export function getProductBySlug(slug: string) {
  return marketplaceProducts.find(product => product.slug === slug)
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
