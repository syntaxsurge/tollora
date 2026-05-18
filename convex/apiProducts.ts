import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

const category = v.union(
  v.literal('ai'),
  v.literal('data'),
  v.literal('media'),
  v.literal('agent'),
  v.literal('commerce'),
  v.literal('developer')
)

const productStatus = v.union(
  v.literal('draft'),
  v.literal('published'),
  v.literal('paused')
)

export const listMarketplace = query({
  args: {
    category: v.optional(category),
    search: v.optional(v.string())
  },
  handler: async (
    ctx: any,
    args: { category?: string; search?: string | undefined }
  ) => {
    const rows = args.category
      ? await ctx.db
          .query('apiProducts')
          .withIndex('by_category', (q: any) => q.eq('category', args.category))
          .collect()
      : await ctx.db.query('apiProducts').collect()

    const normalizedSearch = args.search?.trim().toLowerCase()

    return rows
      .filter((row: any) => row.status === 'published')
      .filter((row: any) => {
        if (!normalizedSearch) {
          return true
        }

        return `${row.name} ${row.description} ${row.slug}`
          .toLowerCase()
          .includes(normalizedSearch)
      })
  }
})

export const listByProvider = query({
  args: { providerId: v.id('providers') },
  handler: async (ctx: any, args: { providerId: string }) => {
    return await ctx.db
      .query('apiProducts')
      .withIndex('by_provider', (q: any) => q.eq('providerId', args.providerId))
      .collect()
  }
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx: any, args: { slug: string }) => {
    return await ctx.db
      .query('apiProducts')
      .withIndex('by_slug', (q: any) => q.eq('slug', args.slug))
      .first()
  }
})

export const create = mutation({
  args: {
    providerId: v.id('providers'),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    category,
    priceUsd: v.number(),
    priceLabel: v.string(),
    endpointUrl: v.string(),
    method: v.union(v.literal('GET'), v.literal('POST')),
    estimatedLatency: v.optional(v.string()),
    executionMode: v.optional(
      v.union(v.literal('synchronous'), v.literal('asynchronous'))
    ),
    settlementModel: v.optional(
      v.union(
        v.literal('pay_on_successful_response'),
        v.literal('pay_on_job_acceptance'),
        v.literal('pay_to_claim_result')
      )
    ),
    resultDelivery: v.optional(
      v.union(
        v.literal('direct_response'),
        v.literal('poll_or_webhook'),
        v.literal('claim_after_completion')
      )
    ),
    authType: v.optional(
      v.union(
        v.literal('none'),
        v.literal('bearer'),
        v.literal('api_key_header'),
        v.literal('api_key_query'),
        v.literal('basic')
      )
    ),
    authHeaderName: v.optional(v.string()),
    authQueryParam: v.optional(v.string()),
    authSecretName: v.optional(v.string()),
    statusEndpointUrl: v.optional(v.string()),
    statusMethod: v.optional(v.union(v.literal('GET'), v.literal('POST'))),
    externalJobIdPath: v.optional(v.string()),
    statusPath: v.optional(v.string()),
    resultUrlPath: v.optional(v.string()),
    errorMessagePath: v.optional(v.string()),
    timeoutSeconds: v.optional(v.number()),
    idempotencyHeader: v.optional(v.string()),
    requestSchemaJson: v.string(),
    responseSchemaJson: v.string(),
    demoPayloadJson: v.optional(v.string()),
    isX402Protected: v.boolean(),
    isAgentReady: v.boolean(),
    status: productStatus
  },
  handler: async (ctx: any, args: Record<string, unknown>) => {
    const existing = await ctx.db
      .query('apiProducts')
      .withIndex('by_slug', (q: any) => q.eq('slug', args.slug))
      .first()

    if (existing) {
      throw new Error('API product slug is already in use.')
    }

    const now = Date.now()
    const productId = await ctx.db.insert('apiProducts', {
      ...args,
      createdAt: now,
      updatedAt: now
    })

    await ctx.db.insert('apiProductVersions', {
      productId,
      version: 1,
      requestSchemaJson: args.requestSchemaJson,
      responseSchemaJson: args.responseSchemaJson,
      endpointUrl: args.endpointUrl,
      createdAt: now
    })

    return productId
  }
})

export const publish = mutation({
  args: { productId: v.id('apiProducts') },
  handler: async (ctx: any, args: { productId: string }) => {
    await ctx.db.patch(args.productId, {
      status: 'published',
      updatedAt: Date.now()
    })
    return args.productId
  }
})

export const pause = mutation({
  args: { productId: v.id('apiProducts') },
  handler: async (ctx: any, args: { productId: string }) => {
    await ctx.db.patch(args.productId, {
      status: 'paused',
      updatedAt: Date.now()
    })
    return args.productId
  }
})
