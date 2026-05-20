import 'server-only'

import type { MarketplaceReceipt } from '@/features/marketplace/receipts'
import {
  readWorkspaceJsonArray,
  writeWorkspaceJsonArray
} from '@/lib/persistence/workspace-json-store'

const globalForSettlementReceipts = globalThis as typeof globalThis & {
  __tolloraSettlementReceipts?: MarketplaceReceipt[]
}

export const settlementReceipts =
  globalForSettlementReceipts.__tolloraSettlementReceipts ??
  readWorkspaceJsonArray({
    fileName: 'settlement-receipts.json',
    isItem: isMarketplaceReceipt
  })

globalForSettlementReceipts.__tolloraSettlementReceipts = settlementReceipts
persistMarketplaceReceipts()

export function getMarketplaceReceiptById(receiptId: string) {
  return settlementReceipts.find(receipt => receipt.id === receiptId)
}

export function recordMarketplaceReceipt(receipt: MarketplaceReceipt) {
  const existingIndex = settlementReceipts.findIndex(
    item => item.id === receipt.id
  )

  if (existingIndex >= 0) {
    settlementReceipts[existingIndex] = receipt
    persistMarketplaceReceipts()
    return receipt
  }

  settlementReceipts.unshift(receipt)
  persistMarketplaceReceipts()

  return receipt
}

function persistMarketplaceReceipts() {
  writeWorkspaceJsonArray('settlement-receipts.json', settlementReceipts)
}

function isMarketplaceReceipt(value: unknown): value is MarketplaceReceipt {
  if (!value || typeof value !== 'object') {
    return false
  }

  const receipt = value as Partial<MarketplaceReceipt>

  return (
    typeof receipt.id === 'string' &&
    typeof receipt.orderId === 'string' &&
    typeof receipt.requestId === 'string' &&
    typeof receipt.productSlug === 'string' &&
    typeof receipt.productName === 'string' &&
    typeof receipt.providerName === 'string' &&
    typeof receipt.amountMusd === 'string' &&
    typeof receipt.createdAt === 'string'
  )
}
