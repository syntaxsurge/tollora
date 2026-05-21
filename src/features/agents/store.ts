import { attestAgentRunOnMezo } from '@/features/agents/attestation'
import {
  buildProofId,
  getAgentRunReceiptIds,
  hashAgentRunProof
} from '@/features/agents/proof'
import { executeAgentRunActions } from '@/features/agents/runner'
import { getAgentTemplate } from '@/features/agents/templates'
import type {
  AgentLedgerEvent,
  AgentProof,
  AgentRun,
  CreateAgentRunInput
} from '@/features/agents/types'
import { buildExplorerUrl } from '@/features/marketplace/receipts'
import {
  getAgentRunBytes32,
  getAgentRunVaultAddress,
  getAgentRunVaultExplorerUrl,
  getAgentSignerAddress,
  getAgentVaultPaymentId,
  getMusdTokenAddress,
  parseMusdToAtomic,
  writeAgentRunVault
} from '@/lib/contracts/agent-run-vault'
import { getConvexClient } from '@/lib/db/convex/client'

import { api } from '../../../convex/_generated/api'

type AgentGlobalStore = {
  runs: Map<string, AgentRun>
  proofs: Map<string, AgentProof>
  cancelledRuns: Set<string>
  loadedRuns?: boolean
  loadedProofs?: boolean
}

const globalStore = globalThis as typeof globalThis & {
  __tolloraAgentStore?: AgentGlobalStore
}

const store =
  globalStore.__tolloraAgentStore ??
  (globalStore.__tolloraAgentStore = {
    runs: new Map<string, AgentRun>(),
    proofs: new Map<string, AgentProof>(),
    cancelledRuns: new Set<string>()
  })

store.cancelledRuns ??= new Set<string>()

const runs = store.runs
const proofs = store.proofs
const cancelledRuns = store.cancelledRuns

