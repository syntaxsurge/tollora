import type { MarketplaceOrder } from '@/features/marketplace/types'

export const demoOrders: MarketplaceOrder[] = [
  {
    id: 'ord_cliplore_render_001',
    productSlug: 'cliplore-ai-video-generator',
    productName: 'ClipLore AI Video Generator',
    providerName: 'ClipLore',
    providerWallet: '0x3161100000000000000000000000000000000001',
    buyerWallet: '0x8f2b5c7a91d3e40f61a8b4d2c5e9f0012a3b4c5d',
    status: 'processing',
    amountMusd: '18.00 MUSD',
    requestId: 'req_video_9f7c2a',
    requestPayloadJson:
      '{"prompt":"Create a product teaser for a MUSD-native paid API gateway.","format":"vertical","duration":"30s"}',
    createdAt: '2026-05-14T09:35:00.000Z',
    updatedAt: '2026-05-14T09:39:00.000Z'
  },
  {
    id: 'ord_prompt_042',
    productSlug: 'prompt-enhancer-api',
    productName: 'Prompt Enhancer API',
    providerName: 'Tollora Labs',
    providerWallet: '0x3161100000000000000000000000000000000002',
    buyerWallet: '0x6d4aaf20a9be71d3c2c8b7f0d15c3c9af91244aa',
    status: 'completed',
    amountMusd: '0.08 MUSD',
    requestId: 'req_prompt_4d20b1',
    requestPayloadJson:
      '{"prompt":"Write a launch post for my API product.","audience":"developers","outputStyle":"concise"}',
    receiptId: 'rcpt_prompt_042',
    explorerUrl:
      'https://explorer.test.mezo.org/tx/0x3b4f1f4d47783f01c9d9b4327bb3d91c7e97f829c879ffcf09f9f3f47dfb1a42',
    createdAt: '2026-05-14T08:11:00.000Z',
    updatedAt: '2026-05-14T08:11:02.000Z',
    resultUrl: '/orders/ord_prompt_042'
  },
  {
    id: 'ord_summary_017',
    productSlug: 'document-summary-api',
    productName: 'Document Summary API',
    providerName: 'Tollora Labs',
    providerWallet: '0x3161100000000000000000000000000000000002',
    buyerWallet: '0xf16c7aa45c95be6431ca3a7c624dbb066d45a991',
    status: 'payment_required',
    amountMusd: '0.24 MUSD',
    requestId: 'req_summary_82acd0',
    requestPayloadJson:
      '{"documentText":"Paste the document content to summarize.","summaryDepth":"standard"}',
    createdAt: '2026-05-14T07:46:00.000Z',
    updatedAt: '2026-05-14T07:46:00.000Z'
  }
]

export function getDemoOrderById(orderId: string) {
  return demoOrders.find(order => order.id === orderId)
}

export function getOrderMetrics() {
  const completed = demoOrders.filter(order => order.status === 'completed')
  const processing = demoOrders.filter(order => order.status === 'processing')
  const paymentRequired = demoOrders.filter(
    order => order.status === 'payment_required'
  )

  return {
    total: demoOrders.length,
    completed: completed.length,
    processing: processing.length,
    paymentRequired: paymentRequired.length
  }
}
