'use client'

import { FormEvent, useState } from 'react'

import { Bot, Sparkles } from 'lucide-react'
import { useRouter } from 'nextjs-toploader/app'

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
          mode: formData.get('mode')
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
    <form onSubmit={handleSubmit} className='space-y-5'>
      <Card className='space-y-4'>
        <label className='space-y-2'>
          <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Agent objective
          </span>
          <textarea
            name='objective'
            defaultValue='Create a launch pack for my MUSD-native paid API product.'
            className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 min-h-28 w-full rounded-lg border px-4 py-3 text-sm leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            required
          />
        </label>
        <label className='space-y-2'>
          <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Source context
          </span>
          <textarea
            name='sourceText'
            defaultValue='The product sells premium API responses to AI agents and records MUSD receipts on Mezo.'
            className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 min-h-24 w-full rounded-lg border px-4 py-3 text-sm leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          />
        </label>
        <div className='grid gap-4 md:grid-cols-3'>
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
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Budget cap
            </span>
            <Input
              name='budgetCapMusd'
              type='number'
              step='0.01'
              min='0.08'
              defaultValue='20'
              required
            />
          </label>
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Max paid actions
            </span>
            <Input
              name='maxPaidActions'
              type='number'
              min='1'
              max='4'
              defaultValue='3'
              required
            />
          </label>
        </div>
      </Card>
      <Card className='space-y-4'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Allowed paid tools
          </p>
          <p className='text-foreground/65 mt-2 text-sm leading-6'>
            Select the tools the agent is allowed to consider. The planner will
            rank this allowed set, choose the best tools for the objective, and
            stop at the max paid action count.
          </p>
        </div>
        <div className='grid gap-3 md:grid-cols-2'>
          {agentReadyProducts.length === 0 ? (
            <div className='border-foreground/10 rounded-lg border p-4 md:col-span-2'>
              <p className='font-semibold'>No agent-ready APIs yet</p>
              <p className='text-foreground/65 mt-1 text-sm leading-6'>
                Publish a provider product with agent access enabled before
                creating an autonomous run.
              </p>
            </div>
          ) : null}
          {agentReadyProducts.map(product => (
            <label
              key={product.slug}
              className='border-foreground/10 flex cursor-pointer gap-3 rounded-lg border p-4'
            >
              <input
                type='checkbox'
                checked={selectedTools.includes(product.slug)}
                onChange={() => toggleTool(product.slug)}
                className='mt-1'
              />
              <span>
                <span className='block font-semibold'>{product?.name}</span>
                <span className='text-foreground/60 mt-1 block text-sm'>
                  {product.priceLabel} - {product.providerName}
                </span>
              </span>
            </label>
          ))}
        </div>
        <Button
          type='button'
          variant='outline'
          disabled={agentReadyProducts.length === 0}
          onClick={allowAgentToChoose}
        >
          <Sparkles className='h-4 w-4' aria-hidden />
          Allow agent to choose from all tools
        </Button>
        <fieldset className='flex flex-wrap gap-3'>
          <legend className='sr-only'>Agent execution mode</legend>
          {[
            ['local', 'Local signer'],
            ['production', 'Production signer']
          ].map(([value, label]) => (
            <label
              key={value}
              className='border-foreground/10 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'
            >
              <input
                type='radio'
                name='mode'
                value={value}
                defaultChecked={value === 'local'}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </Card>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button
          type='submit'
          disabled={isSubmitting || selectedTools.length === 0}
        >
          <Bot className='h-4 w-4' aria-hidden />
          {isSubmitting ? 'Preparing' : 'Start agent'}
        </Button>
        {error ? (
          <p className='text-sm text-red-600' role='alert'>
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
