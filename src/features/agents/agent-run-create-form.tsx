'use client'

import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'

import {
  Boxes,
  Check,
  FileCheck2,
  type LucideIcon,
  Sparkles,
  Wallet
} from 'lucide-react'
import { useRouter } from 'nextjs-toploader/app'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { AgentRun, AgentToolSlug } from '@/features/agents/types'
import type { ApiProduct } from '@/features/marketplace/products'

export function AgentRunCreateForm({
  products
}: {
  products: Pick<
    ApiProduct,
    | 'slug'
    | 'name'
    | 'priceLabel'
    | 'providerName'
    | 'category'
    | 'isAgentReady'
  >[]
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const agentReadyProducts = products.filter(product => product.isAgentReady)
  const [selectedTools, setSelectedTools] = useState<AgentToolSlug[]>([])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/agents/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: formData.get('objective'),
          sourceText: formData.get('sourceText') || undefined,
          ownerWallet: formData.get('ownerWallet'),
          budgetCapMusd: formData.get('budgetCapMusd'),
          maxPaidActions: formData.get('maxPaidActions'),
          allowedTools: selectedTools,
          mode: 'production'
        })
      })
      const run = (await response.json()) as AgentRun & { error?: string }

      if (!response.ok) {
        throw new Error(run.error ?? 'Unable to create the agent run.')
      }

      window.sessionStorage.setItem(
        `tollora:agent-run:${run.id}`,
        JSON.stringify(run)
      )
      router.push(`/agents/${run.id}`)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create the agent run.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleTool(tool: AgentToolSlug) {
    setSelectedTools(current =>
      current.includes(tool)
        ? current.filter(item => item !== tool)
        : [...current, tool]
    )
  }

  function allowAgentToChoose() {
    setSelectedTools(agentReadyProducts.map(product => product.slug))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='grid gap-5 xl:grid-cols-[1fr_340px]'
    >
      <div className='space-y-5'>
        <Card className='space-y-5'>
          <SectionTitle
            icon={Sparkles}
            eyebrow='Goal'
            title='What should the agent accomplish?'
          />
          <label className='block space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Objective
            </span>
            <textarea
              name='objective'
              defaultValue='Create a launch pack for my MUSD-native paid API product.'
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-ring focus-visible:ring-offset-background min-h-28 w-full resize-y rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              required
            />
          </label>
          <label className='block space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Context
            </span>
            <textarea
              name='sourceText'
              defaultValue='The product sells premium API responses to AI agents and records MUSD receipts on Mezo.'
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-ring focus-visible:ring-offset-background min-h-24 w-full resize-y rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            />
          </label>
        </Card>

        <Card className='space-y-5'>
          <SectionTitle
            icon={Boxes}
            eyebrow='Tools'
            title='Choose what OpenAI may use'
            action={
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={agentReadyProducts.length === 0}
                onClick={allowAgentToChoose}
              >
                <Sparkles className='h-4 w-4' aria-hidden />
                Select all
              </Button>
            }
          />
          <div className='grid gap-3 md:grid-cols-2'>
            {agentReadyProducts.length === 0 ? (
              <div className='border-foreground/10 bg-muted/30 rounded-lg border p-4 md:col-span-2'>
                <p className='font-semibold'>No agent-ready APIs yet</p>
                <p className='text-foreground/65 mt-1 text-sm leading-6'>
                  Publish a provider product with agent access enabled first.
                </p>
              </div>
            ) : null}
            {agentReadyProducts.map(product => {
              const checked = selectedTools.includes(product.slug)

              return (
                <label
                  key={product.slug}
                  className={`border-foreground/10 hover:border-primary/50 flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                    checked ? 'bg-primary/10 ring-primary/30 ring-1' : 'bg-card'
                  }`}
                >
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() => toggleTool(product.slug)}
                    className='sr-only'
                  />
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-foreground/20'
                    }`}
                  >
                    {checked ? <Check className='h-4 w-4' aria-hidden /> : null}
                  </span>
                  <span className='min-w-0'>
                    <span className='block truncate font-semibold'>
                      {product.name}
                    </span>
                    <span className='text-foreground/60 mt-1 block text-sm'>
                      {product.priceLabel} - {product.providerName}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </Card>
      </div>

      <aside className='space-y-5 xl:sticky xl:top-28 xl:self-start'>
        <Card className='space-y-5'>
          <SectionTitle icon={Wallet} eyebrow='Step 2' title='Funded budget' />
          <div className='border-border bg-primary/5 rounded-lg border p-3 text-sm leading-6'>
            Agent runs are created first, then funded on the run page with a
            MUSD deposit into the agent budget vault before any paid action can
            execute.
          </div>
          <div className='grid gap-4'>
            <label className='space-y-2'>
              <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                Owner wallet
              </span>
              <Input
                name='ownerWallet'
                defaultValue='0x7CE33579392AEAF1791c9B0c8302a502B5867688'
                required
              />
            </label>
            <div className='grid grid-cols-2 gap-3'>
              <label className='space-y-2'>
                <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  Budget
                </span>
                <Input
                  name='budgetCapMusd'
                  type='number'
                  step='0.01'
                  min='0.08'
                  defaultValue='0.90'
                  required
                />
              </label>
              <label className='space-y-2'>
                <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  Actions
                </span>
                <Input
                  name='maxPaidActions'
                  type='number'
                  min='1'
                  max='4'
                  defaultValue='4'
                  required
                />
              </label>
            </div>
          </div>
        </Card>

        <Card className='space-y-5'>
          <SectionTitle icon={FileCheck2} eyebrow='Step 3' title='Review run' />
          <div className='border-foreground/10 bg-muted/30 rounded-lg border p-3'>
            <div className='flex items-center justify-between gap-3'>
              <span className='text-sm font-semibold'>Allowed tools</span>
              <Badge>{selectedTools.length}</Badge>
            </div>
            <p className='text-foreground/60 mt-2 text-sm leading-6'>
              OpenAI chooses from this set. Tollora still quotes, pays, and
              records receipts.
            </p>
          </div>
          <Button
            type='submit'
            className='w-full'
            disabled={isSubmitting || selectedTools.length === 0}
          >
            <FileCheck2 className='h-4 w-4' aria-hidden />
            {isSubmitting ? 'Preparing' : 'Create run'}
          </Button>
          {error ? (
            <p
              className='rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300'
              role='alert'
            >
              {error}
            </p>
          ) : null}
        </Card>
      </aside>
    </form>
  )
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
  action
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='flex items-start gap-3'>
        <span className='bg-primary/10 text-primary rounded-lg p-2'>
          <Icon className='h-4 w-4' aria-hidden />
        </span>
        <span>
          <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            {eyebrow}
          </span>
          <span className='mt-1 block text-lg font-semibold'>{title}</span>
        </span>
      </div>
      {action}
    </div>
  )
}
