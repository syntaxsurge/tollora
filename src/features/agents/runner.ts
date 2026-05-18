import { x402Client } from '@x402/core/client'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { wrapFetchWithPayment } from '@x402/fetch'
import { privateKeyToAccount } from 'viem/accounts'

import type {
  AgentAction,
  AgentRun,
  AgentToolSlug
} from '@/features/agents/types'
import { resolveProductPrice } from '@/features/marketplace/pricing'
import { getProductBySlug } from '@/features/marketplace/products'
import type { MarketplaceReceipt } from '@/features/marketplace/receipts'
import { envClient } from '@/lib/env/env.client'
import { envServer } from '@/lib/env/env.server'

export function buildAgentPlan(run: AgentRun): AgentAction[] {
  const now = new Date().toISOString()
  const selectedTools = run.allowedTools.slice(0, run.maxPaidActions)

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
      objective: `Use ${product.name} to advance the goal: ${run.objective}`,
      requestPayload: buildPayloadForTool(tool, run),
      startedAt: now
    }
  })
}

export async function executeAgentRunActions(run: AgentRun) {
  const actions = run.actions.length > 0 ? run.actions : buildAgentPlan(run)
  const completedActions: AgentAction[] = []
  let spendUsd = 0

  for (const action of actions) {
    const result = await executeAgentAction(run, action, spendUsd)

    if (result.receipt) {
      spendUsd = Number(
        (spendUsd + parseMusdLabel(result.receipt.amountMusd)).toFixed(6)
      )
    }

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

async function executeAgentAction(
  run: AgentRun,
  action: AgentAction,
  currentSpendUsd: number
) {
  const product = getProductBySlug(action.productSlug)

  if (!product) {
    return {
      ...action,
      status: 'failed',
      errorMessage: 'API product was not found.',
      completedAt: new Date().toISOString()
    } satisfies AgentAction
  }

  const requestPayload = action.requestPayload
  const quotedPrice = await resolveProductPrice({
    product,
    requestPayload
  }).catch(error => ({
    error:
      error instanceof Error
        ? error.message
        : 'The agent could not quote this paid tool.'
  }))

  if ('error' in quotedPrice) {
    return {
      ...action,
      status: 'failed',
      errorMessage: quotedPrice.error,
      completedAt: new Date().toISOString()
    } satisfies AgentAction
  }

  if (currentSpendUsd + quotedPrice.amountUsd > run.budgetCapMusd) {
    return {
      ...action,
      status: 'skipped',
      amountMusd: quotedPrice.amountLabel,
      errorMessage:
        'Skipped because the quoted MUSD price would exceed the agent budget.',
      completedAt: new Date().toISOString()
    } satisfies AgentAction
  }

  const started = {
    ...action,
    status: 'quoted',
    amountMusd: quotedPrice.amountLabel,
    requestPayload,
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

function parseMusdLabel(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ''))

  return Number.isFinite(amount) ? amount : 0
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

function buildPayloadForTool(tool: AgentToolSlug, run: AgentRun) {
  const product = getProductBySlug(tool)
  const source = run.sourceText?.trim() || run.objective

  return enrichReferencePayload(product?.referencePayload ?? {}, {
    objective: run.objective,
    source
  })
}

function buildLocalResponse(action: AgentAction, objective: string) {
  return {
    status: 'completed',
    productSlug: action.productSlug,
    summary: `Local mode prepared a request for ${action.productName} to support: ${objective}`,
    requestPayload: action.requestPayload,
    requestId: `req_agent_${action.id.slice(-8)}`
  }
}

function buildDeliverables(run: AgentRun, actions: AgentAction[]) {
  const completedActions = actions.filter(
    action => action.status === 'completed'
  )
  const asyncAction = completedActions.find(
    action =>
      Boolean(action.responsePayload?.resultUrl) ||
      Boolean(action.responsePayload?.externalJobId)
  )

  return {
    launchBrief: `The agent used ${completedActions.length} selected marketplace APIs for: ${run.objective}`,
    developerCopy: completedActions
      .map(action => `${action.productName}: ${action.status}`)
      .join('\n'),
    marketSignal:
      completedActions.length > 0
        ? `${completedActions.length} paid tool result(s) are attached to this run.`
        : undefined,
    videoResultUrl: String(asyncAction?.responsePayload?.resultUrl ?? '')
  }
}

function enrichReferencePayload(
  payload: Record<string, unknown>,
  context: { objective: string; source: string }
) {
  const nextPayload = { ...payload }

  for (const key of Object.keys(nextPayload)) {
    const normalized = key.toLowerCase()

    if (
      normalized.includes('prompt') ||
      normalized.includes('objective') ||
      normalized.includes('topic')
    ) {
      nextPayload[key] = context.objective
    }

    if (
      normalized.includes('document') ||
      normalized.includes('source') ||
      normalized.includes('text')
    ) {
      nextPayload[key] = context.source
    }
  }

  if (Object.keys(nextPayload).length === 0) {
    return {
      objective: context.objective,
      sourceText: context.source
    }
  }

  return nextPayload
}
