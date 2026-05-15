import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

export const getByOwnerWallet = query({
  args: { ownerWallet: v.string() },
  handler: async (ctx: any, args: { ownerWallet: string }) => {
    return await ctx.db
      .query('providers')
      .withIndex('by_owner_wallet', (q: any) =>
        q.eq('ownerWallet', args.ownerWallet)
      )
      .first()
  }
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx: any, args: { slug: string }) => {
    return await ctx.db
      .query('providers')
      .withIndex('by_slug', (q: any) => q.eq('slug', args.slug))
      .first()
  }
})

export const createProvider = mutation({
  args: {
    ownerWallet: v.string(),
    displayName: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    receivingWallet: v.string()
  },
  handler: async (
    ctx: any,
    args: {
      ownerWallet: string
      displayName: string
      slug: string
      description?: string
      websiteUrl?: string
      logoUrl?: string
      receivingWallet: string
    }
  ) => {
    const existing = await ctx.db
      .query('providers')
      .withIndex('by_slug', (q: any) => q.eq('slug', args.slug))
      .first()

    if (existing) {
      throw new Error('Provider slug is already in use.')
    }

    const now = Date.now()

    return await ctx.db.insert('providers', {
      ...args,
      status: 'active',
      createdAt: now,
      updatedAt: now
    })
  }
})

export const updateSettings = mutation({
  args: {
    providerId: v.id('providers'),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    receivingWallet: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal('active'), v.literal('pending'), v.literal('suspended'))
    )
  },
  handler: async (
    ctx: any,
    args: {
      providerId: string
      displayName?: string
      description?: string
      websiteUrl?: string
      logoUrl?: string
      receivingWallet?: string
      status?: 'active' | 'pending' | 'suspended'
    }
  ) => {
    const { providerId, ...updates } = args

    await ctx.db.patch(providerId, {
      ...updates,
      updatedAt: Date.now()
    })

    return providerId
  }
})
