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
  network: 'eip155:31611'
  txHash: string
  explorerUrl: string | null
  createdAt: string
  resultUrl?: string
  agentRunId?: string
  proofId?: string
}

const globalForSettlementReceipts = globalThis as typeof globalThis & {
  __tolloraSettlementReceipts?: MarketplaceReceipt[]
}

export const settlementReceipts =
  globalForSettlementReceipts.__tolloraSettlementReceipts ?? []

globalForSettlementReceipts.__tolloraSettlementReceipts = settlementReceipts

export function getMarketplaceReceiptById(receiptId: string) {
  return settlementReceipts.find(receipt => receipt.id === receiptId)
}

export function recordMarketplaceReceipt(receipt: MarketplaceReceipt) {
  const existingIndex = settlementReceipts.findIndex(
    item => item.id === receipt.id
  )

  if (existingIndex >= 0) {
    settlementReceipts[existingIndex] = receipt
    return receipt
  }

  settlementReceipts.unshift(receipt)

  return receipt
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
