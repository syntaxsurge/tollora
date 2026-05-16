'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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
      <div className='grid gap-4 md:grid-cols-4'>
        {[
          ['Status', agentRunStatusLabels[run.status]],
          ['Budget', `${run.budgetCapMusd.toFixed(2)} MUSD`],
          ['Paid actions', run.actions.length.toString()],
          ['Mode', run.mode]
        ].map(([label, value]) => (
          <div key={label} className='bg-muted rounded-lg p-4'>
            <p className='text-foreground/60 text-xs uppercase'>{label}</p>
            <p className='mt-1 font-semibold'>{value}</p>
          </div>
        ))}
      </div>
      <Card>
        <p className='font-semibold'>{agentRunStatusLabels[run.status]}</p>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          {agentRunStatusDetails[run.status]}
        </p>
      </Card>
      <section className='grid gap-5 xl:grid-cols-[1fr_0.8fr]'>
        <Card className='space-y-4'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Objective
            </p>
            <p className='mt-2 text-sm leading-6'>{run.objective}</p>
          </div>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Agent summary
            </p>
            <p className='mt-2 text-sm leading-6'>{run.summary}</p>
          </div>
        </Card>
        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Controls
          </p>
          <Button
            onClick={executeRun}
            disabled={isRunning || !['planned', 'failed'].includes(run.status)}
          >
            {isRunning ? 'Running agent' : 'Run paid actions'}
          </Button>
          <Button
            variant='outline'
            onClick={attestRun}
            disabled={isAttesting || !['completed', 'attesting'].includes(run.status)}
          >
            {isAttesting ? 'Writing proof' : 'Attest proof on Mezo'}
          </Button>
          {run.proof ? (
            <Link
              href={`/proofs/${run.proof.id}`}
              className={buttonClasses({ variant: 'primary', size: 'sm' })}
            >
              Open public proof
            </Link>
          ) : null}
          {status ? (
            <p className='text-foreground/65 text-sm' role='status'>
              {status}
            </p>
          ) : null}
        </Card>
      </section>
      <section className='grid gap-4'>
        {run.actions.map(action => (
          <Card key={action.id} className='space-y-3'>
            <div className='flex flex-col justify-between gap-2 sm:flex-row sm:items-start'>
              <div>
                <p className='font-semibold'>{action.productName}</p>
                <p className='text-foreground/60 mt-1 text-sm'>
                  {action.providerName} - {action.amountMusd}
                </p>
              </div>
              <span className='text-sm font-semibold'>
                {agentActionStatusLabels[action.status]}
              </span>
            </div>
            <p className='text-foreground/70 text-sm leading-6'>
              {action.objective}
            </p>
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
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Deliverables
        </p>
        <pre className='bg-muted overflow-auto rounded-lg p-4 text-xs leading-6'>
          {JSON.stringify(run.deliverables, null, 2)}
        </pre>
      </Card>
    </div>
  )
}
