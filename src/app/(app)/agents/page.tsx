import Link from 'next/link'

import { Bot, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { agentRunStatusLabels } from '@/features/agents/status'
import { getAgentMetrics, listAgentRuns } from '@/features/agents/store'

export default function AgentsPage() {
  const runs = listAgentRuns()
  const metrics = getAgentMetrics()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <div className='grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end'>
          <div className='space-y-4'>
            <Badge>Autonomous agents</Badge>
            <h1 className='font-display text-4xl'>
              Agents that buy APIs and prove work.
            </h1>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              Run paid workflows, collect receipts, and publish proof.
            </p>
            <Link
              href='/agents/new'
              className={buttonClasses({ variant: 'primary', size: 'sm' })}
            >
              <Plus className='h-4 w-4' aria-hidden />
              New run
            </Link>
          </div>
          <Card className='bg-background/85 space-y-4'>
            {[
              ['Runs', metrics.totalRuns.toString()],
              ['Completed', metrics.completedRuns.toString()],
              ['Proofs', metrics.proofCount.toString()],
              ['Spend', `${metrics.totalSpendMusd} MUSD`]
            ].map(([label, value]) => (
              <div key={label}>
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  {label}
                </p>
                <p className='mt-1 text-xl font-semibold'>{value}</p>
              </div>
            ))}
          </Card>
        </div>
      </section>

      <section className='grid gap-5 xl:grid-cols-[0.8fr_1.2fr]'>
        <Card className='space-y-4'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Template
            </p>
            <h2 className='font-display mt-2 text-2xl'>Launch Pack Agent</h2>
          </div>
          <p className='text-foreground/70 text-sm leading-6'>
            Start from a lean workflow that selects tools, spends within budget,
            and returns a proof package.
          </p>
          <Link
            href='/agents/new'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            <Bot className='h-4 w-4' aria-hidden />
            Configure
          </Link>
        </Card>
        <Card className='space-y-5'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Recent runs
            </p>
            <h2 className='font-display mt-2 text-2xl'>Agent activity</h2>
          </div>
          <div className='grid gap-3'>
            {runs.map(run => (
              <Link
                key={run.id}
                href={`/agents/${run.id}`}
                className='border-foreground/10 hover:border-foreground/25 rounded-lg border p-4 transition'
              >
                <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
                  <div>
                    <span className='block font-semibold'>{run.title}</span>
                    <span className='text-foreground/60 mt-1 block text-sm leading-6'>
                      {run.objective}
                    </span>
                  </div>
                  <span className='text-sm font-semibold'>
                    {agentRunStatusLabels[run.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
