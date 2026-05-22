'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  ImageIcon,
  LinkIcon,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Undo2,
  Video,
  WalletCards
} from 'lucide-react'
import { createPublicClient, http, type Address, type Hex } from 'viem'
import { useAccount, useWalletClient } from 'wagmi'

import { JsonViewer } from '@/components/data-display/json-viewer'
import { MarkdownViewer } from '@/components/data-display/markdown-viewer'
import { Button, buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  agentActionStatusLabels,
  agentRunStatusDetails,
  agentRunStatusLabels
} from '@/features/agents/status'
import type { AgentLedgerEvent, AgentRun } from '@/features/agents/types'
import { defaultAppChain } from '@/lib/config/chains'
import {
  agentRunVaultAbi,
  erc20ApprovalAbi
} from '@/lib/contracts/agent-run-vault'

type AgentRunClientProps = {
  runId: string
  initialRun: AgentRun | null
}

type FundingPrepareResponse = {
  run: AgentRun
  funding: {
    runId: Hex
    vaultAddress: Address
    tokenAddress: Address
    amount: string
    amountMusd: string
    agentSigner: Address
    expiresAt: number
  }
  error?: string
}

const publicClient = createPublicClient({
  chain: defaultAppChain.viemChain,
  transport: http(defaultAppChain.viemChain.rpcUrls.default.http[0])
})