export async function listAgentRuns() {
  await loadAgentRuns()

  return Array.from(runs.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

export async function getAgentRun(runId: string) {
  await loadAgentRuns()

  return runs.get(runId)
}

export async function getAgentProof(proofId: string) {
  await loadAgentProofs()

  return proofs.get(proofId)
}

export async function createAgentRun(input: CreateAgentRunInput) {
  await loadAgentRuns()

  const now = new Date().toISOString()
  const runId = `run_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  const vaultAddress = getAgentRunVaultAddress() ?? undefined
  const template = getAgentTemplate(input.template)
  const run: AgentRun = {
    id: runId,
    template: template?.id ?? input.template ?? 'custom',
    title: template?.title ?? 'Custom Agent Run',
    objective: input.objective,
    sourceText: input.sourceText,
    ownerWallet: input.ownerWallet,
    budgetCapMusd: input.budgetCapMusd,
    maxPaidActions: input.maxPaidActions,
    allowedTools: input.allowedTools,
    mode: 'production',
    status: 'planned',
    fundingStatus: 'unfunded',
    vaultPaymentId: getAgentRunBytes32(runId),
    vaultAddress,
    vaultExplorerUrl: getAgentRunVaultExplorerUrl(),
    fundedAmountMusd: '0.00 MUSD',
    spentAmountMusd: '0.00 MUSD',
    reservedAmountMusd: '0.00 MUSD',
    refundedAmountMusd: '0.00 MUSD',
    availableAmountMusd: '0.00 MUSD',
    ledgerEvents: [],
    summary:
      'The launch-pack agent is ready to select paid tools, spend within budget, and prepare a Mezo proof.',
    deliverables: {},
    actions: [],
    createdAt: now,
    updatedAt: now
  }

  runs.set(run.id, run)
  cancelledRuns.delete(run.id)
  await persistAgentRun(run)

  return run
}

export async function deleteAgentRun(runId: string) {
  const run = await getAgentRun(runId)

  if (!run) {
    return null
  }

  cancelledRuns.add(runId)

  if (
    ['funded', 'partially_spent', 'refund_available'].includes(
      run.fundingStatus
    ) &&
    run.availableAmountMusd !== '0.00 MUSD'
  ) {
    await writeAgentRunVault({
      functionName: 'cancelRun',
      args: [getAgentRunBytes32(run.id)]
    }).catch(() => null)

    await writeAgentRunVault({
      functionName: 'refundUnused',
      args: [getAgentRunBytes32(run.id)]
    }).catch(() => null)
  }

  runs.delete(runId)
  await getConvexClient().mutation(api.agentState.deleteRun, { runKey: runId })
  Array.from(proofs.entries()).forEach(([proofId, proof]) => {
    if (proof.runId === runId) {
      proofs.delete(proofId)
    }
  })
  await getConvexClient().mutation(api.agentState.deleteProofsForRun, {
    runKey: runId
  })

  return run
}

export function isAgentRunCancelled(runId: string) {
  return cancelledRuns.has(runId)
}

export async function executeStoredAgentRun(runId: string, appUrl?: string) {
  const run = await getAgentRun(runId)

  if (!run) {
    return null
  }

  if (
    !['funded', 'partially_spent', 'refund_available'].includes(
      run.fundingStatus
    )
  ) {
    return {
      ...run,
      summary: 'Fund this agent run before it can spend MUSD through x402.',
      updatedAt: new Date().toISOString()
    } satisfies AgentRun
  }

  const running = {
    ...run,
    status: 'running',
    fundingStatus: 'partially_spent',
    ledgerEvents: [
      ...run.ledgerEvents,
      buildLedgerEvent({
        type: 'run_started',
        label: 'Agent run started with a funded on-chain budget.'
      })
    ],
    updatedAt: new Date().toISOString()
  } satisfies AgentRun
  runs.set(run.id, running)
  await persistAgentRun(running)

  await writeAgentRunVault({
    functionName: 'markRunning',
    args: [getAgentRunBytes32(run.id)]
  }).catch(() => null)

  const result = await executeAgentRunActions(
    running,
    () => isAgentRunCancelled(run.id),
    appUrl
  )

  if (isAgentRunCancelled(run.id)) {
    return null
  }

  const ledgerResult = await buildSpendLedger(running, result.actions)
  const nextRun = {
    ...running,
    status: result.status,
    actions: result.actions,
    deliverables: result.deliverables,
    summary: result.summary,
    fundingStatus:
      ledgerResult.availableAmountMusd === '0.00 MUSD'
        ? 'partially_spent'
        : 'refund_available',
    spentAmountMusd: ledgerResult.spentAmountMusd,
    reservedAmountMusd: ledgerResult.reservedAmountMusd,
    availableAmountMusd: ledgerResult.availableAmountMusd,
    ledgerEvents: ledgerResult.ledgerEvents,
    updatedAt: new Date().toISOString()
  } satisfies AgentRun

  runs.set(run.id, nextRun)
  await persistAgentRun(nextRun)

  await writeAgentRunVault({
    functionName: 'markCompleted',
    args: [getAgentRunBytes32(run.id)]
  }).catch(() => null)

  return nextRun
}

export async function prepareAgentRunFunding(runId: string) {
  const run = await getAgentRun(runId)
  const vaultAddress = getAgentRunVaultAddress()
  const agentSigner = getAgentSignerAddress()

  if (!run) {
    return null
  }

  if (!vaultAddress || !agentSigner) {
    return {
      error:
        'Agent budget vault is not configured. Deploy AgentRunVault and set NEXT_PUBLIC_AGENT_RUN_VAULT_ADDRESS plus AGENT_SPENDER_PRIVATE_KEY.'
    }
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24
  const nextRun = {
    ...run,
    fundingStatus: 'funding_pending',
    vaultAddress,
    vaultExplorerUrl: getAgentRunVaultExplorerUrl(),
    fundingExpiresAt: new Date(expiresAt * 1000).toISOString(),
    ledgerEvents: [
      ...run.ledgerEvents,
      buildLedgerEvent({
        type: 'funding_prepared',
        label: 'Funding request prepared for the agent run vault.',
        amountMusd: `${run.budgetCapMusd.toFixed(2)} MUSD`
      })
    ],
    updatedAt: new Date().toISOString()
  } satisfies AgentRun

  runs.set(run.id, nextRun)
  await persistAgentRun(nextRun)

  return {
    run: nextRun,
    funding: {
      runId: getAgentRunBytes32(run.id),
      vaultAddress,
      tokenAddress: getMusdTokenAddress(),
      amount: parseMusdToAtomic(run.budgetCapMusd).toString(),
      amountMusd: `${run.budgetCapMusd.toFixed(2)} MUSD`,
      agentSigner,
      expiresAt
    }
  }
}

export async function confirmAgentRunFunding({
  runId,
  fundingTxHash,
  approvalTxHash
}: {
  runId: string
  fundingTxHash: string
  approvalTxHash?: string
}) {
  const run = await getAgentRun(runId)

  if (!run) {
    return null
  }

  const amountMusd = `${run.budgetCapMusd.toFixed(2)} MUSD`
  const nextRun = {
    ...run,
    fundingStatus: 'funded',
    fundedAmountMusd: amountMusd,
    availableAmountMusd: amountMusd,
    fundingTxHash,
    fundingExplorerUrl: buildExplorerUrl(fundingTxHash),
    approvalTxHash,
    approvalExplorerUrl: buildExplorerUrl(approvalTxHash),
    ledgerEvents: [
      ...run.ledgerEvents,
      buildLedgerEvent({
        type: 'funded',
        label: 'User funded this autonomous agent run.',
        amountMusd,
        txHash: fundingTxHash,
        explorerUrl: buildExplorerUrl(fundingTxHash)
      })
    ],
    summary:
      'The agent budget is funded. OpenAI can now select tools and Tollora can pay x402 calls inside this budget.',
    updatedAt: new Date().toISOString()
  } satisfies AgentRun

  runs.set(run.id, nextRun)
  await persistAgentRun(nextRun)

  return nextRun
}

export async function refundAgentRunUnusedBudget({
  runId,
  refundTxHash
}: {
  runId: string
  refundTxHash?: string
}) {
  const run = await getAgentRun(runId)

  if (!run) {
    return null
  }

  const available = run.availableAmountMusd
  const tx =
    refundTxHash ??
    (
      await writeAgentRunVault({
        functionName: 'refundUnused',
        args: [getAgentRunBytes32(run.id)]
      }).catch(() => null)
    )?.txHash

  const nextRun = {
    ...run,
    fundingStatus: 'refunded',
    refundedAmountMusd: addMusd(run.refundedAmountMusd, available),
    availableAmountMusd: '0.00 MUSD',
    refundTxHash: tx,
    refundExplorerUrl: buildExplorerUrl(tx),
    ledgerEvents: [
      ...run.ledgerEvents,
      buildLedgerEvent({
        type: 'unused_refunded',
        label: 'Unused agent budget was returned to the owner.',
        amountMusd: available,
        txHash: tx,
        explorerUrl: buildExplorerUrl(tx)
      })
    ],
    updatedAt: new Date().toISOString()
  } satisfies AgentRun

  runs.set(run.id, nextRun)
  await persistAgentRun(nextRun)

  return nextRun
}

export async function getAgentRunLedger(runId: string) {
  return (await getAgentRun(runId))?.ledgerEvents ?? null
}

export async function attestStoredAgentRun(runId: string) {
  const run = await getAgentRun(runId)

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

  const attestingRun = {
    ...run,
    status: 'attesting',
    updatedAt: now
  } satisfies AgentRun
  runs.set(run.id, attestingRun)
  await persistAgentRun(attestingRun)

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
  await persistAgentProof(proof)
  await persistAgentRun(nextRun)

  return nextRun
}

export async function getAgentMetrics() {
  const allRuns = await listAgentRuns()
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

function buildLedgerEvent({
  type,
  label,
  amountMusd,
  txHash,
  explorerUrl,
  actionId
}: Omit<AgentLedgerEvent, 'id' | 'createdAt'>): AgentLedgerEvent {
  return {
    id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    type,
    label,
    amountMusd,
    txHash,
    explorerUrl,
    actionId,
    createdAt: new Date().toISOString()
  }
}

async function buildSpendLedger(run: AgentRun, actions: AgentRun['actions']) {
  const newEvents: AgentLedgerEvent[] = []
  let spent = 0

  for (const action of actions) {
    if (action.status !== 'completed' || !action.receipt) {
      continue
    }

    const amount = parseMusd(action.amountMusd)
    const paymentId = getAgentVaultPaymentId(run.id, action.id)
    const tx = await writeAgentRunVault({
      functionName: 'recordSpend',
      args: [getAgentRunBytes32(run.id), paymentId, parseMusdToAtomic(amount)]
    }).catch(() => null)

    spent += amount
    newEvents.push(
      buildLedgerEvent({
        type: 'spend_recorded',
        label: `Agent spent budget on ${action.productName}.`,
        amountMusd: `${amount.toFixed(2)} MUSD`,
        txHash: tx?.txHash ?? action.receipt.txHash,
        explorerUrl: tx?.explorerUrl ?? action.receipt.explorerUrl,
        actionId: action.id
      })
    )
  }

  const funded = parseMusd(run.fundedAmountMusd)
  const available = Math.max(0, funded - spent)

  return {
    spentAmountMusd: `${spent.toFixed(2)} MUSD`,
    reservedAmountMusd: '0.00 MUSD',
    availableAmountMusd: `${available.toFixed(2)} MUSD`,
    ledgerEvents: [
      ...run.ledgerEvents,
      ...newEvents,
      buildLedgerEvent({
        type: 'run_completed',
        label: 'Agent execution ended. Any remaining budget can be refunded.',
        amountMusd: `${available.toFixed(2)} MUSD`
      })
    ]
  }
}

async function loadAgentRuns() {
  if (store.loadedRuns) {
    return
  }

  const rows = await getConvexClient().query(api.agentState.listRuns, {})
  runs.clear()

  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (isAgentRun(row)) {
        runs.set(row.id, row)
      }
    }
  }

  store.loadedRuns = true
}

async function loadAgentProofs() {
  if (store.loadedProofs) {
    return
  }

  const rows = await getConvexClient().query(api.agentState.listProofs, {})
  proofs.clear()

  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (isAgentProof(row)) {
        proofs.set(row.id, row)
      }
    }
  }

  store.loadedProofs = true
}

async function persistAgentRun(run: AgentRun) {
  await getConvexClient().mutation(api.agentState.upsertRun, {
    runKey: run.id,
    runJson: JSON.stringify(run)
  })
}

async function persistAgentProof(proof: AgentProof) {
  await getConvexClient().mutation(api.agentState.upsertProof, {
    proofKey: proof.id,
    proofJson: JSON.stringify(proof)
  })
}

function parseMusd(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ''))

  return Number.isFinite(amount) ? amount : 0
}

function addMusd(first: string, second: string) {
  return `${(parseMusd(first) + parseMusd(second)).toFixed(2)} MUSD`
}

function isAgentRun(value: unknown): value is AgentRun {
  if (!value || typeof value !== 'object') {
    return false
  }

  const run = value as Partial<AgentRun>

  return (
    typeof run.id === 'string' &&
    typeof run.title === 'string' &&
    typeof run.objective === 'string' &&
    typeof run.ownerWallet === 'string' &&
    typeof run.status === 'string' &&
    Array.isArray(run.actions) &&
    typeof run.createdAt === 'string'
  )
}

function isAgentProof(value: unknown): value is AgentProof {
  if (!value || typeof value !== 'object') {
    return false
  }

  const proof = value as Partial<AgentProof>

  return (
    typeof proof.id === 'string' &&
    typeof proof.runId === 'string' &&
    typeof proof.ownerWallet === 'string' &&
    typeof proof.proofHash === 'string' &&
    typeof proof.createdAt === 'string'
  )
}
