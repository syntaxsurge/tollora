import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

export const getById = query({
  args: { receiptId: v.id('receipts') },
  handler: async (ctx: any, args: { receiptId: string }) => {
    return await ctx.db.get(args.receiptId)
  }
})

export const listByWallet = query({
  args: { buyerWallet: v.string() },
  handler: async (ctx: any, args: { buyerWallet: string }) => {
    return await ctx.db
      .query('receipts')
      .withIndex('by_buyer_wallet', (q: any) =>
        q.eq('buyerWallet', args.buyerWallet)
      )
      .collect()
  }
})

export const create = mutation({
  args: {
    orderId: v.id('orders'),
    buyerWallet: v.string(),
    providerWallet: v.string(),
    amountMusd: v.string(),
    txHash: v.optional(v.string()),
    settlementPayloadJson: v.optional(v.string()),
    explorerUrl: v.optional(v.string())
  },
  handler: async (
    ctx: any,
    args: {
      orderId: string
      buyerWallet: string
      providerWallet: string
      amountMusd: string
      txHash?: string
      settlementPayloadJson?: string
      explorerUrl?: string
    }
  ) => {
    return await ctx.db.insert('receipts', {
      ...args,
      network: 'eip155:31611',
      createdAt: Date.now()
    })
  }
})
