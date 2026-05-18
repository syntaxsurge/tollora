import { z } from 'zod'

export const apiProductCategories = [
  'ai',
  'data',
  'media',
  'agent',
  'commerce',
  'developer'
] as const

export const apiProductStatuses = ['draft', 'published', 'paused'] as const
export const apiProductExecutionModes = [
  'synchronous',
  'asynchronous'
] as const
export const apiProductSettlementModels = [
  'pay_on_successful_response',
  'pay_on_job_acceptance',
  'pay_to_claim_result'
] as const
export const apiProductResultDeliveries = [
  'direct_response',
  'poll_or_webhook',
  'claim_after_completion'
] as const
export const apiProductAuthTypes = [
  'none',
  'bearer',
  'api_key_header',
  'api_key_query',
  'basic'
] as const

export const orderStatuses = [
  'created',
  'payment_required',
  'paid',
  'forwarding',
  'processing',
  'completed',
  'failed',
  'expired'
] as const

export const apiProductSchema = z.object({
  name: z.string().trim().min(3).max(90),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(90)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(apiProductCategories),
  description: z.string().trim().min(20).max(800),
  priceUsd: z.coerce.number().positive().max(100000),
  endpointUrl: z.string().trim().url(),
  method: z.enum(['GET', 'POST']),
  estimatedLatency: z.string().trim().min(2).max(80).default('Depends on API'),
  executionMode: z.enum(apiProductExecutionModes).default('synchronous'),
  settlementModel: z
    .enum(apiProductSettlementModels)
    .default('pay_on_successful_response'),
  resultDelivery: z.enum(apiProductResultDeliveries).default('direct_response'),
  authType: z.enum(apiProductAuthTypes).default('none'),
  authHeaderName: z.string().trim().max(80).optional(),
  authQueryParam: z.string().trim().max(80).optional(),
  authSecret: z.string().trim().max(2000).optional(),
  authUsername: z.string().trim().max(200).optional(),
  authPassword: z.string().trim().max(2000).optional(),
  timeoutSeconds: z.coerce.number().int().min(1).max(900).default(60),
  idempotencyHeader: z.string().trim().max(80).optional(),
  statusEndpointUrl: z.string().trim().url().optional().or(z.literal('')),
  statusMethod: z.enum(['GET', 'POST']).default('GET'),
  externalJobIdPath: z.string().trim().max(120).optional(),
  statusPath: z.string().trim().max(120).optional(),
  resultUrlPath: z.string().trim().max(120).optional(),
  errorMessagePath: z.string().trim().max(120).optional(),
  requestSchemaJson: z.string().trim().min(2),
  responseSchemaJson: z.string().trim().min(2),
  referencePayloadJson: z.string().trim().optional(),
  receivingWallet: z.string().trim().min(10),
  status: z.enum(apiProductStatuses).default('draft'),
  isX402Protected: z.coerce.boolean().default(true),
  isAgentReady: z.coerce.boolean().default(true),
  webhookUrl: z.string().trim().url().optional().or(z.literal(''))
})

export const createOrderSchema = z.object({
  productSlug: z.string().trim().min(3),
  buyerWallet: z.string().trim().min(10),
  requestPayloadJson: z.string().trim().min(2)
})

export type ApiProductFormValues = z.infer<typeof apiProductSchema>
export type CreateOrderValues = z.infer<typeof createOrderSchema>

export function parseJsonField(value: string, fieldName: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new Error(`${fieldName} must contain valid JSON.`)
  }
}

export function formatMusdAmount(amount: number) {
  return `${amount.toFixed(2)} MUSD`
}

export function getPlatformFee(amountUsd: number, feeBps = 500) {
  return Number(((amountUsd * feeBps) / 10000).toFixed(2))
}

export function getProviderAmount(amountUsd: number, feeBps = 500) {
  return Number((amountUsd - getPlatformFee(amountUsd, feeBps)).toFixed(2))
}
