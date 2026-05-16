import type { MarketplaceOrder } from '@/features/marketplace/types'

const globalForMarketplaceOrders = globalThis as typeof globalThis & {
  __tolloraMarketplaceOrders?: MarketplaceOrder[]
}

export const marketplaceOrders =
  globalForMarketplaceOrders.__tolloraMarketplaceOrders ?? []

globalForMarketplaceOrders.__tolloraMarketplaceOrders = marketplaceOrders

export function getMarketplaceOrderById(orderId: string) {
  return marketplaceOrders.find(order => order.id === orderId)
}

export function recordMarketplaceOrder(order: MarketplaceOrder) {
  const existingIndex = marketplaceOrders.findIndex(
    item => item.id === order.id
  )

  if (existingIndex >= 0) {
    marketplaceOrders[existingIndex] = order
    return order
  }

  marketplaceOrders.unshift(order)

  return order
}

export function updateMarketplaceOrder(
  orderId: string,
  updates: Partial<MarketplaceOrder>
) {
  const existing = getMarketplaceOrderById(orderId)

  if (!existing) {
    return null
  }

  const nextOrder = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString()
  }

  recordMarketplaceOrder(nextOrder)

  return nextOrder
}

export function getOrderMetrics() {
  const completed = marketplaceOrders.filter(
    order => order.status === 'completed'
  )
  const processing = marketplaceOrders.filter(
    order => order.status === 'processing'
  )
  const paymentRequired = marketplaceOrders.filter(
    order => order.status === 'payment_required'
  )

  return {
    total: marketplaceOrders.length,
    completed: completed.length,
    processing: processing.length,
    paymentRequired: paymentRequired.length
  }
}
