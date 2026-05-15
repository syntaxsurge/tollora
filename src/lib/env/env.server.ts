import { z } from 'zod'

const serverSchema = z.object({
  CONVEX_DEPLOYMENT: z.string().optional(),
  TOLLORA_PLATFORM_FEE_BPS: z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .optional(),
  X402_FACILITATOR_URL: z.string().url().optional(),
  CLIPLORE_API_URL: z.string().url().optional(),
  CLIPLORE_API_KEY: z.string().optional(),
  CLIPLORE_WEBHOOK_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional()
})

export const envServer = serverSchema.parse({
  CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
  TOLLORA_PLATFORM_FEE_BPS: process.env.TOLLORA_PLATFORM_FEE_BPS,
  X402_FACILITATOR_URL: process.env.X402_FACILITATOR_URL,
  CLIPLORE_API_URL: process.env.CLIPLORE_API_URL,
  CLIPLORE_API_KEY: process.env.CLIPLORE_API_KEY,
  CLIPLORE_WEBHOOK_SECRET: process.env.CLIPLORE_WEBHOOK_SECRET,
  NODE_ENV: process.env.NODE_ENV
})
