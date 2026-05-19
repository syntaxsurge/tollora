import Link from 'next/link'

import {
  ArrowLeft,
  Bot,
  CircleDollarSign,
  type LucideIcon,
  Sparkles,
  WalletCards
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { AgentRunCreateForm } from '@/features/agents/agent-run-create-form'
import { getPublishedProducts } from '@/features/marketplace/products'

export default function NewAgentRunPage() {
  const products = getPublishedProducts().map(product => ({
    slug: product.slug,
    name: product.name,
    priceLabel: product.priceLabel,
    providerName: product.providerName,
    category: product.category,
    isAgentReady: product.isAgentReady
  }))
  const steps: { icon: LucideIcon; title: string; detail: string }[] = [
    { icon: Sparkles, title: 'Plan', detail: 'Select tools' },
    { icon: WalletCards, title: 'Pay', detail: 'x402 MUSD' },
    { icon: CircleDollarSign, title: 'Earn', detail: '95% provider split' }
  ]

  return (
    <div className='space-y-6'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-5 sm:p-6'>
        <div className='grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center'>
          <div className='space-y-4'>
            <Badge className='w-fit'>
              <Bot className='h-3.5 w-3.5' aria-hidden />
              Launch Pack Agent
            </Badge>
            <div className='space-y-3'>
              <h1 className='font-display text-3xl text-balance sm:text-4xl'>
                Create an autonomous paid run.
              </h1>
              <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
                Give the agent a goal, budget, and allowed tools. OpenAI plans;
                Tollora pays and proves.
              </p>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-1'>
            {steps.map(({ icon: Icon, title, detail }) => (
              <div
                key={title}
                className='border-foreground/10 bg-background/85 rounded-lg border p-4'
              >
                <Icon className='text-primary h-4 w-4' aria-hidden />
                <p className='mt-3 font-semibold'>{title}</p>
                <p className='text-foreground/60 mt-1 text-sm'>{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <AgentRunCreateForm products={products} />
      <Link
        href='/agents'
        className={buttonClasses({ variant: 'outline', size: 'sm' })}
      >
        <ArrowLeft className='h-4 w-4' aria-hidden />
        Agents
      </Link>
    </div>
  )
}
