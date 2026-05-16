import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { x402Network } from '@/lib/config/chains'

export default function DevelopersPage() {
  const steps = [
    {
      title: 'List an API',
      detail:
        'Register product metadata, request and response schemas, price in MUSD, and the provider endpoint Tollora forwards to.'
    },
    {
      title: 'Protect the call',
      detail:
        'Expose a Tollora endpoint that returns HTTP 402 payment requirements until the client provides a valid MUSD payment payload.'
    },
    {
      title: 'Forward the request',
      detail:
        'After verification, Tollora forwards the request, stores usage, and returns the provider response to the buyer or agent.'
    },
    {
      title: 'Serve agents',
      detail:
        'Agent-ready listings can be selected by Launch Pack Agent, paid with x402, and included in a public Mezo proof.'
    },
    {
      title: 'Record the receipt',
      detail:
        'Receipts store buyer wallet, provider wallet, amount, network, transaction hash, request ID, and explorer URL.'
    }
  ]

  return (
    <div className='bg-app-grid min-h-screen'>
      <section className='mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_0.8fr] lg:items-center'>
        <div className='space-y-6'>
          <Badge>Developers</Badge>
          <h1 className='font-display max-w-3xl text-4xl leading-tight sm:text-5xl'>
            Build paid tools for humans and autonomous agents.
          </h1>
          <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
            Tollora gives providers a marketplace listing, stable gateway
            endpoint, MUSD payment verification, request forwarding, receipts,
            usage logs, agent-ready HTTP semantics, and proof-backed run
            records on Mezo.
          </p>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <Link href='/marketplace' className={buttonClasses({ size: 'sm' })}>
              Explore APIs
            </Link>
            <Link
              href='/agents'
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              Open agents
            </Link>
            <Link
              href='/developers/docs'
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              Open docs
            </Link>
          </div>
        </div>
        <Card className='space-y-4'>
          {[
            ['Network', x402Network],
            ['Stablecoin', 'MUSD'],
            ['Gas currency', 'BTC'],
            ['Facilitator', 'https://facilitator.vativ.io/']
          ].map(([label, value]) => (
            <div key={label}>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                {label}
              </p>
              <p className='mt-1 text-sm font-semibold break-words'>{value}</p>
            </div>
          ))}
        </Card>
      </section>

      <section className='mx-auto w-full max-w-6xl px-6 pb-16'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {steps.map(step => (
            <Card key={step.title} className='min-h-52'>
              <h2 className='font-display text-xl'>{step.title}</h2>
              <p className='text-foreground/65 mt-4 text-sm leading-6'>
                {step.detail}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
