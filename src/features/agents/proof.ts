import { createHash } from 'node:crypto'

import type { AgentAction, AgentRun } from '@/features/agents/types'

export function hashAgentRunProof(run: AgentRun): `0x${string}` {
  const proofPayload = {
    runId: run.id,
    objective: run.objective,
    allowedTools: run.allowedTools,
    budgetCapMusd: run.budgetCapMusd,
    actions: run.actions.map(action => ({
      id: action.id,
      productSlug: action.productSlug,
      status: action.status,
      orderId: action.orderId,
      receiptId: action.receipt?.id,
      responseHash: action.responsePayload
        ? hashObject(action.responsePayload)
        : undefined
    })),
    deliverables: run.deliverables,
    receiptIds: getAgentRunReceiptIds(run.actions)
  }

  return hashObject(proofPayload)
}

export function getAgentRunReceiptIds(actions: AgentAction[]) {
  return actions
    .map(action => action.receipt?.id)
    .filter((receiptId): receiptId is string => Boolean(receiptId))
}

export function hashObject(value: unknown): `0x${string}` {
  return `0x${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`
}

export function buildProofId(proofHash: `0x${string}`) {
  return `proof_${proofHash.slice(2, 14)}`
}
