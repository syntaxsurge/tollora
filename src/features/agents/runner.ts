import { x402Client } from '@x402/core/client'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { wrapFetchWithPayment } from '@x402/fetch'
import { privateKeyToAccount } from 'viem/accounts'

import type {
  AgentAction,
  AgentRun,
  AgentToolSlug
} from '@/features/agents/types'
import type { MarketplaceReceipt } from '@/features/marketplace/receipts'
import { getProductBySlug } from '@/features/marketplace/products'
import { envClient } from '@/lib/env/env.client'
import { envServer } from '@/lib/env/env.server'

const launchPackToolOrder: AgentToolSlug[] = [
  'prompt-enhancer-api',
  'document-summary-api',
  'market-snapshot-api',
  'cliplore-ai-video-generator'
]

export function buildAgentPlan(run: AgentRun): AgentAction[] {
  const now = new Date().toISOString()
  const selectedTools = launchPackToolOrder
    .filter(tool => run.allowedTools.includes(tool))
    .slice(0, run.maxPaidActions)

  return selectedTools.map((tool, index) => {
    const product = getProductBySlug(tool)

    if (!product) {
      throw new Error(`Unknown agent tool: ${tool}`)
    }

    return {
      id: `act_${run.id.slice(4)}_${index + 1}`,
      runId: run.id,
      productSlug: tool,
      productName: product.name,
      providerName: product.providerName,
      status: 'planned',
      amountMusd: product.priceLabel,
      objective: getActionObjective(tool, run.objective),
      requestPayload: buildPayloadForTool(tool, run),
      startedAt: now
    }
  })
}

export async function executeAgentRunActions(run: AgentRun) {
  const actions = run.actions.length > 0 ? run.actions : buildAgentPlan(run)
  const completedActions: AgentAction[] = []

  for (const action of actions) {
    const result = await executeAgentAction(run, action)
    completedActions.push(result)
  }

  const deliverables = buildDeliverables(run, completedActions)
  const completed = completedActions.every(
    action => action.status === 'completed'
  )
  const receiptCount = completedActions.filter(action => action.receipt).length

  return {
    actions: completedActions,
    deliverables,
    summary: completed
      ? receiptCount > 0
        ? `The launch-pack agent completed ${completedActions.length} actions, captured ${receiptCount} MUSD receipt records, and prepared an auditable Mezo proof package.`
        : `The launch-pack agent completed ${completedActions.length} local tool actions and prepared an auditable Mezo proof package.`
      : 'The launch-pack agent stopped before completing every selected paid action.',
    status: completed ? 'completed' : 'failed'
  } as const
}

async function executeAgentAction(run: AgentRun, action: AgentAction) {
  const product = getProductBySlug(action.productSlug)

  if (!product) {
    return {
      ...action,
      status: 'failed',
      errorMessage: 'API product was not found.',
      completedAt: new Date().toISOString()
    } satisfies AgentAction
  }

  const started = {
    ...action,
    status: 'quoted',
    startedAt: action.startedAt ?? new Date().toISOString()
  } satisfies AgentAction

  if (envServer.AGENT_SPENDER_PRIVATE_KEY && envClient.NEXT_PUBLIC_APP_URL) {
    try {
      const paidResult = await callPaidProductWithAgentWallet(started)

      return {
        ...started,
        status: 'completed',
        responsePayload: paidResult.data,
        receipt: paidResult.receipt,
        orderId: paidResult.order?.id,
        requestId: paidResult.order?.requestId,
        completedAt: new Date().toISOString()
      } satisfies AgentAction
    } catch (caughtError) {
      return {
        ...started,
        status: run.mode === 'production' ? 'failed' : 'completed',
        responsePayload:
          run.mode === 'production'
            ? undefined
            : buildLocalResponse(started, run.objective),
        errorMessage:
          caughtError instanceof Error
            ? caughtError.message
            : 'The paid x402 request failed.',
        completedAt: new Date().toISOString()
      } satisfies AgentAction
    }
  }

  return {
    ...started,
    status: 'completed',
    responsePayload: buildLocalResponse(started, run.objective),
    completedAt: new Date().toISOString()
  } satisfies AgentAction
}

