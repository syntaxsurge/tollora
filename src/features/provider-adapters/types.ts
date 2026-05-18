export type ProviderAdapterInput = {
  productSlug: string
  orderId: string
  requestId: string
  requestPayload: unknown
  buyerWallet: string
  receiptId: string
}

export type ProviderAdapterResult = {
  status: 'completed' | 'processing' | 'failed'
  responsePayload?: unknown
  externalJobId?: string
  resultUrl?: string
  errorMessage?: string
}

export interface ProviderAdapter {
  id: string
  call(input: ProviderAdapterInput): Promise<ProviderAdapterResult>
  getStatus?(
    externalJobId: string,
    productSlug?: string
  ): Promise<ProviderAdapterResult>
}
