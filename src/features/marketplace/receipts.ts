import { getProviderAmount, getPlatformFee } from '@/features/marketplace/schemas'
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

export const demoReceipts: MarketplaceReceipt[] = [
  {
    id: 'rcpt_prompt_042',
    orderId: 'ord_prompt_042',
    requestId: 'req_prompt_4d20b1',
    productSlug: 'prompt-enhancer-api',
    productName: 'Prompt Enhancer API',
    providerName: 'Tollora Labs',
    buyerWallet: '0x6d4aaf20a9be71d3c2c8b7f0d15c3c9af91244aa',
    providerWallet: '0x3161100000000000000000000000000000000002',
    amountMusd: '0.08 MUSD',
    platformFeeMusd: '0.00 MUSD',
    providerAmountMusd: '0.08 MUSD',
    network: 'eip155:31611',
    txHash: '0x3b4f1f4d47783f01c9d9b4327bb3d91c7e97f829c879ffcf09f9f3f47dfb1a42',
    explorerUrl:
      'https://explorer.test.mezo.org/tx/0x3b4f1f4d47783f01c9d9b4327bb3d91c7e97f829c879ffcf09f9f3f47dfb1a42',
    createdAt: '2026-05-14T08:11:02.000Z',
    resultUrl: '/orders/ord_prompt_042'
  }
]

export function getDemoReceiptById(receiptId: string) {
  return demoReceipts.find(receipt => receipt.id === receiptId)
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
