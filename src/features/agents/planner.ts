import type { AgentAction, AgentRun } from '@/features/agents/types'
import type { ApiProduct } from '@/features/marketplace/products'
import { getProductBySlug } from '@/features/marketplace/products'

export const AGENT_PLANNER_PROMPT = [
  'You are Tollora Launch Pack Agent.',
  'Goal: choose the smallest useful set of paid API tools that can complete the user objective inside the MUSD budget.',
  'Rules:',
  '1. Prefer real data/research tools before expensive media tools.',
  '2. Use async media generation only when the objective asks for launch assets, video, creative collateral, or a demo deliverable.',
  '3. Skip tools that are unrelated to the objective even if they are allowed.',
  '4. Never exceed the max paid action count.',
  '5. Every chosen tool must produce an auditable paid action and receipt when production signing is configured.'
].join('\n')

type PlannedTool = {
  product: ApiProduct
  score: number
  rationale: string
}

const categoryWeights: Partial<Record<ApiProduct['category'], number>> = {
  data: 14,
  developer: 13,
  ai: 11,
  media: 9,
  agent: 8,
  commerce: 6
}

const objectiveSignals = {
  media: [
    'video',
    'launch pack',
    'asset',
    'clip',
    'storyboard',
    'project',
    'render',
    'creative'
  ],
  market: [
    'market',
    'trend',
    'competitor',
    'launch',
    'audience',
    'research',
    'positioning',
    'signal'
  ],
  developer: [
    'api',
    'developer',
    'sdk',
    'github',
    'repo',
    'code',
    'integration',
    'technical'
  ],
  proof: ['proof', 'receipt', 'audit', 'attestation', 'settle', 'payment']
}

export function buildAgentPlan(run: AgentRun): AgentAction[] {
  const now = new Date().toISOString()
  const plannedTools = rankAllowedTools(run).slice(0, run.maxPaidActions)

  return plannedTools.map(({ product, score, rationale }, index) => ({
    id: `act_${run.id.slice(4)}_${index + 1}`,
    runId: run.id,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    status: 'planned',
    amountMusd: product.priceLabel,
    objective: `Planner chose ${product.name}: ${rationale}`,
    planningRationale: rationale,
    plannerScore: score,
    requestPayload: buildPayloadForTool(product.slug, run),
    startedAt: now
  }))
}

export function buildPlannerSummary(run: AgentRun, actions: AgentAction[]) {
  const chosen = actions
    .map(action => {
      const score =
        typeof action.plannerScore === 'number'
          ? `score ${action.plannerScore}`
          : 'selected'

      return `${action.productName} (${score}): ${
        action.planningRationale ?? 'matched the objective'
      }`
    })
    .join('\n')

  return {
    planningPrompt: AGENT_PLANNER_PROMPT,
    toolSelectionRationale:
      chosen ||
      'No paid tools were selected because the allowed tool set did not match the objective.',
    budgetInstruction: `Spend no more than ${run.budgetCapMusd.toFixed(2)} MUSD across at most ${run.maxPaidActions} paid action(s).`
  }
}

function rankAllowedTools(run: AgentRun): PlannedTool[] {
  const objective = normalizeText(`${run.objective} ${run.sourceText ?? ''}`)

  return run.allowedTools
    .map(tool => {
      const product = getProductBySlug(tool)

      if (!product) {
        return null
      }

      const productText = normalizeText(
        `${product.name} ${product.description} ${product.category} ${product.providerName}`
      )
      const categoryScore = categoryWeights[product.category] ?? 5
      const keywordScore = scoreKeywordOverlap(objective, productText)
      const signalScore = scoreSignals(objective, product)
      const costPenalty = Math.min(product.priceUsd * 3, 8)
      const score = Number(
        Math.max(0, categoryScore + keywordScore + signalScore - costPenalty)
          .toFixed(2)
      )

      return {
        product,
        score,
        rationale: buildRationale({ objective, product, score })
      }
    })
    .filter((tool): tool is PlannedTool => Boolean(tool))
    .filter(tool => tool.score > 0)
    .sort((a, b) => b.score - a.score || a.product.priceUsd - b.product.priceUsd)
}

function scoreKeywordOverlap(objective: string, productText: string) {
  return tokenize(objective).reduce(
    (score, token) => score + (productText.includes(token) ? 2 : 0),
    0
  )
}

function scoreSignals(objective: string, product: ApiProduct) {
  let score = 0

  if (hasSignal(objective, objectiveSignals.media)) {
    score += product.category === 'media' || product.resultDelivery !== 'direct_response' ? 14 : 0
  }

  if (hasSignal(objective, objectiveSignals.market)) {
    score += product.category === 'data' ? 10 : 0
  }

  if (hasSignal(objective, objectiveSignals.developer)) {
    score += product.category === 'developer' ? 10 : 0
  }

  if (hasSignal(objective, objectiveSignals.proof)) {
    score += product.isX402Protected ? 4 : 0
  }

  return score
}

function buildRationale({
  objective,
  product,
  score
}: {
  objective: string
  product: ApiProduct
  score: number
}) {
  const reasons = []

  if (product.category === 'data') {
    reasons.push('it gives the agent external market context')
  }

  if (product.category === 'developer') {
    reasons.push('it validates developer and repository signals')
  }

  if (product.category === 'media') {
    reasons.push('it can produce the final creative deliverable')
  }

  if (hasSignal(objective, objectiveSignals.media) && product.category === 'media') {
    reasons.push('the objective asks for launch assets or video output')
  }

  if (product.priceUsd <= 0.06) {
    reasons.push('it is cheap enough to run before larger paid actions')
  }

  return `${reasons.join(', ') || 'it matches the objective'}; planner score ${score}.`
}

export function buildPayloadForTool(tool: string, run: AgentRun) {
  const product = getProductBySlug(tool)
  const source = run.sourceText?.trim() || run.objective
  const query = deriveSearchQuery(`${run.objective} ${source}`)

  if (tool === 'public-wikipedia-context') {
    return {
      action: 'query',
      list: 'search',
      format: 'json',
      srsearch: query,
      srlimit: 5,
      origin: '*'
    }
  }

  if (tool === 'public-hn-trend-scan') {
    return {
      query,
      tags: 'story',
      hitsPerPage: 5
    }
  }

  if (tool === 'public-github-repo-search') {
    return {
      q: `${query} in:name,description,readme`,
      sort: 'stars',
      order: 'desc',
      per_page: 5
    }
  }

  return enrichReferencePayload(product?.referencePayload ?? {}, {
    objective: run.objective,
    source,
    query
  })
}

function enrichReferencePayload(
  payload: Record<string, unknown>,
  context: { objective: string; source: string; query: string }
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
      normalized === 'q' ||
      normalized.includes('query') ||
      normalized.includes('search')
    ) {
      nextPayload[key] = context.query
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

function deriveSearchQuery(input: string) {
  const tokens = tokenize(normalizeText(input)).slice(0, 8)

  return tokens.length > 0 ? tokens.join(' ') : 'AI API marketplace'
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
}

function tokenize(value: string) {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'that',
    'this',
    'from',
    'into',
    'where',
    'can',
    'create',
    'make',
    'build',
    'launch',
    'pack'
  ])

  return value
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !stopWords.has(token))
}

function hasSignal(objective: string, signals: string[]) {
  return signals.some(signal => objective.includes(signal))
}
