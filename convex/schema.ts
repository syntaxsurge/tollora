import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    createdAt: v.number()
  }).index('by_name', ['name']),
  providers: defineTable({
    ownerWallet: v.string(),
    displayName: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    receivingWallet: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('pending'),
      v.literal('suspended')
    ),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_owner_wallet', ['ownerWallet'])
    .index('by_slug', ['slug'])
    .index('by_status', ['status']),
  apiProducts: defineTable({
    providerId: v.id('providers'),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal('ai'),
      v.literal('data'),
      v.literal('media'),
      v.literal('agent'),
      v.literal('commerce'),
      v.literal('developer')
    ),
    priceUsd: v.number(),
    priceLabel: v.string(),
    endpointUrl: v.string(),
    method: v.union(v.literal('GET'), v.literal('POST')),
    requestSchemaJson: v.string(),
    responseSchemaJson: v.string(),
    demoPayloadJson: v.optional(v.string()),
    isX402Protected: v.boolean(),
    isAgentReady: v.boolean(),
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('paused')
    ),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_provider', ['providerId'])
    .index('by_slug', ['slug'])
    .index('by_status', ['status'])
    .index('by_category', ['category']),
  apiProductVersions: defineTable({
    productId: v.id('apiProducts'),
    version: v.number(),
    requestSchemaJson: v.string(),
    responseSchemaJson: v.string(),
    endpointUrl: v.string(),
    createdAt: v.number()
  })
    .index('by_product', ['productId'])
    .index('by_product_version', ['productId', 'version']),
  orders: defineTable({
    buyerWallet: v.string(),
    providerId: v.id('providers'),
    productId: v.id('apiProducts'),
    status: v.union(
      v.literal('created'),
      v.literal('payment_required'),
      v.literal('paid'),
      v.literal('forwarding'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('expired')
    ),
    amountUsd: v.number(),
    amountMusd: v.optional(v.string()),
    requestPayloadJson: v.string(),
    responsePayloadJson: v.optional(v.string()),
    externalJobId: v.optional(v.string()),
    resultUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_buyer_wallet', ['buyerWallet'])
    .index('by_provider', ['providerId'])
    .index('by_product', ['productId'])
    .index('by_status', ['status']),
  receipts: defineTable({
    orderId: v.id('orders'),
    buyerWallet: v.string(),
    providerWallet: v.string(),
    amountMusd: v.string(),
    network: v.literal('eip155:31611'),
    txHash: v.optional(v.string()),
    settlementPayloadJson: v.optional(v.string()),
    explorerUrl: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_order', ['orderId'])
    .index('by_buyer_wallet', ['buyerWallet']),
  apiRequests: defineTable({
    orderId: v.id('orders'),
    productId: v.id('apiProducts'),
    providerId: v.id('providers'),
    requestId: v.string(),
    status: v.union(
      v.literal('started'),
      v.literal('forwarded'),
      v.literal('completed'),
      v.literal('failed')
    ),
    latencyMs: v.optional(v.number()),
    upstreamStatusCode: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_order', ['orderId'])
    .index('by_product', ['productId'])
    .index('by_request_id', ['requestId']),
  webhookEndpoints: defineTable({
    providerId: v.id('providers'),
    url: v.string(),
    secretName: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('paused')),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index('by_provider', ['providerId']),
  webhookDeliveries: defineTable({
    endpointId: v.id('webhookEndpoints'),
    orderId: v.optional(v.id('orders')),
    eventType: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('delivered'),
      v.literal('failed')
    ),
    responseStatusCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index('by_endpoint', ['endpointId']),
  apiUsageEvents: defineTable({
    providerId: v.id('providers'),
    productId: v.id('apiProducts'),
    orderId: v.optional(v.id('orders')),
    requestId: v.string(),
    eventType: v.string(),
    amountMusd: v.optional(v.string()),
    platformFeeMusd: v.optional(v.string()),
    providerAmountMusd: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_provider', ['providerId'])
    .index('by_product', ['productId'])
    .index('by_request_id', ['requestId']),
  providerPayouts: defineTable({
    providerId: v.id('providers'),
    amountMusd: v.string(),
    status: v.union(
      v.literal('queued'),
      v.literal('processing'),
      v.literal('paid'),
      v.literal('failed')
    ),
    txHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index('by_provider', ['providerId']),
  savedExamples: defineTable({
    productId: v.id('apiProducts'),
    title: v.string(),
    payloadJson: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index('by_product', ['productId']),
  reviews: defineTable({
    productId: v.id('apiProducts'),
    buyerWallet: v.string(),
    rating: v.number(),
    body: v.optional(v.string()),
    status: v.union(v.literal('published'), v.literal('hidden')),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_product', ['productId'])
    .index('by_buyer_wallet', ['buyerWallet'])
})