export function AgentRunClient({ runId, initialRun }: AgentRunClientProps) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [run, setRun] = useState<AgentRun | null>(initialRun)
  const [status, setStatus] = useState('')
  const [isFunding, setIsFunding] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isAttesting, setIsAttesting] = useState(false)

  useEffect(() => {
    if (run) {
      return
    }

    const saved = window.sessionStorage.getItem(`tollora:agent-run:${runId}`)

    if (saved) {
      setRun(JSON.parse(saved) as AgentRun)
    }
  }, [run, runId])

  const completedPaidActions = useMemo(
    () =>
      run?.actions.filter(
        action => action.status === 'completed' && action.receipt
      ).length ?? 0,
    [run?.actions]
  )
  const finalOutputs = useMemo(
    () => (run ? getFinalOutputItems(run) : []),
    [run]
  )

  async function fundRun() {
    if (!walletClient?.account) {
      setStatus('Connect the wallet that owns this run before funding it.')
      return
    }

    setIsFunding(true)
    setStatus('Preparing the agent budget vault transaction.')

    try {
      const prepareResponse = await fetch(
        `/api/agents/runs/${runId}/funding/prepare`,
        { method: 'POST' }
      )
      const prepared = (await prepareResponse.json()) as FundingPrepareResponse

      if (!prepareResponse.ok || prepared.error) {
        throw new Error(prepared.error ?? 'Unable to prepare agent funding.')
      }

      setRun(prepared.run)
      setStatus('Approve MUSD for the agent run vault in your wallet.')
      const approvalTxHash = await walletClient.writeContract({
        address: prepared.funding.tokenAddress,
        abi: erc20ApprovalAbi,
        functionName: 'approve',
        args: [prepared.funding.vaultAddress, BigInt(prepared.funding.amount)]
      })

      await publicClient.waitForTransactionReceipt({ hash: approvalTxHash })

      setStatus('Funding the agent run vault.')
      const fundingTxHash = await walletClient.writeContract({
        address: prepared.funding.vaultAddress,
        abi: agentRunVaultAbi,
        functionName: 'fundRun',
        args: [
          prepared.funding.runId,
          prepared.funding.tokenAddress,
          BigInt(prepared.funding.amount),
          prepared.funding.agentSigner,
          BigInt(prepared.funding.expiresAt)
        ]
      })

      await publicClient.waitForTransactionReceipt({ hash: fundingTxHash })

      const confirmResponse = await fetch(
        `/api/agents/runs/${runId}/funding/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fundingTxHash, approvalTxHash })
        }
      )
      const body = (await confirmResponse.json()) as AgentRun & {
        error?: string
      }

      if (!confirmResponse.ok) {
        throw new Error(body.error ?? 'Unable to confirm funding.')
      }

      persistRun(body)
      setStatus('Agent budget funded. The agent can now run paid actions.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to fund the agent.'
      )
    } finally {
      setIsFunding(false)
    }
  }

  async function executeRun() {
    setIsRunning(true)
    setStatus('')

    try {
      const response = await fetch(`/api/agents/runs/${runId}/execute`, {
        method: 'POST'
      })
      const body = (await response.json()) as AgentRun & { error?: string }

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to execute the agent run.')
      }

      persistRun(body)
      setStatus(
        body.status === 'completed'
          ? 'Agent run completed paid actions and prepared deliverables.'
          : body.summary
      )
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to execute the agent run.'
      )
    } finally {
      setIsRunning(false)
    }
  }

  async function refundUnusedBudget() {
    setIsRefunding(true)
    setStatus('')

    try {
      const response = await fetch(`/api/agents/runs/${runId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const body = (await response.json()) as AgentRun & { error?: string }

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to refund unused budget.')
      }

      persistRun(body)
      setStatus('Unused budget marked as refunded.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to refund unused budget.'
      )
    } finally {
      setIsRefunding(false)
    }
  }

  async function attestRun() {
    setIsAttesting(true)
    setStatus('')

    try {
      const response = await fetch(`/api/agents/runs/${runId}/attest`, {
        method: 'POST'
      })
      const body = (await response.json()) as AgentRun & { error?: string }

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to attest the agent run.')
      }

      persistRun(body)
      setStatus('Proof hash attested on Mezo and ready for public audit.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to attest the agent run.'
      )
    } finally {
      setIsAttesting(false)
    }
  }

  function persistRun(nextRun: AgentRun) {
    try {
      window.sessionStorage.setItem(
        `tollora:agent-run:${nextRun.id}`,
        JSON.stringify(nextRun)
      )
      nextRun.actions.forEach(action => {
        if (action.receipt) {
          window.sessionStorage.setItem(
            `tollora:receipt:${action.receipt.id}`,
            JSON.stringify(action.receipt)
          )
        }
      })
    } catch {
      window.sessionStorage.removeItem(`tollora:agent-run:${nextRun.id}`)
    }

    setRun(nextRun)
  }

  if (!run) {
    return (
      <Card>
        <p className='font-semibold'>Agent run not found</p>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          The run is not available in this browser session.
        </p>
      </Card>
    )
  }

  const canRun =
    ['planned', 'failed'].includes(run.status) &&
    ['funded', 'partially_spent', 'refund_available'].includes(
      run.fundingStatus
    ) &&
    run.availableAmountMusd !== '0.00 MUSD'
  const canRefund =
    ['failed', 'completed', 'attested'].includes(run.status) &&
    run.fundingStatus === 'refund_available' &&
    run.availableAmountMusd !== '0.00 MUSD'
  const RunStatusIcon = statusIcon(run.status)

  return (
    <div className='space-y-5'>
      <Card className='overflow-hidden p-0'>
        <div className='from-primary/10 via-card to-brand-purple/10 border-border/70 border-b bg-gradient-to-br p-5 sm:p-6'>
          <div className='flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between'>
            <div className='min-w-0 space-y-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase'>
                  <Bot className='h-3.5 w-3.5' aria-hidden />
                  Agent run
                </span>
                <StatusPill status={run.status} />
              </div>
              <div>
                <h2 className='font-display text-3xl leading-tight sm:text-4xl'>
                  {run.title}
                </h2>
                <p className='text-foreground/70 mt-2 max-w-4xl text-sm leading-6 sm:text-base'>
                  {run.objective}
                </p>
              </div>
            </div>

            <div className='grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[34rem]'>
              <CompactMetric label='Funded' value={run.fundedAmountMusd} />
              <CompactMetric label='Spent' value={run.spentAmountMusd} />
              <CompactMetric
                label='Available'
                value={run.availableAmountMusd}
              />
              <CompactMetric label='Planner' value={formatPlanner(run)} />
            </div>
          </div>
        </div>

        <div className='grid gap-4 p-5 sm:p-6 xl:grid-cols-[1fr_22rem]'>
          <div className='space-y-3'>
            <div className='flex items-start gap-3'>
              <span className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
                <RunStatusIcon className='h-5 w-5' aria-hidden />
              </span>
              <div className='min-w-0'>
                <p className='font-semibold'>
                  {agentRunStatusLabels[run.status]}
                </p>
                <p className='text-foreground/65 mt-1 text-sm leading-6'>
                  {agentRunStatusDetails[run.status]}
                </p>
              </div>
            </div>
            {run.status === 'failed' && completedPaidActions === 0 ? (
              <p className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-600 dark:text-red-300'>
                No paid tool completed with a receipt. Review the failed action
                diagnostics below, then retry after funding and provider health
                are confirmed.
              </p>
            ) : null}
            {status ? (
              <p
                className='border-border bg-muted/40 rounded-xl border p-3 text-sm leading-6 break-words'
                role='status'
              >
                {status}
              </p>
            ) : null}
          </div>

          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-2'>
              <Button
                onClick={fundRun}
                disabled={
                  isFunding ||
                  !['unfunded', 'funding_pending'].includes(run.fundingStatus)
                }
              >
                <WalletCards className='h-4 w-4' aria-hidden />
                {isFunding ? 'Funding' : 'Fund'}
              </Button>
              <Button onClick={executeRun} disabled={isRunning || !canRun}>
                <Play className='h-4 w-4' aria-hidden />
                {isRunning
                  ? 'Running'
                  : run.status === 'failed'
                    ? 'Retry'
                    : 'Run'}
              </Button>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <Button
                variant='outline'
                onClick={refundUnusedBudget}
                disabled={isRefunding || !canRefund}
              >
                <Undo2 className='h-4 w-4' aria-hidden />
                {isRefunding ? 'Refunding' : 'Refund'}
              </Button>
              <Button
                variant='outline'
                onClick={attestRun}
                disabled={
                  isAttesting ||
                  !['completed', 'attesting'].includes(run.status)
                }
              >
                <FileCheck2 className='h-4 w-4' aria-hidden />
                {isAttesting ? 'Writing' : 'Attest'}
              </Button>
            </div>
            {run.proof ? (
              <Link
                href={`/proofs/${run.proof.id}`}
                className={buttonClasses({
                  variant: 'primary',
                  size: 'md',
                  className: 'w-full'
                })}
              >
                <ExternalLink className='h-4 w-4' aria-hidden />
                Open proof
              </Link>
            ) : null}
            <p className='text-foreground/55 text-xs leading-5 break-all'>
              Connected wallet: {address ?? 'Not connected'}
            </p>
          </div>
        </div>
      </Card>

      <Card className='space-y-4'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <div className='text-primary flex items-center gap-2'>
              <Route className='h-5 w-5' aria-hidden />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase'>
                Tool calls
              </span>
            </div>
            <h3 className='mt-2 text-2xl font-semibold'>Execution timeline</h3>
          </div>
          <p className='text-foreground/55 text-sm'>
            {run.actions.length} selected, {completedPaidActions} completed with
            receipts
          </p>
        </div>
        {run.actions.length === 0 ? (
          <p className='text-foreground/65 rounded-xl border border-dashed p-5 text-sm leading-6'>
            Actions appear here after the planner chooses tools.
          </p>
        ) : (
          <div className='space-y-3'>
            {run.actions.map(action => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        )}
      </Card>

      <details className='group border-border/80 bg-card/80 overflow-hidden rounded-xl border'>
        <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden'>
          <span className='flex items-center gap-2 font-semibold'>
            <ShieldCheck className='text-primary h-4 w-4' aria-hidden />
            Run ledger and diagnostics
          </span>
          <span className='text-foreground/50 text-sm group-open:hidden'>
            Expand
          </span>
          <span className='text-foreground/50 hidden text-sm group-open:inline'>
            Collapse
          </span>
        </summary>
        <div className='border-border/70 grid gap-4 border-t p-5 lg:grid-cols-[0.9fr_1.1fr]'>
          <div className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <DetailLink
                label='Vault'
                value={run.vaultAddress}
                href={run.vaultExplorerUrl}
              />
              <DetailLink
                label='Funding tx'
                value={run.fundingTxHash}
                href={run.fundingExplorerUrl}
              />
              <DetailLink
                label='Approval tx'
                value={run.approvalTxHash}
                href={run.approvalExplorerUrl}
              />
              <DetailLink
                label='Refund tx'
                value={run.refundTxHash}
                href={run.refundExplorerUrl}
              />
            </div>
            <LedgerTimeline events={run.ledgerEvents} />
          </div>

          <div className='space-y-4'>
            {run.deliverables.skippedTools?.length ? (
              <SkippedTools tools={run.deliverables.skippedTools} />
            ) : null}
            <JsonViewer
              title='Planner and deliverable diagnostics'
              value={run.deliverables}
              defaultOpen={false}
              copyLabel='Copy diagnostics'
            />
          </div>
        </div>
      </details>

      <FinalOutputSection run={run} outputs={finalOutputs} />
    </div>
  )
}

function StatusPill({ status }: { status: AgentRun['status'] }) {
  const Icon = statusIcon(status)

  return (
    <span className='border-border bg-card inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold'>
      <Icon className='text-primary h-4 w-4' aria-hidden />
      {agentRunStatusLabels[status]}
    </span>
  )
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='border-border/70 bg-background/60 min-w-0 rounded-xl border p-3'>
      <p className='text-foreground/55 text-[0.68rem] font-semibold tracking-[0.14em] uppercase'>
        {label}
      </p>
      <p className='mt-1 truncate text-sm font-semibold sm:text-base'>
        {value}
      </p>
    </div>
  )
}