async function callPaidProductWithAgentWallet(action: AgentAction) {
  const account = privateKeyToAccount(
    envServer.AGENT_SPENDER_PRIVATE_KEY as `0x${string}`
  )
  const client = registerExactEvmScheme(new x402Client(), { signer: account })
  const paidFetch = wrapFetchWithPayment(fetch, client)
  const response = await paidFetch(
    `${envClient.NEXT_PUBLIC_APP_URL}/api/x402/products/${action.productSlug}/call`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(action.requestPayload)
    }
  )
  const body = await response.json()

  if (!response.ok) {
    throw new Error(body.error ?? 'Paid product call failed.')
  }

  return body as {
    order?: { id?: string; requestId?: string }
    receipt: MarketplaceReceipt
    data: Record<string, unknown>
  }
}

function getActionObjective(tool: AgentToolSlug, objective: string) {
  const objectives: Record<AgentToolSlug, string> = {
    'prompt-enhancer-api': 'Create polished launch copy for the user goal.',
    'document-summary-api': 'Extract a launch brief and concrete action items.',
    'market-snapshot-api': 'Collect a Mezo market signal for positioning.',
    'cliplore-ai-video-generator':
      'Generate a short product-launch video asset.'
  }

  return `${objectives[tool]} Goal: ${objective}`
}

function buildPayloadForTool(tool: AgentToolSlug, run: AgentRun) {
  const source = run.sourceText?.trim() || run.objective

  if (tool === 'prompt-enhancer-api') {
    return {
      prompt: `Write launch copy for: ${run.objective}`,
      audience: 'developers and API buyers',
      outputStyle: 'concise'
    }
  }

  if (tool === 'document-summary-api') {
    return {
      documentText: source,
      summaryDepth: 'standard'
    }
  }

  if (tool === 'market-snapshot-api') {
    return {
      symbol: 'MUSD',
      venue: 'Mezo'
    }
  }

  return {
    prompt: `Create a vertical launch teaser for: ${run.objective}`,
    format: 'vertical',
    duration: '30s',
    sourcePreferences: ['clean motion graphics', 'developer audience']
  }
}

function buildLocalResponse(action: AgentAction, objective: string) {
  if (action.productSlug === 'prompt-enhancer-api') {
    return {
      enhancedPrompt: `Launch ${objective} as a MUSD-paid API workflow with clear buyer value, proof-backed settlement, and developer-first onboarding.`,
      rationale:
        'The copy focuses on the payable action, the autonomous agent buyer, and the Mezo settlement proof.',
      requestId: `req_agent_${action.id.slice(-8)}`
    }
  }

  if (action.productSlug === 'document-summary-api') {
    return {
      summary:
        'The agent should position the product as a paid API workflow that can be discovered, purchased, executed, and audited without manual billing operations.',
      actionItems: [
        'Publish the agent-ready marketplace listing',
        'Run the launch-pack agent against the listing',
        'Share the public Mezo proof page with buyers'
      ],
      requestId: `req_agent_${action.id.slice(-8)}`
    }
  }

  if (action.productSlug === 'market-snapshot-api') {
    return {
      symbol: 'MUSD',
      venue: 'Mezo',
      priceUsd: 1,
      liquidityUsd: 1250000,
      observedAt: new Date().toISOString(),
      requestId: `req_agent_${action.id.slice(-8)}`
    }
  }

  return {
    status: 'processing',
    externalJobId: `clip_agent_${action.id.slice(-8)}`,
    resultUrl: 'https://cliplore.ai',
    requestId: `req_agent_${action.id.slice(-8)}`
  }
}

function buildDeliverables(run: AgentRun, actions: AgentAction[]) {
  const promptAction = actions.find(
    action => action.productSlug === 'prompt-enhancer-api'
  )
  const summaryAction = actions.find(
    action => action.productSlug === 'document-summary-api'
  )
  const marketAction = actions.find(
    action => action.productSlug === 'market-snapshot-api'
  )
  const videoAction = actions.find(
    action => action.productSlug === 'cliplore-ai-video-generator'
  )

  return {
    launchBrief:
      String(summaryAction?.responsePayload?.summary ?? '') ||
      `Launch ${run.objective} as an autonomous, receipt-backed Tollora workflow.`,
    developerCopy:
      String(promptAction?.responsePayload?.enhancedPrompt ?? '') ||
      `Use Tollora to make ${run.objective} purchasable by AI agents with MUSD.`,
    marketSignal: marketAction?.responsePayload
      ? `MUSD observed at $${marketAction.responsePayload.priceUsd} on ${marketAction.responsePayload.venue}.`
      : undefined,
    videoResultUrl: String(videoAction?.responsePayload?.resultUrl ?? '')
  }
}
