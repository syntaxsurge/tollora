import { attestAgentRunOnMezo } from '@/features/agents/attestation'
import {
  buildProofId,
  getAgentRunReceiptIds,
  hashAgentRunProof
} from '@/features/agents/proof'
import { executeAgentRunActions } from '@/features/agents/runner'
import type {
  AgentProof,
  AgentRun,
  CreateAgentRunInput
} from '@/features/agents/types'

type AgentGlobalStore = {
  runs: Map<string, AgentRun>
  proofs: Map<string, AgentProof>
}

const globalStore = globalThis as typeof globalThis & {
  __tolloraAgentStore?: AgentGlobalStore
}

const store =
  globalStore.__tolloraAgentStore ??
  (globalStore.__tolloraAgentStore = {
    runs: new Map<string, AgentRun>(),
    proofs: new Map<string, AgentProof>()
  })

const runs = store.runs
const proofs = store.proofs

export function listAgentRuns() {
  return Array.from(runs.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

export function getAgentRun(runId: string) {
  return runs.get(runId)
}

export function getAgentProof(proofId: string) {
  return proofs.get(proofId)
}

export function createAgentRun(input: CreateAgentRunInput) {
  const now = new Date().toISOString()
  const run: AgentRun = {
    id: `run_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    template: 'launch-pack',
    title: 'Launch Pack Agent',
    objective: input.objective,
    sourceText: input.sourceText,
    ownerWallet: input.ownerWallet,
    budgetCapMusd: input.budgetCapMusd,
    maxPaidActions: input.maxPaidActions,
    allowedTools: input.allowedTools,
    mode: input.mode,
    status: 'planned',
    summary:
      'The launch-pack agent is ready to select paid tools, spend within budget, and prepare a Mezo proof.',
    deliverables: {},
    actions: [],
    createdAt: now,
    updatedAt: now
  }

  runs.set(run.id, run)

  return run
}

export async function executeStoredAgentRun(runId: string) {
  const run = getAgentRun(runId)

  if (!run) {
    return null
  }

  const running = {
    ...run,
    status: 'running',
    updatedAt: new Date().toISOString()
  } satisfies AgentRun
  runs.set(run.id, running)

  const result = await executeAgentRunActions(running)
  const nextRun = {
    ...running,
    status: result.status,
    actions: result.actions,
    deliverables: result.deliverables,
    summary: result.summary,
    updatedAt: new Date().toISOString()
  } satisfies AgentRun

  runs.set(run.id, nextRun)

  return nextRun
}

export async function attestStoredAgentRun(runId: string) {
  const run = getAgentRun(runId)

  if (!run) {
    return null
  }

  const proofHash = hashAgentRunProof(run)
  const proofId = buildProofId(proofHash)
  const now = new Date().toISOString()
  const proofBase = {
    id: proofId,
    runId: run.id,
    ownerWallet: run.ownerWallet,
    proofHash,
    proofUri: `/proofs/${proofId}`,
    network: 'eip155:31611',
    receiptIds: getAgentRunReceiptIds(run.actions),
    totalSpendMusd: calculateTotalSpend(run),
    createdAt: now
  } satisfies Omit<AgentProof, 'txHash' | 'explorerUrl'>

  runs.set(run.id, {
    ...run,
    status: 'attesting',
    updatedAt: now
  })

  const attestation = await attestAgentRunOnMezo(run, proofBase)
  const proof: AgentProof = {
    ...proofBase,
    txHash: attestation.txHash,
    explorerUrl: attestation.explorerUrl
  }
  const nextRun = {
    ...run,
    status: 'attested',
    proof,
    updatedAt: new Date().toISOString()
  } satisfies AgentRun

  proofs.set(proof.id, proof)
  runs.set(run.id, nextRun)

  return nextRun
}

export function getAgentMetrics() {
  const allRuns = listAgentRuns()
  const completed = allRuns.filter(run =>
    ['completed', 'attested'].includes(run.status)
  )
  const proofsCount = allRuns.filter(run => run.proof).length

  return {
    totalRuns: allRuns.length,
    completedRuns: completed.length,
    proofCount: proofsCount,
    totalSpendMusd: allRuns
      .reduce((sum, run) => sum + Number(calculateTotalSpend(run)), 0)
      .toFixed(2)
  }
}

function calculateTotalSpend(run: AgentRun) {
  return run.actions
    .reduce((sum, action) => {
      if (action.status !== 'completed') {
        return sum
      }

      return sum + Number(action.amountMusd.replace(' MUSD', ''))
    }, 0)
    .toFixed(2)
}