function DetailLink({
  label,
  value,
  href
}: {
  label: string
  value?: string | null
  href?: string | null
}) {
  return (
    <div className='border-border bg-background/60 rounded-lg border p-3'>
      <p className='text-foreground/60 text-xs tracking-[0.14em] uppercase'>
        {label}
      </p>
      {value ? (
        href ? (
          <a
            href={href}
            target='_blank'
            rel='noreferrer'
            className='text-primary mt-1 inline-flex max-w-full items-center gap-2 font-semibold break-all underline-offset-4 hover:underline'
          >
            {shorten(value)}
            <ExternalLink className='h-4 w-4 shrink-0' aria-hidden />
          </a>
        ) : (
          <p className='mt-1 font-semibold break-all'>{shorten(value)}</p>
        )
      ) : (
        <p className='text-foreground/50 mt-1 text-sm'>Not recorded yet</p>
      )}
    </div>
  )
}

function LedgerTimeline({ events }: { events: AgentLedgerEvent[] }) {
  if (events.length === 0) {
    return (
      <p className='text-foreground/65 border-border rounded-lg border border-dashed p-4 text-sm leading-6'>
        Funding and spend events appear here as the run moves through the vault.
      </p>
    )
  }

  return (
    <div className='space-y-3'>
      {events.map(event => (
        <div key={event.id} className='flex gap-3'>
          <span className='bg-primary/10 text-primary mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full'>
            <History className='h-3.5 w-3.5' aria-hidden />
          </span>
          <div className='min-w-0'>
            <p className='text-sm font-semibold'>{event.label}</p>
            <p className='text-foreground/55 text-xs'>
              {new Date(event.createdAt).toLocaleString()}
              {event.amountMusd ? ` - ${event.amountMusd}` : ''}
            </p>
            {event.explorerUrl && event.txHash ? (
              <a
                href={event.explorerUrl}
                target='_blank'
                rel='noreferrer'
                className='text-primary mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline'
              >
                {shorten(event.txHash)}
                <ExternalLink className='h-3.5 w-3.5' aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function SkippedTools({
  tools
}: {
  tools: NonNullable<AgentRun['deliverables']['skippedTools']>
}) {
  return (
    <details className='border-border/80 bg-card/75 overflow-hidden rounded-xl border'>
      <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden'>
        <span className='flex items-center gap-2 text-sm font-semibold'>
          <Route className='text-primary h-4 w-4' aria-hidden />
          Skipped tools
        </span>
        <span className='bg-muted rounded-full px-2 py-1 text-xs font-semibold'>
          {tools.length}
        </span>
      </summary>
      <div className='border-border/70 grid gap-3 border-t p-4'>
        {tools.map(tool => (
          <div
            key={tool.slug}
            className='border-border bg-muted/20 rounded-lg border p-3 text-sm'
          >
            <p className='font-semibold'>{tool.productName ?? tool.slug}</p>
            <p className='text-foreground/65 mt-1 leading-6'>{tool.reason}</p>
          </div>
        ))}
      </div>
    </details>
  )
}

function ActionCard({ action }: { action: AgentRun['actions'][number] }) {
  const Icon =
    action.status === 'completed'
      ? CheckCircle2
      : action.status === 'failed'
        ? AlertTriangle
        : Clock
  const outputItems = getActionOutputItems(action)
  const requestUrl =
    action.requestUrl ?? `/api/x402/products/${action.productSlug}/call`
  const requestMethod = action.requestMethod ?? 'POST'
  const responseValue = action.toolResponsePayload ?? action.responsePayload

  return (
    <div className='border-border/80 bg-background/55 rounded-xl border p-4'>
      <div className='grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start'>
        <div className='min-w-0 space-y-2'>
          <div className='flex items-center gap-2'>
            <Icon className='text-primary h-4 w-4' aria-hidden />
            <p className='font-semibold'>{action.productName}</p>
          </div>
          <div className='text-foreground/60 flex flex-wrap gap-x-3 gap-y-1 text-sm'>
            <span>{action.providerName}</span>
            <span>{action.amountMusd}</span>
            {action.requestId ? <span>{shorten(action.requestId)}</span> : null}
          </div>
        </div>
        <div className='flex flex-wrap gap-2 lg:justify-end'>
          <span className='bg-muted rounded-full px-3 py-1 text-xs font-semibold'>
            {agentActionStatusLabels[action.status]}
          </span>
          {action.receipt ? (
            <Link
              href={`/receipts/${action.receipt.id}`}
              className='border-border text-primary rounded-full border px-3 py-1 text-xs font-semibold underline-offset-4 hover:underline'
            >
              Receipt
            </Link>
          ) : null}
          {action.receipt?.explorerUrl ? (
            <a
              href={action.receipt.explorerUrl}
              target='_blank'
              rel='noreferrer'
              className='border-border text-primary rounded-full border px-3 py-1 text-xs font-semibold underline-offset-4 hover:underline'
            >
              Settlement
            </a>
          ) : null}
        </div>
      </div>

      {outputItems.length ? (
        <div className='mt-3 flex flex-wrap gap-2'>
          {outputItems.map(item => (
            <OutputChip key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {action.errorMessage ? (
        <p className='mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-600 dark:text-red-300'>
          {action.errorMessage}
        </p>
      ) : null}

      <details className='border-border/70 bg-muted/20 mt-3 overflow-hidden rounded-lg border'>
        <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden'>
          Request, response, and planner notes
          <span className='text-foreground/45 text-xs'>Diagnostics</span>
        </summary>
        <div className='border-border/70 grid gap-3 border-t p-3'>
          {action.planningRationale ? (
            <div className='text-sm'>
              <p className='font-semibold'>Planner rationale</p>
              <p className='text-foreground/65 mt-1 leading-6'>
                {action.planningRationale}
              </p>
            </div>
          ) : null}
          <JsonViewer
            title='Tool request'
            value={{
              method: requestMethod,
              url: requestUrl,
              body: action.requestPayload
            }}
            defaultOpen={false}
            copyLabel='Copy request'
          />
          {responseValue ? (
            <JsonViewer
              title='Tool response'
              value={responseValue}
              defaultOpen={false}
              copyLabel='Copy response'
            />
          ) : (
            <div className='border-border/80 bg-card/75 rounded-xl border p-4 text-sm'>
              <p className='font-semibold'>Tool response</p>
              <p className='text-foreground/60 mt-1 leading-6'>
                No response body was recorded for this action yet.
              </p>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}

function OutputChip({ item }: { item: AgentOutputItem }) {
  const Icon =
    item.kind === 'video'
      ? Video
      : item.kind === 'image'
        ? ImageIcon
        : item.kind === 'text'
          ? FileText
          : LinkIcon

  if (!item.url) {
    return (
      <span className='border-border bg-card inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold'>
        <Icon className='text-primary h-3.5 w-3.5' aria-hidden />
        {item.title}
      </span>
    )
  }

  return (
    <a
      href={item.url}
      target='_blank'
      rel='noreferrer'
      className='border-border bg-card text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold underline-offset-4 hover:underline'
    >
      <Icon className='h-3.5 w-3.5' aria-hidden />
      {item.title}
    </a>
  )
}

type AgentOutputItem = {
  id: string
  title: string
  kind: 'video' | 'image' | 'link' | 'text'
  url?: string
  value?: string
  source?: string
}

function FinalOutputSection({
  run,
  outputs
}: {
  run: AgentRun
  outputs: AgentOutputItem[]
}) {
  const textOutput = buildTextFinalOutput(run)

  return (
    <Card className='space-y-5 overflow-hidden'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='text-primary flex items-center gap-2'>
            <Sparkles className='h-5 w-5' aria-hidden />
            <span className='text-xs font-semibold tracking-[0.18em] uppercase'>
              Final output
            </span>
          </div>
          <h3 className='mt-2 text-2xl font-semibold'>Agent deliverables</h3>
          <p className='text-foreground/60 mt-1 max-w-3xl text-sm leading-6'>
            Completed tool outputs are rendered here as media, project links, or
            synthesized text so the run shows the actual deliverable instead of
            only execution notes.
          </p>
        </div>
        <StatusPill status={run.status} />
      </div>

      {outputs.length ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {outputs.map(item => (
            <OutputPreview key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {textOutput ? (
        <div className='border-border bg-background/60 rounded-xl border p-4'>
          <div className='mb-3 flex items-center gap-2'>
            <FileText className='text-primary h-4 w-4' aria-hidden />
            <p className='font-semibold'>Synthesized result</p>
          </div>
          <MarkdownViewer
            value={textOutput}
            className='max-h-[34rem] overflow-auto pr-2'
          />
        </div>
      ) : null}

      {!outputs.length && !textOutput ? (
        <div className='border-border rounded-xl border border-dashed p-6'>
          <p className='font-semibold'>No final output yet</p>
          <p className='text-foreground/60 mt-1 text-sm leading-6'>
            Run the agent or retry failed tools. Completed actions with result
            URLs, media URLs, or synthesized text will appear here.
          </p>
        </div>
      ) : null}
    </Card>
  )
}

function OutputPreview({
  item,
  compact = false
}: {
  item: AgentOutputItem
  compact?: boolean
}) {
  const Icon =
    item.kind === 'video'
      ? Video
      : item.kind === 'image'
        ? ImageIcon
        : item.kind === 'text'
          ? FileText
          : LinkIcon

  return (
    <div className='border-border bg-card/70 overflow-hidden rounded-xl border'>
      <div className='border-border/70 flex items-start justify-between gap-3 border-b p-4'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <Icon className='text-primary h-4 w-4 shrink-0' aria-hidden />
            <p className='font-semibold'>{item.title}</p>
          </div>
          {item.source ? (
            <p className='text-foreground/55 mt-1 text-xs'>{item.source}</p>
          ) : null}
        </div>
        {item.url ? (
          <a
            href={item.url}
            target='_blank'
            rel='noreferrer'
            className='text-primary inline-flex shrink-0 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline'
          >
            Open
            <ExternalLink className='h-3.5 w-3.5' aria-hidden />
          </a>
        ) : null}
      </div>
      <div className='p-4'>
        {item.kind === 'video' && item.url ? (
          <video
            controls
            className='bg-background aspect-video w-full rounded-lg border object-contain'
            src={item.url}
          >
            <track kind='captions' />
          </video>
        ) : null}
        {item.kind === 'image' && item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.title}
            className='bg-background max-h-[28rem] w-full rounded-lg border object-contain'
          />
        ) : null}
        {item.kind === 'link' && item.url ? (
          <a
            href={item.url}
            target='_blank'
            rel='noreferrer'
            className='text-primary block rounded-lg border p-3 text-sm font-semibold break-all underline-offset-4 hover:underline'
          >
            {item.url}
          </a>
        ) : null}
        {item.kind === 'text' && item.value ? (
          compact ? (
            <p className='text-foreground/70 line-clamp-5 text-sm leading-6'>
              {item.value}
            </p>
          ) : (
            <MarkdownViewer value={item.value} />
          )
        ) : null}
      </div>
    </div>
  )
}

function formatPlanner(run: AgentRun) {
  const mode = run.deliverables.plannerMode

  if (mode === 'openai') {
    return `OpenAI ${run.deliverables.plannerModel ?? 'model'}`
  }

  if (mode === 'deterministic') {
    return 'Deterministic fallback'
  }

  return 'Pending'
}

function statusIcon(status: AgentRun['status']) {
  if (['completed', 'attested'].includes(status)) {
    return CheckCircle2
  }

  if (['failed'].includes(status)) {
    return AlertTriangle
  }

  if (['running', 'attesting'].includes(status)) {
    return Clock
  }

  return Bot
}

function getFinalOutputItems(run: AgentRun): AgentOutputItem[] {
  const seen = new Set<string>()
  const items: AgentOutputItem[] = []

  for (const action of run.actions) {
    if (action.status !== 'completed') {
      continue
    }

    for (const item of getActionOutputItems(action)) {
      const key = item.url ?? `${item.title}:${item.value}`

      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      items.push(item)
    }
  }

  const deliverableUrl = run.deliverables.videoResultUrl?.trim()

  if (deliverableUrl && !seen.has(deliverableUrl)) {
    seen.add(deliverableUrl)
    items.unshift(
      createUrlOutputItem({
        id: 'deliverable-video-result',
        title: 'Primary result',
        url: deliverableUrl,
        source: 'Synthesized deliverable'
      })
    )
  }

  return items
}

function getActionOutputItems(
  action: AgentRun['actions'][number]
): AgentOutputItem[] {
  const items = extractUrlOutputItems(action.responsePayload, {
    idPrefix: action.id,
    source: action.productName
  })
  const receiptUrl = action.receipt?.resultUrl?.trim()

  if (receiptUrl && !items.some(item => item.url === receiptUrl)) {
    items.unshift(
      createUrlOutputItem({
        id: `${action.id}:receipt-result`,
        title: 'Receipt result',
        url: receiptUrl,
        source: action.productName
      })
    )
  }

  const textSummary = getActionTextSummary(action)

  if (textSummary) {
    items.push({
      id: `${action.id}:text-summary`,
      title: 'Text output',
      kind: 'text',
      value: textSummary,
      source: action.productName
    })
  }

  return items
}

function extractUrlOutputItems(
  value: unknown,
  {
    idPrefix,
    source
  }: {
    idPrefix: string
    source: string
  }
) {
  const urls = new Map<string, string>()

  collectOutputUrls(value, [], urls)

  return Array.from(urls.entries()).map(([url, label], index) =>
    createUrlOutputItem({
      id: `${idPrefix}:url:${index}:${url}`,
      title: label,
      url,
      source
    })
  )
}

function collectOutputUrls(
  value: unknown,
  path: string[],
  urls: Map<string, string>,
  depth = 0
) {
  if (depth > 8 || value == null) {
    return
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (isDisplayableUrl(trimmed)) {
      urls.set(trimmed, labelFromPath(path))
      return
    }

    const parsed = tryParseJson(trimmed)

    if (parsed !== null) {
      collectOutputUrls(parsed, path, urls, depth + 1)
    }

    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectOutputUrls(item, [...path, String(index)], urls, depth + 1)
    )
    return
  }

  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>
    )) {
      collectOutputUrls(item, [...path, key], urls, depth + 1)
    }
  }
}

function createUrlOutputItem({
  id,
  title,
  url,
  source
}: {
  id: string
  title: string
  url: string
  source?: string
}): AgentOutputItem {
  return {
    id,
    title,
    kind: classifyOutputUrl(url),
    url,
    source
  }
}

function isDisplayableUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function classifyOutputUrl(url: string): AgentOutputItem['kind'] {
  if (isVideoUrl(url)) {
    return 'video'
  }

  if (isImageUrl(url)) {
    return 'image'
  }

  return 'link'
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url)
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i.test(url)
}

function labelFromPath(path: string[]) {
  const meaningfulKey = [...path]
    .reverse()
    .find(part => !/^\d+$/.test(part) && part.length > 0)

  if (!meaningfulKey) {
    return 'Result link'
  }

  return meaningfulKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function getActionTextSummary(action: AgentRun['actions'][number]) {
  const payload = action.responsePayload

  if (!payload) {
    return ''
  }

  const candidates = [
    readStringPath(payload, ['summary']),
    readStringPath(payload, ['message']),
    readStringPath(payload, ['text']),
    readStringPath(payload, ['answer']),
    readStringPath(payload, ['data', 'summary']),
    readStringPath(payload, ['data', 'message']),
    readStringPath(payload, ['result', 'summary']),
    readStringPath(payload, ['result', 'message'])
  ]

  return candidates.find(Boolean) ?? ''
}

function readStringPath(value: unknown, path: string[]) {
  let current = value

  for (const part of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return ''
    }

    current = (current as Record<string, unknown>)[part]
  }

  return typeof current === 'string' ? current.trim() : ''
}

function tryParseJson(value: string) {
  if (!value.startsWith('{') && !value.startsWith('[')) {
    return null
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function buildTextFinalOutput(run: AgentRun) {
  return [
    run.deliverables.launchBrief
      ? `## Launch brief\n\n${run.deliverables.launchBrief}`
      : '',
    run.deliverables.developerCopy
      ? `## Developer copy\n\n${run.deliverables.developerCopy}`
      : '',
    run.deliverables.marketSignal
      ? `## Market signal\n\n${run.deliverables.marketSignal}`
      : ''
  ]
    .filter(Boolean)
    .join('\n\n')
}

function shorten(value: string) {
  if (value.length <= 18) {
    return value
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`
}
