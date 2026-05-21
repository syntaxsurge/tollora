import {
  getProviderAmount,
  getPlatformFee
} from '@/features/marketplace/schemas'
import { getExplorerTransactionUrl } from '@/lib/config/chains'

export type MarketplaceReceipt = {
  id: string
  orderId: string
  requestId: string
  productSlug: string
  productName: string
  providerName: string
  buyerWallet: string
  providerWallet: string
  amountMusd: string
  platformFeeMusd: string
  providerAmountMusd: string
  providerPlan?: string
  platformFeeBps?: number
  providerShareBps?: number
  network: 'eip155:31611'
  txHash: string
  explorerUrl: string | null
  escrowAddress?: string
  escrowPaymentId?: string
  escrowStatus?: 'reserved' | 'released' | 'refunded' | 'failed'
  escrowReleaseTxHash?: string
  escrowReleaseExplorerUrl?: string | null
  escrowRefundTxHash?: string
  escrowRefundExplorerUrl?: string | null
  createdAt: string
  resultUrl?: string
  agentRunId?: string
  proofId?: string
}

export function buildReceiptAmounts(priceUsd: number, feeBps = 500) {
  return {
    platformFeeMusd: `${getPlatformFee(priceUsd, feeBps).toFixed(2)} MUSD`,
    providerAmountMusd: `${getProviderAmount(priceUsd, feeBps).toFixed(2)} MUSD`
  }
}

export function buildExplorerUrl(txHash: string | null | undefined) {
  return getExplorerTransactionUrl(txHash, 31611)
}
