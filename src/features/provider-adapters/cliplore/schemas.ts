import { z } from 'zod'

export const cliploreRequestSchema = z.object({
  prompt: z.string().trim().min(8).max(2000),
  format: z.enum(['short', 'square', 'vertical']),
  duration: z.enum(['15s', '30s', '60s']),
  script: z.string().trim().max(4000).optional(),
  sourcePreferences: z.array(z.string().trim().min(1).max(120)).max(8).optional()
})

export const cliploreWebhookSchema = z.object({
  orderId: z.string().trim().min(3),
  receiptId: z.string().trim().min(3).optional(),
  externalJobId: z.string().trim().min(3),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  resultUrl: z.string().trim().url().optional(),
  errorMessage: z.string().trim().max(1000).optional()
})

export type ClipLoreWebhookPayload = z.infer<typeof cliploreWebhookSchema>
