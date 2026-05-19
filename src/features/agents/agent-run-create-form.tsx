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
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'
import type { AgentTemplate } from '@/features/agents/templates'
import type { AgentRun, AgentToolSlug } from '@/features/agents/types'
import type { ApiProduct } from '@/features/marketplace/products'

export function AgentRunCreateForm({
  products,
  template,
  initialTool
}: {
  template?: AgentTemplate
  initialTool?: string
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
  const initialAgentTool = agentReadyProducts.some(
    product => product.slug === initialTool
  )
    ? (initialTool as AgentToolSlug)
    : undefined
  const [selectedTools, setSelectedTools] = useState<AgentToolSlug[]>(
    initialAgentTool ? [initialAgentTool] : []
  )
  const [toolMode, setToolMode] = useState<'ai' | 'manual'>(
    initialAgentTool ? 'manual' : 'ai'
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const ownerWallet = formData.get('ownerWallet')

    try {
      if (!ownerWallet) {
        throw new Error('Connect your wallet before creating an agent run.')
      }

      const response = await fetch('/api/agents/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: template?.id,
          objective: formData.get('objective'),
          sourceText: formData.get('sourceText') || undefined,
          ownerWallet,
          budgetCapMusd: formData.get('budgetCapMusd'),
          maxPaidActions: formData.get('maxPaidActions'),
          allowedTools:
            toolMode === 'ai'
              ? agentReadyProducts.map(product => product.slug)
              : selectedTools,
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
    setToolMode('ai')
    setSelectedTools(agentReadyProducts.map(product => product.slug))
  }

  return (
    <WalletAddressConsumer>
      {({ address, isConnected }) => (
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
                  defaultValue={template?.objective}
                  placeholder='Tell the agent what business outcome to produce.'
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
                  defaultValue={template?.sourceText}
                  placeholder='Paste product notes, audience, API behavior, constraints, or launch context.'
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
                    AI decides
                  </Button>
                }
              />
              <div className='grid gap-3 md:grid-cols-2'>
                <label
                  className={`border-foreground/10 hover:border-primary/50 flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                    toolMode === 'ai'
                      ? 'bg-primary/10 ring-primary/30 ring-1'
                      : 'bg-card'
                  }`}
                >
                  <input
                    type='radio'
                    name='toolMode'
                    checked={toolMode === 'ai'}
                    onChange={() => setToolMode('ai')}
                    className='sr-only'
                  />
                  <span className='bg-primary/10 text-primary rounded-lg p-2'>
                    <Sparkles className='h-4 w-4' aria-hidden />
                  </span>
                  <span>
                    <span className='block font-semibold'>
                      Let AI decide from all agent-ready tools
                    </span>
                    <span className='text-foreground/60 mt-1 block text-sm leading-6'>
                      Best for demos and large marketplaces. OpenAI sees the
                      catalog and only buys relevant tools inside budget.
                    </span>
                  </span>
                </label>
                <label
                  className={`border-foreground/10 hover:border-primary/50 flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                    toolMode === 'manual'
                      ? 'bg-primary/10 ring-primary/30 ring-1'
                      : 'bg-card'
                  }`}
                >
                  <input
                    type='radio'
                    name='toolMode'
                    checked={toolMode === 'manual'}
                    onChange={() => setToolMode('manual')}
                    className='sr-only'
                  />
                  <span className='bg-muted text-foreground rounded-lg p-2'>
                    <Boxes className='h-4 w-4' aria-hidden />
                  </span>
                  <span>
                    <span className='block font-semibold'>
                      Manually limit the tool set
                    </span>
                    <span className='text-foreground/60 mt-1 block text-sm leading-6'>
                      Use this when a buyer wants strict control over which paid
                      APIs can be called.
                    </span>
                  </span>
                </label>
              </div>

              {toolMode === 'manual' ? (
                <div className='grid gap-3 md:grid-cols-2'>
                  {agentReadyProducts.length === 0 ? (
                    <div className='border-foreground/10 bg-muted/30 rounded-lg border p-4 md:col-span-2'>
                      <p className='font-semibold'>No agent-ready APIs yet</p>
                      <p className='text-foreground/65 mt-1 text-sm leading-6'>
                        Publish a provider product with agent access enabled
                        first.
                      </p>
                    </div>
                  ) : null}
                  {agentReadyProducts.map(product => {
                    const checked = selectedTools.includes(product.slug)

                    return (
                      <label
                        key={product.slug}
                        className={`border-foreground/10 hover:border-primary/50 flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                          checked
                            ? 'bg-primary/10 ring-primary/30 ring-1'
                            : 'bg-card'
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
                          {checked ? (
                            <Check className='h-4 w-4' aria-hidden />
                          ) : null}
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
              ) : (
                <div className='border-foreground/10 bg-muted/30 rounded-lg border p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='font-semibold'>
                      {agentReadyProducts.length} tools available to OpenAI
                    </p>
                    <Badge>Auto</Badge>
                  </div>
                  <p className='text-foreground/60 mt-2 text-sm leading-6'>
                    The planner still quotes each tool, skips irrelevant or
                    over-budget calls, and records receipts only for paid
                    actions it actually executes.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <aside className='space-y-5 xl:sticky xl:top-28 xl:self-start'>
            <Card className='space-y-5'>
              <SectionTitle
                icon={Wallet}
                eyebrow='Step 2'
                title='Funded budget'
              />
              <div className='border-border bg-primary/5 rounded-lg border p-3 text-sm leading-6'>
                Agent runs are created first, then funded on the run page with a
                MUSD deposit into the agent budget vault before any paid action
                can execute.
              </div>
              <div className='grid gap-4'>
                <div className='space-y-2'>
                  <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                    Owner wallet
                  </span>
                  <input
                    type='hidden'
                    name='ownerWallet'
                    value={address ?? ''}
                    required
                  />
                  <div className='border-foreground/10 bg-muted/30 text-foreground min-h-11 rounded-lg border px-4 py-3 text-sm font-semibold break-all'>
                    {address ?? 'Connect a wallet to create an agent run'}
                  </div>
                  <p className='text-foreground/60 text-xs leading-5'>
                    This connected wallet owns the run, funds the vault, and
                    receives any unused budget refund.
                  </p>
                </div>
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
                      defaultValue={(
                        template?.recommendedBudgetMusd ?? 0.9
                      ).toFixed(2)}
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
                      defaultValue={template?.maxPaidActions ?? 4}
                      required
                    />
                  </label>
                </div>
              </div>
            </Card>

            <Card className='space-y-5'>
              <SectionTitle
                icon={FileCheck2}
                eyebrow='Step 3'
                title='Review run'
              />
              <div className='border-foreground/10 bg-muted/30 rounded-lg border p-3'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-sm font-semibold'>Allowed tools</span>
                  <Badge>
                    {toolMode === 'ai'
                      ? `${agentReadyProducts.length} available`
                      : selectedTools.length}
                  </Badge>
                </div>
                <p className='text-foreground/60 mt-2 text-sm leading-6'>
                  {toolMode === 'ai'
                    ? 'OpenAI chooses relevant tools from the agent-ready catalog.'
                    : 'OpenAI chooses only from the manually selected tools.'}{' '}
                  Tollora still quotes, pays, and records receipts.
                </p>
              </div>
              <Button
                type='submit'
                className='w-full'
                disabled={
                  isSubmitting ||
                  (toolMode === 'manual' && selectedTools.length === 0) ||
                  (toolMode === 'ai' && agentReadyProducts.length === 0) ||
                  !isConnected ||
                  !address
                }
              >
                <FileCheck2 className='h-4 w-4' aria-hidden />
                {isSubmitting ? 'Preparing' : 'Create run'}
              </Button>
              {!isConnected || !address ? (
                <p className='border-foreground/10 bg-muted/30 text-foreground/70 rounded-lg border p-3 text-sm leading-6'>
                  Connect your wallet first so Tollora can assign ownership and
                  prepare the funded budget vault.
                </p>
              ) : null}
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
      )}
    </WalletAddressConsumer>
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
