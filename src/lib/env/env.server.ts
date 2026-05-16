import { z } from 'zod'

const optionalString = z.preprocess(
  value => (value === '' ? undefined : value),
  z.string().optional()
)

const optionalUrl = z.preprocess(
  value => (value === '' ? undefined : value),
  z.string().url().optional()
)

const serverSchema = z.object({
  CONVEX_DEPLOYMENT: optionalString,
  TOLLORA_PLATFORM_FEE_BPS: z.preprocess(
    value => (value === '' ? undefined : value),
    z.coerce.number().int().min(0).max(10000).optional()
  ),
  X402_FACILITATOR_URL: optionalUrl,
  CLIPLORE_API_URL: optionalUrl,
  CLIPLORE_API_KEY: optionalString,
  CLIPLORE_WEBHOOK_SECRET: optionalString,
  AGENT_SPENDER_PRIVATE_KEY: optionalString,
  AGENT_ATTESTER_PRIVATE_KEY: optionalString,
  AGENT_LLM_API_KEY: optionalString,
  AGENT_LLM_MODEL: optionalString,
  NODE_ENV: z.enum(['development', 'test', 'production']).optional()
})

export const envServer = serverSchema.parse({
  CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
  TOLLORA_PLATFORM_FEE_BPS: process.env.TOLLORA_PLATFORM_FEE_BPS,
  X402_FACILITATOR_URL: process.env.X402_FACILITATOR_URL,
  CLIPLORE_API_URL: process.env.CLIPLORE_API_URL,
  CLIPLORE_API_KEY: process.env.CLIPLORE_API_KEY,
  CLIPLORE_WEBHOOK_SECRET: process.env.CLIPLORE_WEBHOOK_SECRET,
  AGENT_SPENDER_PRIVATE_KEY: process.env.AGENT_SPENDER_PRIVATE_KEY,
  AGENT_ATTESTER_PRIVATE_KEY: process.env.AGENT_ATTESTER_PRIVATE_KEY,
  AGENT_LLM_API_KEY: process.env.AGENT_LLM_API_KEY,
  AGENT_LLM_MODEL: process.env.AGENT_LLM_MODEL,
  NODE_ENV: process.env.NODE_ENV
})
