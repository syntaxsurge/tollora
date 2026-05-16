import { z } from 'zod'

export const agentToolSlugs = [
  'prompt-enhancer-api',
  'document-summary-api',
  'market-snapshot-api',
  'cliplore-ai-video-generator'
] as const

export const createAgentRunSchema = z.object({
  objective: z.string().min(12),
  sourceText: z.string().optional(),
  ownerWallet: z.string().min(10),
  budgetCapMusd: z.coerce.number().positive().max(100),
  maxPaidActions: z.coerce.number().int().min(1).max(4),
  allowedTools: z.array(z.enum(agentToolSlugs)).min(1).max(4),
  mode: z.enum(['local', 'production']).default('local')
})
