import Link from 'next/link'

import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Plus,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AgentRunList } from '@/features/agents/agent-run-list'
import { getAgentMetrics, listAgentRuns } from '@/features/agents/store'

export default function AgentsPage() {
  const runs = listAgentRuns()
  const metrics = getAgentMetrics()

  return (
    <div className='space-y-6'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-5 sm:p-6'>
        <div className='grid gap-6 xl:grid-cols-[1fr_420px] xl:items-center'>
          <div className='max-w-3xl space-y-5'>
            <Badge className='w-fit'>
              <Sparkles className='h-3.5 w-3.5' aria-hidden />
              OpenAI agent runs
            </Badge>
            <div className='space-y-3'>
              <h1 className='font-display text-3xl text-balance sm:text-4xl'>
                Plan, pay, execute, prove.
              </h1>
              <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
                The agent chooses tools, spends MUSD through x402, captures
                receipts, and prepares a public Mezo proof.
              </p>
            </div>
            <Link
              href='/agents/new'
              className={buttonClasses({ variant: 'primary', size: 'md' })}
            >
              <Plus className='h-4 w-4' aria-hidden />
              Create run
            </Link>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <MetricTile
              icon={Activity}
              label='Runs'
              value={metrics.totalRuns.toString()}
            />
            <MetricTile
              icon={CheckCircle2}
              label='Completed'
              value={metrics.completedRuns.toString()}
            />
            <MetricTile
              icon={FileCheck2}
              label='Proofs'
              value={metrics.proofCount.toString()}
            />
            <MetricTile
              icon={CircleDollarSign}
              label='Spend'
              value={`${metrics.totalSpendMusd} MUSD`}
            />
          </div>
        </div>
      </section>

      <section className='grid gap-5 xl:grid-cols-[380px_1fr]'>
        <Card className='space-y-5'>
          <div className='flex items-start gap-3'>
            <div className='bg-primary/10 text-primary rounded-lg p-2'>
              <Bot className='h-5 w-5' aria-hidden />
            </div>
            <div>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                Template
              </p>
              <h2 className='font-display mt-1 text-2xl'>Launch Pack Agent</h2>
            </div>
          </div>
          <div className='grid gap-3'>
            {[
              ['OpenAI plans', 'Selects only useful tools'],
              ['x402 pays', 'Settles each paid action'],
              ['Mezo proves', 'Publishes auditable proof']
            ].map(([title, detail]) => (
              <div
                key={title}
                className='border-foreground/10 bg-muted/30 rounded-lg border p-3'
              >
                <p className='text-sm font-semibold'>{title}</p>
                <p className='text-foreground/60 mt-1 text-sm'>{detail}</p>
              </div>
            ))}
          </div>
          <Link
            href='/agents/new'
            className={buttonClasses({
              variant: 'outline',
              size: 'md',
              className: 'w-full'
            })}
          >
            Configure
          </Link>
        </Card>
        <Card className='space-y-4'>
          <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
            <div>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                Recent runs
              </p>
              <h2 className='font-display mt-1 text-2xl'>Activity</h2>
            </div>
            <Badge>
              <ShieldCheck className='h-3.5 w-3.5' aria-hidden />
              Proof-ready
            </Badge>
          </div>
          <AgentRunList runs={runs} />
        </Card>
      </section>
    </div>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Activity
  label: string
  value: string
}) {
  return (
    <div className='border-foreground/10 bg-background/85 rounded-lg border p-4 shadow-sm'>
      <Icon className='text-primary h-4 w-4' aria-hidden />
      <p className='text-foreground/60 mt-3 text-xs tracking-[0.14em] uppercase'>
        {label}
      </p>
      <p className='mt-1 text-xl font-semibold'>{value}</p>
    </div>
  )
}
