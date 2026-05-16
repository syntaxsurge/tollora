import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AgentRunCreateForm } from '@/features/agents/agent-run-create-form'

export default function NewAgentRunPage() {
  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Launch Pack Agent</Badge>
        <div className='mt-4 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end'>
          <div className='space-y-3'>
            <h1 className='font-display text-4xl'>
              Configure an autonomous paid workflow.
            </h1>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              Set the goal, budget, tool allowance, and signer mode. The agent
              will spend only through selected x402-protected Tollora products
              and prepare a public proof package after completion.
            </p>
          </div>
          <Card className='bg-background/85'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Monetization
            </p>
            <p className='mt-2 text-2xl font-semibold'>Per-action MUSD fees</p>
            <p className='text-foreground/65 mt-2 text-sm leading-6'>
              Providers earn 95% of paid API revenue while Tollora earns the
              platform fee and can charge orchestration for agent runs.
            </p>
          </Card>
        </div>
      </section>
      <AgentRunCreateForm />
      <Link
        href='/agents'
        className={buttonClasses({ variant: 'outline', size: 'sm' })}
      >
        Back to agents
      </Link>
    </div>
  )
}
