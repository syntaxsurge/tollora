import { z } from 'zod'

export const createAgentRunSchema = z.object({
  template: z.string().trim().min(2).optional(),
  objective: z.string().min(12),
  sourceText: z.string().optional(),
  ownerWallet: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Connect a valid 0x wallet address.'),
  budgetCapMusd: z.coerce.number().positive().max(100),
  maxPaidActions: z.coerce.number().int().min(1).max(4),
  allowedTools: z.array(z.string().trim().min(3)).min(1).max(12),
  mode: z.literal('production').optional().default('production')
})
