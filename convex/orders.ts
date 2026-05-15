import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

const orderStatus = v.union(
  v.literal('created'),
  v.literal('payment_required'),
  v.literal('paid'),
  v.literal('forwarding'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('expired')
)

export const getById = query({
  args: { orderId: v.id('orders') },
  handler: async (ctx: any, args: { orderId: string }) => {
    return await ctx.db.get(args.orderId)
  }
})

export const listByWallet = query({
  args: { buyerWallet: v.string() },
  handler: async (ctx: any, args: { buyerWallet: string }) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_buyer_wallet', (q: any) =>
        q.eq('buyerWallet', args.buyerWallet)
      )
      .collect()
  }
})

export const create = mutation({
  args: {
    buyerWallet: v.string(),
    providerId: v.id('providers'),
    productId: v.id('apiProducts'),
    amountUsd: v.number(),
    amountMusd: v.optional(v.string()),
    requestPayloadJson: v.string()
  },
  handler: async (
    ctx: any,
    args: {
      buyerWallet: string
      providerId: string
      productId: string
      amountUsd: number
      amountMusd?: string
      requestPayloadJson: string
    }
  ) => {
    const now = Date.now()

    return await ctx.db.insert('orders', {
      ...args,
      status: 'payment_required',
      createdAt: now,
      updatedAt: now
    })
  }
})

export const updateStatus = mutation({
  args: {
    orderId: v.id('orders'),
    status: orderStatus,
    responsePayloadJson: v.optional(v.string()),
    externalJobId: v.optional(v.string()),
    resultUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string())
  },
  handler: async (
    ctx: any,
    args: {
      orderId: string
      status: string
      responsePayloadJson?: string
      externalJobId?: string
      resultUrl?: string
      errorMessage?: string
    }
  ) => {
    const { orderId, ...updates } = args

    await ctx.db.patch(orderId, {
      ...updates,
      updatedAt: Date.now()
    })

    return orderId
  }
})

export const markPaid = mutation({
  args: {
    orderId: v.id('orders'),
    amountMusd: v.string()
  },
  handler: async (
    ctx: any,
    args: {
      orderId: string
      amountMusd: string
    }
  ) => {
    await ctx.db.patch(args.orderId, {
      status: 'paid',
      amountMusd: args.amountMusd,
      updatedAt: Date.now()
    })

    return args.orderId
  }
})
