'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Play,
  ReceiptText,
  Route,
  Sparkles,
  WalletCards
} from 'lucide-react'

import { JsonViewer } from '@/components/data-display/json-viewer'
import { Button, buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  agentActionStatusLabels,
  agentRunStatusDetails,
  agentRunStatusLabels
} from '@/features/agents/status'
import type { AgentRun } from '@/features/agents/types'

type AgentRunClientProps = {
  runId: string
  initialRun: AgentRun | null
}

export function AgentRunClient({ runId, initialRun }: AgentRunClientProps) {
  const [run, setRun] = useState<AgentRun | null>(initialRun)
  const [status, setStatus] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isAttesting, setIsAttesting] = useState(false)

  useEffect(() => {
    if (run) {
      return
    }

    const saved = window.sessionStorage.getItem(`tollora:agent-run:${runId}`)

    if (saved) {
      setRun(JSON.parse(saved) as AgentRun)
    }
  }, [run, runId])

  async function executeRun() {
    setIsRunning(true)
    setStatus('')

    try {
      const response = await fetch(`/api/agents/runs/${runId}/execute`, {
        method: 'POST'
      })
      const body = (await response.json()) as AgentRun & { error?: string }

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to execute the agent run.')
      }

      window.sessionStorage.setItem(
        `tollora:agent-run:${body.id}`,
        JSON.stringify(body)
      )
      body.actions.forEach(action => {
        if (action.receipt) {
          window.sessionStorage.setItem(
            `tollora:receipt:${action.receipt.id}`,
            JSON.stringify(action.receipt)
          )
        }
      })
      setRun(body)
      setStatus('Agent run completed paid actions and prepared deliverables.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to execute the agent run.'
      )
    } finally {
      setIsRunning(false)
    }
  }

  async function attestRun() {
    setIsAttesting(true)
    setStatus('')

    try {
      const response = await fetch(`/api/agents/runs/${runId}/attest`, {
        method: 'POST'
      })
      const body = (await response.json()) as AgentRun & { error?: string }

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to attest the agent run.')
      }

      window.sessionStorage.setItem(
        `tollora:agent-run:${body.id}`,
        JSON.stringify(body)
      )
      setRun(body)
      setStatus('Proof hash attested on Mezo and ready for public audit.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to attest the agent run.'
      )
    } finally {
      setIsAttesting(false)
    }
  }

  if (!run) {
    return (
      <Card>
        <p className='font-semibold'>Agent run not found</p>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          The run is not available in this browser session.
        </p>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-3 md:grid-cols-4'>
        {[
          [statusIcon(run.status), 'Status', agentRunStatusLabels[run.status]],
          [WalletCards, 'Budget', `${run.budgetCapMusd.toFixed(2)} MUSD`],
          [ReceiptText, 'Actions', run.actions.length.toString()],
          [Sparkles, 'Planner', formatPlanner(run)]
        ].map(([Icon, label, value]) => (
          <div
            key={String(label)}
            className='border-foreground/10 bg-card/80 rounded-lg border p-4'
          >
            <Icon className='text-primary h-4 w-4' aria-hidden />
            <p className='text-foreground/60 mt-3 text-xs tracking-[0.14em] uppercase'>
              {String(label)}
            </p>
            <p className='mt-1 truncate font-semibold'>{String(value)}</p>
          </div>
        ))}
      </div>

      <section className='grid gap-5 xl:grid-cols-[1fr_340px]'>
        <Card className='space-y-4'>
          <div className='flex items-start gap-3'>
            <div className='bg-primary/10 text-primary rounded-lg p-2'>
              <Bot className='h-5 w-5' aria-hidden />
            </div>
            <div>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                Objective
              </p>
              <p className='mt-1 text-lg leading-7 font-semibold'>
                {run.objective}
              </p>
            </div>
          </div>
          <div className='border-foreground/10 bg-muted/30 rounded-lg border p-4'>
            <p className='font-semibold'>{agentRunStatusLabels[run.status]}</p>
            <p className='text-foreground/65 mt-1 text-sm leading-6'>
              {agentRunStatusDetails[run.status]}
            </p>
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='border-foreground/10 rounded-lg border p-4'>
              <p className='text-foreground/60 text-xs tracking-[0.14em] uppercase'>
                Planner
              </p>
              <p className='mt-1 font-semibold'>{formatPlanner(run)}</p>
            </div>
            <div className='border-foreground/10 rounded-lg border p-4'>
              <p className='text-foreground/60 text-xs tracking-[0.14em] uppercase'>
                Signer mode
              </p>
              <p className='mt-1 font-semibold'>{run.mode}</p>
            </div>
          </div>
          {run.deliverables.budgetStrategy ? (
            <details className='border-foreground/10 rounded-lg border p-4'>
              <summary className='cursor-pointer font-semibold'>
                Budget strategy
              </summary>
              <p className='text-foreground/65 mt-3 text-sm leading-6'>
                {run.deliverables.budgetStrategy}
              </p>
            </details>
          ) : null}
        </Card>

        <Card className='space-y-4 xl:sticky xl:top-28 xl:self-start'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Controls
            </p>
            <p className='mt-1 text-lg font-semibold'>Run lifecycle</p>
          </div>
          <Button
            className='w-full'
            onClick={executeRun}
            disabled={isRunning || !['planned', 'failed'].includes(run.status)}
          >
            <Play className='h-4 w-4' aria-hidden />
            {isRunning ? 'Running' : 'Run actions'}
          </Button>
          <Button
            className='w-full'
            variant='outline'
            onClick={attestRun}
            disabled={
              isAttesting || !['completed', 'attesting'].includes(run.status)
            }
          >
            <FileCheck2 className='h-4 w-4' aria-hidden />
            {isAttesting ? 'Writing proof' : 'Attest'}
          </Button>
          {run.proof ? (
            <Link
              href={`/proofs/${run.proof.id}`}
              className={buttonClasses({
                variant: 'primary',
                size: 'md',
                className: 'w-full'
              })}
            >
              <ExternalLink className='h-4 w-4' aria-hidden />
              Proof
            </Link>
          ) : null}
          {status ? (
            <p
              className='border-foreground/10 bg-muted/30 rounded-lg border p-3 text-sm leading-6'
              role='status'
            >
              {status}
            </p>
          ) : null}
        </Card>
      </section>

      {hasDeliverableSummary(run) ? (
        <section className='grid gap-4 lg:grid-cols-3'>
          <DeliverableCard
            title='Launch brief'
            value={run.deliverables.launchBrief}
          />
          <DeliverableCard
            title='Developer copy'
            value={run.deliverables.developerCopy}
          />
          <DeliverableCard
            title='Market signal'
            value={run.deliverables.marketSignal}
          />
        </section>
      ) : null}

      <section className='grid gap-4'>
        {run.deliverables.skippedTools?.length ? (
          <Card className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Route className='text-primary h-4 w-4' aria-hidden />
              <p className='font-semibold'>Skipped tools</p>
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              {run.deliverables.skippedTools.map(tool => (
                <div
                  key={tool.slug}
                  className='border-foreground/10 rounded-lg border p-3 text-sm'
                >
                  <p className='font-semibold'>
                    {tool.productName ?? tool.slug}
                  </p>
                  <p className='text-foreground/65 mt-1 leading-6'>
                    {tool.reason}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
        {run.actions.map(action => (
          <Card key={action.id} className='space-y-4'>
            <div className='grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-semibold'>{action.productName}</span>
                  <span className='bg-muted rounded-md px-2 py-1 text-xs font-semibold'>
                    {agentActionStatusLabels[action.status]}
                  </span>
                </div>
                <p className='text-foreground/60 mt-1 text-sm'>
                  {action.providerName} - {action.amountMusd}
                </p>
              </div>
              <div className='text-primary text-sm font-semibold'>
                {action.receipt ? 'Receipt saved' : action.status}
              </div>
            </div>
            {action.planningRationale ? (
              <details className='border-foreground/10 bg-muted/30 rounded-lg border p-3 text-sm'>
                <summary className='cursor-pointer font-semibold'>
                  Planner rationale
                </summary>
                <p className='text-foreground/65 mt-2 leading-6'>
                  {action.planningRationale}
                </p>
              </details>
            ) : null}
            {action.receipt ? (
              <div className='grid gap-3 text-sm md:grid-cols-3'>
                <Link
                  href={`/receipts/${action.receipt.id}`}
                  className='border-foreground/10 rounded-lg border p-3 font-semibold underline-offset-4 hover:underline'
                >
                  {action.receipt.id}
                </Link>
                <span className='border-foreground/10 rounded-lg border p-3'>
                  {action.receipt.network}
                </span>
                {action.receipt.explorerUrl ? (
                  <a
                    href={action.receipt.explorerUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='border-foreground/10 rounded-lg border p-3 font-semibold underline-offset-4 hover:underline'
                  >
                    View settlement
                  </a>
                ) : null}
              </div>
            ) : null}
          </Card>
        ))}
      </section>
      <Card className='space-y-4'>
        <JsonViewer
          title='Deliverables'
          value={run.deliverables}
          defaultOpen={false}
          copyLabel='Copy deliverables'
        />
      </Card>
    </div>
  )
}

function formatPlanner(run: AgentRun) {
  const mode = run.deliverables.plannerMode

  if (mode === 'openai') {
    return `OpenAI ${run.deliverables.plannerModel ?? 'model'}`
  }

  if (mode === 'deterministic') {
    return 'Deterministic fallback'
  }

  return 'Pending'
}

function statusIcon(status: AgentRun['status']) {
  if (['completed', 'attested'].includes(status)) {
    return CheckCircle2
  }

  if (['failed'].includes(status)) {
    return AlertTriangle
  }

  if (['running', 'attesting'].includes(status)) {
    return Clock
  }

  return Bot
}

function hasDeliverableSummary(run: AgentRun) {
  return Boolean(
    run.deliverables.launchBrief ||
      run.deliverables.developerCopy ||
      run.deliverables.marketSignal
  )
}

function DeliverableCard({ title, value }: { title: string; value?: string }) {
  if (!value) {
    return null
  }

  return (
    <Card className='space-y-2'>
      <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {title}
      </p>
      <p className='text-sm leading-6'>{value}</p>
    </Card>
  )
}
