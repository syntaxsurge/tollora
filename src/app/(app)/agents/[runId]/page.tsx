import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { AgentRunClient } from '@/features/agents/agent-run-client'
import { getAgentRun } from '@/features/agents/store'

type AgentRunPageProps = {
  params: Promise<{
    runId: string
  }>
}

export default async function AgentRunPage({ params }: AgentRunPageProps) {
  const { runId } = await params
  const run = getAgentRun(runId) ?? null

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Agent run</Badge>
        <div className='mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end'>
          <div className='space-y-3'>
            <h1 className='font-display text-4xl'>
              {run?.title ?? 'Agent run'}
            </h1>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              Watch the agent plan, execute paid API calls, collect MUSD
              receipts, produce deliverables, and publish a Mezo proof.
            </p>
          </div>
          <Link
            href='/agents'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Back to agents
          </Link>
        </div>
      </section>
      <AgentRunClient runId={runId} initialRun={run} />
    </div>
  )
}
