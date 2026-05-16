import type { MarketplaceOrder } from '@/features/marketplace/types'

export const marketplaceOrders: MarketplaceOrder[] = []

export function getMarketplaceOrderById(orderId: string) {
  return marketplaceOrders.find(order => order.id === orderId)
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
