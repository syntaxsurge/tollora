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
  quotedCredits?: number
  quotedAmountMusd?: string
  paidAmountMusd?: string
  reservedAmountMusd?: string
  actualCredits?: number
  actualAmountMusd?: string
  deltaAmountMusd?: string
  pricingSource?:
    | 'fixed'
    | 'request_payload'
    | 'quote_endpoint'
    | 'provider_response'
  resultReleaseStatus?:
    | 'not_applicable'
    | 'reserved'
    | 'released'
    | 'delta_payment_required'
    | 'credit_due'
    | 'refundable'
  requestId: string
  requestPayloadJson?: string
  receiptId?: string
  explorerUrl?: string | null
  externalJobId?: string
  responsePayload?: unknown
  lockedResponsePayload?: unknown
  createdAt: string
  updatedAt: string
  resultUrl?: string
  lockedResultUrl?: string
  agentRunId?: string
  isProviderTest?: boolean
}
