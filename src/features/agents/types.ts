import type { MarketplaceReceipt } from '@/features/marketplace/receipts'

export type AgentRunStatus =
  | 'planned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'attesting'
  | 'attested'

export type AgentActionStatus =
  | 'planned'
  | 'quoted'
  | 'paid'
  | 'completed'
  | 'skipped'
  | 'failed'

export type AgentRunMode = 'local' | 'production'

export type AgentToolSlug = string

export type AgentAction = {
  id: string
  runId: string
  productSlug: AgentToolSlug
  productName: string
  providerName: string
  status: AgentActionStatus
  amountMusd: string
  objective: string
  requestPayload: Record<string, unknown>
  responsePayload?: Record<string, unknown>
  receipt?: MarketplaceReceipt
  orderId?: string
  requestId?: string
  errorMessage?: string
  startedAt?: string
  completedAt?: string
}

export type AgentProof = {
  id: string
  runId: string
  ownerWallet: string
  proofHash: `0x${string}`
  proofUri: string
  network: 'eip155:31611'
  txHash: string | null
  explorerUrl: string | null
  receiptIds: string[]
  totalSpendMusd: string
  createdAt: string
}

export type AgentRun = {
  id: string
  template: 'launch-pack'
  title: string
  objective: string
  sourceText?: string
  ownerWallet: string
  budgetCapMusd: number
  maxPaidActions: number
  allowedTools: AgentToolSlug[]
  mode: AgentRunMode
  status: AgentRunStatus
  summary: string
  deliverables: {
    launchBrief?: string
    developerCopy?: string
    marketSignal?: string
    videoResultUrl?: string
  }
  actions: AgentAction[]
  proof?: AgentProof
  createdAt: string
  updatedAt: string
}

export type CreateAgentRunInput = {
  objective: string
  sourceText?: string
  ownerWallet: string
  budgetCapMusd: number
  maxPaidActions: number
  allowedTools: AgentToolSlug[]
  mode: AgentRunMode
}
