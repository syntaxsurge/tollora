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
