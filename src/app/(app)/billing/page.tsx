import Link from 'next/link'

import { BillingOverview } from '@/components/billing/billing-overview'
import { ManagedCreditsPanel } from '@/components/billing/managed-credits-panel'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAgentMetrics } from '@/features/agents/store'
import { settlementReceipts } from '@/features/marketplace/receipts'
import { getProjectSnapshot } from '@/lib/config/project'

const checklist = [
  'x402 paid calls settle through the configured Mezo facilitator.',
  'Receipts show MUSD amount, fee split, transaction hash, and explorer URL.',
  'Provider dashboards calculate the 95% provider share and 5% platform fee.'
]

export default async function BillingPage() {
  const snapshot = await getProjectSnapshot()
  const agentMetrics = getAgentMetrics()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Billing</Badge>
        <div className='mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end'>
          <div className='max-w-3xl space-y-3'>
            <h1 className='font-display text-4xl'>Plan and usage</h1>
            <p className='text-foreground/70 text-sm leading-6'>
              Review wallet ownership, workspace plan context, and MUSD usage
              records for paid API activity.
            </p>
          </div>
          <Link
            href='/pricing'
            className={buttonClasses({
              variant: 'outline',
              size: 'sm',
              className: 'whitespace-nowrap'
            })}
          >
            View pricing
          </Link>
        </div>
      </section>

      <BillingOverview
        subscriptionConfigured={Boolean(snapshot.subscriptionManagerAddress)}
      />

      <ManagedCreditsPanel />

      <Card className='space-y-4'>
        <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Agent spend
            </p>
            <h2 className='font-display mt-2 text-2xl'>
              Autonomous workflow usage
            </h2>
          </div>
          <Link
            href='/agents'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Open agents
          </Link>
        </div>
        <div className='grid gap-3 md:grid-cols-4'>
          {[
            ['Runs', agentMetrics.totalRuns.toString()],
            ['Completed', agentMetrics.completedRuns.toString()],
            ['Proofs', agentMetrics.proofCount.toString()],
            ['Spend', `${agentMetrics.totalSpendMusd} MUSD`]
          ].map(([label, value]) => (
            <div key={label} className='bg-muted rounded-lg p-4'>
              <p className='text-foreground/60 text-xs uppercase'>{label}</p>
              <p className='mt-1 font-semibold'>{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className='space-y-4'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Integration checklist
          </p>
          <h2 className='font-display mt-2 text-2xl'>Payment readiness</h2>
        </div>
        <div className='grid gap-3 md:grid-cols-3'>
          {checklist.map(item => (
            <div
              key={item}
              className='border-foreground/10 rounded-lg border p-4 text-sm leading-6'
            >
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card className='space-y-4'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            MUSD receipts
          </p>
          <h2 className='font-display mt-2 text-2xl'>Recent settlements</h2>
        </div>
        {settlementReceipts.length > 0 ? (
          <div className='grid gap-3'>
            {settlementReceipts.map(receipt => (
              <div
                key={receipt.id}
                className='border-foreground/10 grid gap-4 rounded-lg border p-4 text-sm lg:grid-cols-[1fr_140px_150px_120px]'
              >
                <div>
                  <p className='font-semibold'>{receipt.productName}</p>
                  <p className='text-foreground/60 mt-1 font-mono text-xs'>
                    {receipt.txHash}
                  </p>
                </div>
                <div>
                  <p className='text-foreground/60 text-xs uppercase'>Amount</p>
                  <p className='mt-1 font-semibold'>{receipt.amountMusd}</p>
                </div>
                <div>
                  <p className='text-foreground/60 text-xs uppercase'>
                    Provider amount
                  </p>
                  <p className='mt-1 font-semibold'>
                    {receipt.providerAmountMusd}
                  </p>
                </div>
                <Link
                  href={`/receipts/${receipt.id}`}
                  className={buttonClasses({ variant: 'outline', size: 'sm' })}
                >
                  Open receipt
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className='border-foreground/10 rounded-lg border p-5 text-sm leading-6'>
            Settled receipts appear here after successful MUSD-paid API calls.
          </div>
        )}
      </Card>
    </div>
  )
}
