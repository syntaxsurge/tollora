import { orderStatuses } from '@/features/marketplace/schemas'

export type OrderStatus = (typeof orderStatuses)[number]

export type MarketplaceOrder = {
  id: string
  productSlug: string
  productName: string
  providerName: string
  providerWallet?: string
  buyerWallet: string
  status: OrderStatus
  amountMusd: string
  requestId: string
  requestPayloadJson?: string
  receiptId?: string
  explorerUrl?: string | null
  externalJobId?: string
  createdAt: string
  updatedAt: string
  resultUrl?: string
  agentRunId?: string
}
