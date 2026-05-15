import type { ApiProductStatus } from '@/features/marketplace/products'
import type { OrderStatus } from '@/features/marketplace/types'

export const productStatusLabels: Record<ApiProductStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused'
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  created: 'Created',
  payment_required: 'Payment required',
  paid: 'Paid',
  forwarding: 'Forwarding',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired'
}

export const orderStatusDetails: Record<OrderStatus, string> = {
  created: 'The request has been prepared and is ready for payment.',
  payment_required: 'The gateway is waiting for a valid MUSD payment payload.',
  paid: 'Payment metadata has been accepted for this request.',
  forwarding: 'Tollora is forwarding the paid request to the provider.',
  processing: 'The provider accepted the request and is processing the result.',
  completed: 'The provider response is ready for the buyer.',
  failed: 'The provider request failed and can be retried with a new request.',
  expired: 'The request window closed before completion.'
}
