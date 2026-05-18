import { ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getPublishedProducts } from '@/features/marketplace/products'
import { getProjectSnapshot } from '@/lib/config/project'
import { getOperationalReadiness } from '@/lib/operations/readiness'

const deploymentSteps = [
  'Set NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_CONVEX_URL, and wallet provider values in the root environment.',
  'Set NEXT_PUBLIC_X402_NETWORK, X402_FACILITATOR_URL, and TOLLORA_PLATFORM_FEE_BPS for MUSD-paid API calls.',
  'Set AGENT_SPENDER_PRIVATE_KEY, AGENT_ATTESTER_PRIVATE_KEY, and NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS for production agent runs.',
  'Run pnpm typecheck and pnpm build before deployment.',
  'Deploy the Next.js app with the same Mezo and x402 values used for the verified local build.',
  'Confirm /api/health, /api/openapi.json, /api/reference, /agents, /proofs/[proofId], and an unpaid x402 product call return expected responses.'
]

export default async function AdminOperationsPage() {
  const snapshot = await getProjectSnapshot()
  const readiness = getOperationalReadiness()
  const products = getPublishedProducts()

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Operations</Badge>
        <div className='mt-4 max-w-3xl space-y-3'>
          <h1 className='font-display text-4xl'>Gateway operations</h1>
          <p className='text-foreground/70 text-sm leading-6'>
            Monitor deployment readiness, x402 payment health, autonomous
            agent signers, provider adapters, receipt coverage, and contract
            configuration from the admin workspace.
          </p>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
        {[
          ['Ready checks', readiness.readyCount.toString()],
          ['Needs attention', readiness.attentionCount.toString()],
          ['Published APIs', products.length.toString()]
        ].map(([label, value]) => (
          <Card key={label}>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              {label}
            </p>
            <p className='mt-3 text-2xl font-semibold'>{value}</p>
          </Card>
        ))}
      </section>

      <section className='grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Deployment readiness
          </p>
          <div className='space-y-3'>
            {readiness.items.map(item => (
              <div
                key={item.label}
                className='border-foreground/10 grid gap-3 rounded-lg border p-4 text-sm leading-6 md:grid-cols-[150px_120px_1fr]'
              >
                <span className='font-semibold'>{item.label}</span>
                <span
                  className={
                    item.state === 'ready'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }
                >
                  {item.value}
                </span>
                <span className='text-foreground/65'>{item.detail}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Subscription contract
          </p>
          <h2 className='font-display text-2xl'>Runtime address</h2>
          <div className='bg-muted rounded-lg p-4'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Address
            </p>
            <p className='mt-2 text-sm font-semibold break-all'>
              {snapshot.subscriptionManagerAddress ?? 'Not configured'}
            </p>
            <p className='text-foreground/55 mt-2 text-xs'>
              {snapshot.subscriptionChain.name} - Chain ID{' '}
              {snapshot.subscriptionChain.id} -{' '}
              {snapshot.subscriptionChain.nativeTokenSymbol}
            </p>
          </div>
          {snapshot.subscriptionManagerExplorerUrl ? (
            <a
              href={snapshot.subscriptionManagerExplorerUrl}
              target='_blank'
              rel='noreferrer'
              className={buttonClasses({
                variant: 'outline',
                size: 'sm',
                className: 'gap-2'
              })}
            >
              View on {snapshot.subscriptionChain.explorerName}
              <ExternalLink className='h-4 w-4' aria-hidden />
            </a>
          ) : null}
        </Card>
      </section>

      <section className='grid gap-5 lg:grid-cols-[0.9fr_1.1fr]'>
        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Release checklist
          </p>
          <div className='space-y-3'>
            {deploymentSteps.map((step, index) => (
              <div
                key={step}
                className='border-foreground/10 flex gap-3 rounded-lg border p-4 text-sm leading-6'
              >
                <span className='bg-accent text-accent-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className='space-y-4'>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Provider adapters
          </p>
          <div className='grid gap-3'>
            {products.map(product => (
              <div
                key={product.slug}
                className='border-foreground/10 grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-[1fr_110px_120px]'
              >
                <div>
                  <p className='font-semibold'>{product.name}</p>
                  <p className='text-foreground/60 mt-1'>
                    {product.providerName} - {product.endpointPath}
                  </p>
                </div>
                <div>
                  <p className='text-foreground/60 text-xs uppercase'>Price</p>
                  <p className='mt-1 font-semibold'>{product.priceLabel}</p>
                </div>
                <div>
                  <p className='text-foreground/60 text-xs uppercase'>
                    Success
                  </p>
                  <p className='mt-1 font-semibold'>{product.successRate}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
