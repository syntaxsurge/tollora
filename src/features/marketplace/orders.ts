import type { MarketplaceOrder } from '@/features/marketplace/types'
import {
  readWorkspaceJsonArray,
  writeWorkspaceJsonArray
} from '@/lib/persistence/workspace-json-store'

const globalForMarketplaceOrders = globalThis as typeof globalThis & {
  __tolloraMarketplaceOrders?: MarketplaceOrder[]
}

export const marketplaceOrders =
  globalForMarketplaceOrders.__tolloraMarketplaceOrders ??
  readWorkspaceJsonArray({
    fileName: 'marketplace-orders.json',
    isItem: isMarketplaceOrder
  })

globalForMarketplaceOrders.__tolloraMarketplaceOrders = marketplaceOrders
persistMarketplaceOrders()

export function getMarketplaceOrderById(orderId: string) {
  return marketplaceOrders.find(order => order.id === orderId)
}

export function recordMarketplaceOrder(order: MarketplaceOrder) {
  const existingIndex = marketplaceOrders.findIndex(
    item => item.id === order.id
  )

  if (existingIndex >= 0) {
    marketplaceOrders[existingIndex] = order
    persistMarketplaceOrders()
    return order
  }

  marketplaceOrders.unshift(order)
  persistMarketplaceOrders()

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

export function deleteMarketplaceOrders(orderIds: string[]) {
  const orderIdSet = new Set(orderIds)
  const initialCount = marketplaceOrders.length

  for (let index = marketplaceOrders.length - 1; index >= 0; index -= 1) {
    if (orderIdSet.has(marketplaceOrders[index].id)) {
      marketplaceOrders.splice(index, 1)
    }
  }

  const deletedCount = initialCount - marketplaceOrders.length

  if (deletedCount > 0) {
    persistMarketplaceOrders()
  }

  return deletedCount
}

function persistMarketplaceOrders() {
  writeWorkspaceJsonArray('marketplace-orders.json', marketplaceOrders)
}

function isMarketplaceOrder(value: unknown): value is MarketplaceOrder {
  if (!value || typeof value !== 'object') {
    return false
  }

  const order = value as Partial<MarketplaceOrder>

  return (
    typeof order.id === 'string' &&
    typeof order.productSlug === 'string' &&
    typeof order.productName === 'string' &&
    typeof order.providerName === 'string' &&
    typeof order.buyerWallet === 'string' &&
    typeof order.status === 'string' &&
    typeof order.requestId === 'string' &&
    typeof order.createdAt === 'string'
  )
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
