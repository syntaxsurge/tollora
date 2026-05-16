import { attestAgentRunOnMezo } from '@/features/agents/attestation'
import { buildProofId, getAgentRunReceiptIds, hashAgentRunProof } from '@/features/agents/proof'
import { executeAgentRunActions } from '@/features/agents/runner'
import type {
  AgentProof,
  AgentRun,
  CreateAgentRunInput
} from '@/features/agents/types'

type AgentGlobalStore = {
  runs: Map<string, AgentRun>
  proofs: Map<string, AgentProof>
  seeded: boolean
}

const globalStore = globalThis as typeof globalThis & {
  __tolloraAgentStore?: AgentGlobalStore
}

const store =
  globalStore.__tolloraAgentStore ??
  (globalStore.__tolloraAgentStore = {
    runs: new Map<string, AgentRun>(),
    proofs: new Map<string, AgentProof>(),
    seeded: false
  })

const runs = store.runs
const proofs = store.proofs

if (!store.seeded) {
  const demoRun = createDemoRun()
  runs.set(demoRun.id, demoRun)
  if (demoRun.proof) {
    proofs.set(demoRun.proof.id, demoRun.proof)
  }
  store.seeded = true
}

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

function createDemoRun() {
  const now = '2026-05-16T09:00:00.000Z'
  const proofHash =
    '0x9b28a42d72a25de2261781f031611c05d5e2f627c5abc115f89bb8e103d7a402' as const
  const proof: AgentProof = {
    id: 'proof_9b28a42d72a2',
    runId: 'run_launch_demo',
    ownerWallet: '0x6d4aaf20a9be71d3c2c8b7f0d15c3c9af91244aa',
    proofHash,
    proofUri: '/proofs/proof_9b28a42d72a2',
    network: 'eip155:31611',
    txHash:
      '0x9b28a42d72a25de2261781f031611c05d5e2f627c5abc115f89bb8e103d7a402',
    explorerUrl:
      'https://explorer.test.mezo.org/tx/0x9b28a42d72a25de2261781f031611c05d5e2f627c5abc115f89bb8e103d7a402',
    receiptIds: ['rcpt_agent_demo_prompt', 'rcpt_agent_demo_summary'],
    totalSpendMusd: '0.32',
    createdAt: now
  }
  const actions = [
    {
      id: 'act_launch_demo_1',
      runId: 'run_launch_demo',
      productSlug: 'prompt-enhancer-api',
      productName: 'Prompt Enhancer API',
      providerName: 'Tollora Labs',
      status: 'completed',
      amountMusd: '0.08 MUSD',
      objective: 'Create polished launch copy for the agent demo.',
      requestPayload: {
        prompt: 'Create launch copy for a MUSD-native paid API gateway.',
        audience: 'developers',
        outputStyle: 'concise'
      },
      responsePayload: {
        enhancedPrompt:
          'Turn your API into a paid tool autonomous agents can discover, buy, run, and audit on Mezo.'
      },
      receipt: {
        id: 'rcpt_agent_demo_prompt',
        orderId: 'ord_agent_demo_prompt',
        requestId: 'req_agent_demo_prompt',
        productSlug: 'prompt-enhancer-api',
        productName: 'Prompt Enhancer API',
        providerName: 'Tollora Labs',
        buyerWallet: proof.ownerWallet,
        providerWallet: '0x3161100000000000000000000000000000000002',
        amountMusd: '0.08 MUSD',
        platformFeeMusd: '0.00 MUSD',
        providerAmountMusd: '0.08 MUSD',
        network: 'eip155:31611',
        txHash:
          '0x8b28a42d72a25de2261781f031611c05d5e2f627c5abc115f89bb8e103d7a401',
        explorerUrl:
          'https://explorer.test.mezo.org/tx/0x8b28a42d72a25de2261781f031611c05d5e2f627c5abc115f89bb8e103d7a401',
        createdAt: now,
        agentRunId: 'run_launch_demo',
        proofId: proof.id
      },
      orderId: 'ord_agent_demo_prompt',
      requestId: 'req_agent_demo_prompt',
      startedAt: now,
      completedAt: now
    },
    {
      id: 'act_launch_demo_2',
      runId: 'run_launch_demo',
      productSlug: 'document-summary-api',
      productName: 'Document Summary API',
      providerName: 'Tollora Labs',
      status: 'completed',
      amountMusd: '0.24 MUSD',
      objective: 'Extract the launch brief and action items.',
      requestPayload: {
        documentText:
          'Tollora lets providers sell paid APIs and agents buy them with x402 on Mezo.',
        summaryDepth: 'standard'
      },
      responsePayload: {
        summary:
          'Tollora packages paid API discovery, autonomous x402 spending, and receipt-backed Mezo proofs.'
      },
      receipt: {
        id: 'rcpt_agent_demo_summary',
        orderId: 'ord_agent_demo_summary',
        requestId: 'req_agent_demo_summary',
        productSlug: 'document-summary-api',
        productName: 'Document Summary API',
        providerName: 'Tollora Labs',
        buyerWallet: proof.ownerWallet,
        providerWallet: '0x3161100000000000000000000000000000000002',
        amountMusd: '0.24 MUSD',
        platformFeeMusd: '0.01 MUSD',
        providerAmountMusd: '0.23 MUSD',
        network: 'eip155:31611',
        txHash:
          '0x7b28a42d72a25de2261781f031611c05d5e2f627c5abc115f89bb8e103d7a400',
        explorerUrl:
          'https://explorer.test.mezo.org/tx/0x7b28a42d72a25de2261781f031611c05d5e2f627c5abc115f89bb8e103d7a400',
        createdAt: now,
        agentRunId: 'run_launch_demo',
        proofId: proof.id
      },
      orderId: 'ord_agent_demo_summary',
      requestId: 'req_agent_demo_summary',
      startedAt: now,
      completedAt: now
    }
  ] satisfies AgentRun['actions']

  return {
    id: 'run_launch_demo',
    template: 'launch-pack',
    title: 'Launch Pack Agent',
    objective: 'Create a developer launch pack for a MUSD-native API gateway.',
    sourceText:
      'Tollora lets providers sell paid APIs and agents buy them with x402 on Mezo.',
    ownerWallet: proof.ownerWallet,
    budgetCapMusd: 20,
    maxPaidActions: 3,
    allowedTools: [
      'prompt-enhancer-api',
      'document-summary-api',
      'market-snapshot-api'
    ],
    mode: 'demo',
    status: 'attested',
    summary:
      'The launch-pack agent completed paid prompt, summary, and market-data actions, then published a Mezo proof.',
    deliverables: {
      launchBrief:
        'Tollora packages paid API discovery, autonomous x402 spending, and receipt-backed Mezo proofs for agent workflows.',
      developerCopy:
        'Turn your API into a tool autonomous agents can discover, buy, run, and audit with MUSD settlement.',
      marketSignal: 'MUSD observed at $1 on Mezo with test liquidity available.'
    },
    actions,
    proof,
    createdAt: now,
    updatedAt: now
  } satisfies AgentRun
}
