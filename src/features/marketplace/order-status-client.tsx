'use client'

import { useEffect, useState } from 'react'

import { decodePaymentRequiredHeader as decodeX402PaymentRequiredHeader } from '@x402/core/http'
import {
  createPermit2ApprovalTx,
  getPermit2AllowanceReadParams
} from '@x402/evm'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import type { PaymentRequired, x402PaymentResult } from '@x402/fetch'
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from '@x402/fetch'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  WalletCards
} from 'lucide-react'
import { prepareTransaction, sendTransaction } from 'thirdweb'
import { useActiveAccount } from 'thirdweb/react'
import { createPublicClient, formatUnits, http, parseAbi } from 'viem'
import { useWalletClient } from 'wagmi'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MarketplaceReceipt } from '@/features/marketplace/receipts'
import {
  orderStatusDetails,
  orderStatusLabels
} from '@/features/marketplace/status'
import type { MarketplaceOrder } from '@/features/marketplace/types'
import { defaultAppChain, getExplorerTransactionUrl } from '@/lib/config/chains'
import { walletProvider } from '@/lib/config/wallet'
import { cn } from '@/lib/utils/cn'
import { thirdwebActiveChain, thirdwebClient } from '@/lib/wallet/thirdweb'

type OrderStatusClientProps = {
  orderId: string
  initialOrder: MarketplaceOrder | null
}

export function OrderStatusClient({
  orderId,
  initialOrder
}: OrderStatusClientProps) {
  if (walletProvider === 'rainbow-kit') {
    return (
      <RainbowOrderStatusClient orderId={orderId} initialOrder={initialOrder} />
    )
  }

  return (
    <ThirdwebOrderStatusClient orderId={orderId} initialOrder={initialOrder} />
  )
}

type BrowserEvmSigner = {
  readonly address: `0x${string}`
  signTypedData(message: {
    domain: Record<string, unknown>
    types: Record<string, unknown>
    primaryType: string
    message: Record<string, unknown>
  }): Promise<`0x${string}`>
}

type Permit2ApprovalTransaction = {
  to: `0x${string}`
  data: `0x${string}`
}

type BrowserWalletControls = {
  signer: BrowserEvmSigner
  sendTransaction: (
    transaction: Permit2ApprovalTransaction
  ) => Promise<`0x${string}`>
}

type WalletStepId =
  | 'requirement'
  | 'allowance'
  | 'signature'
  | 'settlement'
  | 'result'

type WalletStepStatus = 'idle' | 'active' | 'complete' | 'error'

type WalletStep = {
  id: WalletStepId
  title: string
  description: string
  status: WalletStepStatus
  detail?: string
  txHash?: `0x${string}`
}

type PaymentRequirementInspection = {
  status: number
  statusText: string
  paymentRequired: PaymentRequired | null
  response: unknown
}

type PaidApiErrorBody = {
  error?: string
  message?: string
  reason?: string
  guidance?: string
  details?: unknown
  settlement?: {
    errorReason?: string
    errorMessage?: string
    transaction?: string
    network?: string
    status?: number
  }
}

const musdBalanceAbi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)'
])
const MUSD_DECIMALS = 18

const mezoPublicClient = createPublicClient({
  chain: defaultAppChain.viemChain,
  transport: http(defaultAppChain.viemChain.rpcUrls.default.http[0])
})

function RainbowOrderStatusClient(props: OrderStatusClientProps) {
  const { data: walletClient } = useWalletClient()

  return (
    <OrderStatusContent
      {...props}
      walletAddress={walletClient?.account?.address ?? null}
      walletLabel='RainbowKit wallet'
      getWalletControls={() => {
        if (!walletClient?.account) {
          return null
        }

        return {
          signer: {
            address: walletClient.account.address,
            signTypedData: message =>
              walletClient.signTypedData({
                account: walletClient.account,
                domain: message.domain,
                types: message.types,
                primaryType: message.primaryType,
                message: message.message
              } as Parameters<typeof walletClient.signTypedData>[0])
          },
          sendTransaction: transaction =>
            walletClient.sendTransaction({
              account: walletClient.account,
              chain: defaultAppChain.viemChain,
              to: transaction.to,
              data: transaction.data,
              value: 0n
            } as Parameters<typeof walletClient.sendTransaction>[0])
        } satisfies BrowserWalletControls
      }}
    />
  )
}

function ThirdwebOrderStatusClient(props: OrderStatusClientProps) {
  const account = useActiveAccount()

  return (
    <OrderStatusContent
      {...props}
      walletAddress={account?.address ?? null}
      walletLabel='Thirdweb wallet'
      getWalletControls={() => {
        if (!account?.address) {
          return null
        }

        return {
          signer: {
            address: account.address as `0x${string}`,
            signTypedData: message =>
              account.signTypedData(message as never) as Promise<`0x${string}`>
          },
          sendTransaction: async transaction => {
            if (!thirdwebClient) {
              throw new Error(
                'Thirdweb client is not configured for browser transactions.'
              )
            }

            const preparedTransaction = prepareTransaction({
              chain: thirdwebActiveChain,
              client: thirdwebClient,
              to: transaction.to,
              data: transaction.data,
              value: 0n
            })
            const receipt = await sendTransaction({
              account,
              transaction: preparedTransaction
            })

            return receipt.transactionHash as `0x${string}`
          }
        } satisfies BrowserWalletControls
      }}
    />
  )
}

function OrderStatusContent({
  orderId,
  initialOrder,
  walletAddress,
  walletLabel,
  getWalletControls
}: OrderStatusClientProps & {
  walletAddress: string | null
  walletLabel: string
  getWalletControls: () => BrowserWalletControls | null
}) {
  const [order, setOrder] = useState<MarketplaceOrder | null>(initialOrder)
  const [status, setStatus] = useState('')
  const [paymentRequirements, setPaymentRequirements] =
    useState<PaymentRequirementInspection | null>(null)
  const [walletSteps, setWalletSteps] =
    useState<WalletStep[]>(createWalletSteps)
  const [paymentError, setPaymentError] = useState('')
  const [isInspecting, setIsInspecting] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  useEffect(() => {
    if (order) {
      return
    }

    const saved = window.sessionStorage.getItem(`tollora:order:${orderId}`)

    if (saved) {
      setOrder(JSON.parse(saved) as MarketplaceOrder)
    }
  }, [order, orderId])

  async function inspectPaymentRequirement() {
    if (!order) {
      return
    }

    setIsInspecting(true)
    setStatus('')
    setPaymentError('')
    setPaymentRequirements(null)

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    try {
      const response = await fetch(
        `/api/x402/products/${order.productSlug}/call`,
        {
          method: 'POST',
          headers,
          body: order.requestPayloadJson ?? '{}'
        }
      )
      const body = (await readResponseBody(response)) as {
        error?: string
        order?: Partial<MarketplaceOrder>
        receipt?: MarketplaceReceipt
      }

      if (response.status === 402) {
        setPaymentRequirements({
          status: response.status,
          statusText: response.statusText,
          paymentRequired: decodePaymentRequiredHeader(response),
          response: body
        })
        setStatus(
          'Payment requirements returned. Use an x402 buyer client, backend, or agent runner to sign and settle this request.'
        )
        return
      }

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to run the paid API request.')
      }

      const receipt = body.receipt
        ? {
            ...body.receipt,
            orderId: order.id
          }
        : undefined
      const nextOrder: MarketplaceOrder = {
        ...order,
        ...body.order,
        id: order.id,
        status: (body.order?.status as MarketplaceOrder['status']) ?? 'paid',
        receiptId: receipt?.id,
        explorerUrl: receipt?.explorerUrl,
        updatedAt: new Date().toISOString()
      }

      window.sessionStorage.setItem(
        `tollora:order:${order.id}`,
        JSON.stringify(nextOrder)
      )

      if (receipt) {
        window.sessionStorage.setItem(
          `tollora:receipt:${receipt.id}`,
          JSON.stringify(receipt)
        )
      }

      setOrder(nextOrder)
      setStatus('MUSD payment settled and provider response returned.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to inspect payment requirements.'
      )
    } finally {
      setIsInspecting(false)
    }
  }

  function updateWalletStep(id: WalletStepId, update: Partial<WalletStep>) {
    setWalletSteps(current =>
      current.map(step => (step.id === id ? { ...step, ...update } : step))
    )
  }

  function failActiveWalletStep(message: string) {
    setWalletSteps(current => {
      const activeStep = current.find(step => step.status === 'active')

      if (!activeStep) {
        return current
      }

      return current.map(step =>
        step.id === activeStep.id
          ? {
              ...step,
              status: 'error',
              detail: message
            }
          : step
      )
    })
  }

  async function runWithWallet() {
    if (!order) {
      return
    }

    const walletControls = getWalletControls()

    if (!walletControls) {
      setStatus(`Connect a ${walletLabel} before running this paid API call.`)
      return
    }

    setIsPaying(true)
    setWalletSteps(createWalletSteps('requirement'))
    setStatus('Reading the x402 payment requirement from Tollora.')
    setPaymentError('')
    setPaymentRequirements(null)

    try {
      const initialRequirement = await requestPaymentRequirement(order)

      if (initialRequirement) {
        updateWalletStep('requirement', {
          status: 'complete',
          detail: 'Tollora returned a payable x402 requirement.'
        })
        setPaymentRequirements({
          status: initialRequirement.status,
          statusText: initialRequirement.statusText,
          paymentRequired: initialRequirement.paymentRequired,
          response: initialRequirement.body
        })
        await ensurePermit2Allowance(
          initialRequirement.paymentRequired,
          walletControls,
          message => setStatus(message),
          updateWalletStep
        )
      }

      updateWalletStep('signature', {
        status: 'active',
        detail: 'Confirm the x402 MUSD payment signature in your wallet.'
      })
      setStatus('Waiting for wallet signature and MUSD settlement.')

      const client = registerExactEvmScheme(new x402Client(), {
        signer: walletControls.signer
      })
      const httpClient = new x402HTTPClient(client)
      const fetchWithPayment = wrapFetchWithPayment(fetch, httpClient)
      const response = await fetchWithPayment(
        `/api/x402/products/${order.productSlug}/call`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Tollora-Order-Id': order.id
          },
          body: order.requestPayloadJson ?? '{}'
        }
      )
      const paymentResult = await httpClient
        .processResponse(response.clone())
        .catch(() => null)
      const body = (await readResponseBody(response)) as {
        error?: string
        message?: string
        reason?: string
        guidance?: string
        details?: unknown
        settlement?: PaidApiErrorBody['settlement']
        data?: unknown
        order?: Partial<MarketplaceOrder>
        receipt?: MarketplaceReceipt
        x402?: {
          transaction?: string
          network?: string
        }
      }

      if (response.status === 402) {
        const nextPaymentRequired = decodePaymentRequiredHeader(response)

        if (!nextPaymentRequired) {
          throw new Error(buildPaidRequestError(response, body, paymentResult))
        }

        setPaymentRequirements({
          status: response.status,
          statusText: response.statusText,
          paymentRequired: nextPaymentRequired,
          response: body
        })
        throw new Error(
          body.error ??
            'Wallet payment was not completed. Check MUSD balance, network, and signature approval.'
        )
      }

      if (!response.ok) {
        throw new Error(buildPaidRequestError(response, body, paymentResult))
      }

      const settlement =
        paymentResult?.kind === 'success'
          ? paymentResult.settleResponse
          : getSettleResponseOrNull(httpClient, response)
      const settlementTxHash =
        settlement?.transaction ||
        body.x402?.transaction ||
        body.receipt?.txHash

      updateWalletStep('signature', {
        status: 'complete',
        detail: 'Wallet signed the x402 payment payload.'
      })
      updateWalletStep('settlement', {
        status: 'complete',
        detail: settlementTxHash
          ? 'MUSD settled on Mezo Testnet.'
          : 'MUSD settled and Tollora received the paid response.',
        txHash: isHexTransactionHash(settlementTxHash)
          ? settlementTxHash
          : undefined
      })
      updateWalletStep('result', {
        status: 'complete',
        detail: 'Provider response and receipt were saved.'
      })
      const receipt = body.receipt
        ? {
            ...body.receipt,
            orderId: order.id
          }
        : undefined
      const nextOrder: MarketplaceOrder = {
        ...order,
        ...body.order,
        id: order.id,
        buyerWallet: receipt?.buyerWallet ?? walletControls.signer.address,
        status:
          (body.order?.status as MarketplaceOrder['status']) ?? 'completed',
        receiptId: receipt?.id,
        explorerUrl: receipt?.explorerUrl,
        responsePayload: body.data,
        resultUrl: receipt?.resultUrl ?? body.order?.resultUrl,
        updatedAt: new Date().toISOString()
      }

      window.sessionStorage.setItem(
        `tollora:order:${order.id}`,
        JSON.stringify(nextOrder)
      )

      if (receipt) {
        window.sessionStorage.setItem(
          `tollora:receipt:${receipt.id}`,
          JSON.stringify(receipt)
        )
      }

      setOrder(nextOrder)
      setStatus(
        settlementTxHash
          ? `MUSD payment settled on Mezo. Transaction: ${settlementTxHash}`
          : 'MUSD payment settled and provider response returned.'
      )
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to run the paid API request.'

      setPaymentError(message)
      setStatus(message)
      failActiveWalletStep(message)
    } finally {
      setIsPaying(false)
    }
  }

  async function pollProviderStatus() {
    if (!order?.externalJobId) {
      return
    }

    setIsPolling(true)
    setStatus('Checking provider job status.')

    try {
      const response = await fetch(`/api/orders/${order.id}/provider-status`, {
        headers: {
          Accept: 'application/json'
        }
      })
      const body = (await readResponseBody(response)) as {
        error?: string
        order?: MarketplaceOrder
      }

      if (!response.ok || !body.order) {
        throw new Error(body.error ?? 'Unable to refresh provider job status.')
      }

      setOrder(body.order)
      window.sessionStorage.setItem(
        `tollora:order:${body.order.id}`,
        JSON.stringify(body.order)
      )
      setStatus(
        body.order.status === 'completed'
          ? 'Provider job completed. The API response is ready.'
          : `Provider job is ${orderStatusLabels[body.order.status].toLowerCase()}.`
      )
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to refresh provider job status.'
      )
    } finally {
      setIsPolling(false)
    }
  }

  async function claimMeteredResult() {
    if (!order || order.status !== 'delta_payment_required') {
      return
    }

    const walletControls = getWalletControls()

    if (!walletControls) {
      setStatus(`Connect a ${walletLabel} before claiming this result.`)
      return
    }

    setIsClaiming(true)
    setPaymentError('')
    setStatus('Reading the metered delta payment requirement.')

    try {
      const initialRequirement = await requestClaimPaymentRequirement(order)

      if (initialRequirement) {
        setPaymentRequirements({
          status: initialRequirement.status,
          statusText: initialRequirement.statusText,
          paymentRequired: initialRequirement.paymentRequired,
          response: initialRequirement.body
        })
        await ensurePermit2Allowance(
          initialRequirement.paymentRequired,
          walletControls,
          message => setStatus(message),
          updateWalletStep
        )
      }

      const client = registerExactEvmScheme(new x402Client(), {
        signer: walletControls.signer
      })
      const httpClient = new x402HTTPClient(client)
      const fetchWithPayment = wrapFetchWithPayment(fetch, httpClient)
      const response = await fetchWithPayment(
        `/api/x402/orders/${order.id}/claim`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json'
          }
        }
      )
      const paymentResult = await httpClient
        .processResponse(response.clone())
        .catch(() => null)
      const body = (await readResponseBody(response)) as {
        error?: string
        order?: Partial<MarketplaceOrder>
        receipt?: MarketplaceReceipt
        data?: unknown
        x402?: {
          transaction?: string
          network?: string
        }
      }

      if (!response.ok) {
        throw new Error(buildPaidRequestError(response, body, paymentResult))
      }

      const receipt = body.receipt
      const nextOrder: MarketplaceOrder = {
        ...order,
        ...body.order,
        id: order.id,
        status: 'completed',
        resultReleaseStatus: 'released',
        receiptId: receipt?.id ?? order.receiptId,
        explorerUrl: receipt?.explorerUrl ?? order.explorerUrl,
        responsePayload: body.data ?? body.order?.responsePayload,
        resultUrl: receipt?.resultUrl ?? body.order?.resultUrl,
        updatedAt: new Date().toISOString()
      }

      window.sessionStorage.setItem(
        `tollora:order:${order.id}`,
        JSON.stringify(nextOrder)
      )

      if (receipt) {
        window.sessionStorage.setItem(
          `tollora:receipt:${receipt.id}`,
          JSON.stringify(receipt)
        )
      }

      setOrder(nextOrder)
      setStatus(
        receipt?.txHash
          ? `Metered delta settled on Mezo. Transaction: ${receipt.txHash}`
          : 'Metered delta settled and the provider result is released.'
      )
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to claim the metered result.'

      setPaymentError(message)
      setStatus(message)
    } finally {
      setIsClaiming(false)
    }
  }

  if (!order) {
    return (
      <div>
        <p className='font-semibold'>Order not found</p>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          The order record is not available in the current browser session.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]'>
        <Card className='space-y-5 p-5 sm:p-6 lg:p-8'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <WalletCards className='text-primary h-5 w-5' aria-hidden />
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  Payment console
                </p>
              </div>
              <h2 className='mt-3 text-2xl font-semibold'>
                {order.status === 'payment_required'
                  ? 'Pay this API call with your wallet'
                  : 'Payment and provider call'}
              </h2>
              <p className='text-foreground/70 mt-2 max-w-3xl text-base leading-7'>
                Tollora reads the x402 price, prepares MUSD, signs the payment,
                settles on Mezo, then returns either a direct API response or an
                async provider job to poll.
              </p>
            </div>
            <Badge className='w-fit'>Mezo MUSD x402</Badge>
          </div>

          <PaymentStepList steps={walletSteps} />

          <div className='border-foreground/10 bg-background/40 flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='min-w-0'>
              <p className='text-foreground/60 text-xs uppercase'>
                Connected signer
              </p>
              <p className='mt-1 font-semibold break-all'>
                {walletAddress ??
                  `Connect a ${walletLabel} to pay from the site`}
              </p>
              <StatusMessage status={status} explorerUrl={order.explorerUrl} />
            </div>
            <div className='flex shrink-0 flex-col gap-2 sm:flex-row'>
              <Button
                onClick={runWithWallet}
                disabled={order.status !== 'payment_required' || isPaying}
              >
                {isPaying ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                    Running
                  </>
                ) : order.status === 'payment_required' ? (
                  'Run with wallet'
                ) : (
                  'Payment complete'
                )}
              </Button>
              <Button
                variant='outline'
                onClick={inspectPaymentRequirement}
                disabled={order.status !== 'payment_required' || isInspecting}
              >
                {isInspecting ? 'Checking quote' : 'Inspect quote'}
              </Button>
            </div>
          </div>
        </Card>

        <OrderSnapshotCard order={order} />
      </div>

      {paymentRequirements ? (
        <PaymentRequirementCard inspection={paymentRequirements} />
      ) : null}
      {paymentError ? <PaymentErrorCard message={paymentError} /> : null}

      <ProviderResponsePanel
        order={order}
        isPolling={isPolling}
        onPoll={pollProviderStatus}
        isClaiming={isClaiming}
        onClaim={claimMeteredResult}
      />

      <SettlementLinks order={order} />
      <OrderMetadataGrid order={order} />
    </div>
  )
}

function createWalletSteps(activeStep?: WalletStepId): WalletStep[] {
  const steps: Array<Omit<WalletStep, 'status'>> = [
    {
      id: 'requirement',
      title: 'Read x402 price',
      description: 'Fetch the payable MUSD requirement from Tollora.'
    },
    {
      id: 'allowance',
      title: 'Prepare MUSD',
      description: 'Check balance and approve Permit2 when required.'
    },
    {
      id: 'signature',
      title: 'Sign payment',
      description: 'Confirm the x402 payment signature in your wallet.'
    },
    {
      id: 'settlement',
      title: 'Settle on Mezo',
      description: 'The facilitator submits settlement on-chain.'
    },
    {
      id: 'result',
      title: 'Receive result',
      description: 'Tollora returns the provider response and receipt.'
    }
  ]

  return steps.map(step => ({
    ...step,
    status: step.id === activeStep ? 'active' : 'idle'
  }))
}

function PaymentStepList({ steps }: { steps: WalletStep[] }) {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      {steps.map(step => (
        <div
          key={step.id}
          className={cn(
            'border-foreground/10 bg-background/40 rounded-lg border p-4',
            step.status === 'active' && 'border-brand-cyan/50 bg-accent/10',
            step.status === 'complete' && 'border-emerald-500/35',
            step.status === 'error' && 'border-destructive/50 bg-destructive/10'
          )}
        >
          <div className='flex items-center gap-2'>
            <StepIcon status={step.status} />
            <p className='text-sm font-semibold'>{step.title}</p>
          </div>
          <p className='text-foreground/60 mt-2 text-xs leading-5'>
            {step.detail ?? step.description}
          </p>
          {step.txHash ? (
            <a
              className='text-primary mt-3 inline-flex max-w-full items-center gap-1 text-xs font-semibold break-all underline-offset-4 hover:underline'
              href={
                getExplorerTransactionUrl(step.txHash, defaultAppChain.id) ??
                '#'
              }
              target='_blank'
              rel='noreferrer'
            >
              View transaction
              <ExternalLink className='h-3.5 w-3.5 shrink-0' aria-hidden />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function OrderSnapshotCard({ order }: { order: MarketplaceOrder }) {
  return (
    <Card className='space-y-4 p-5 sm:p-6'>
      <div>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Current state
        </p>
        <h2 className='mt-2 text-2xl font-semibold'>
          {orderStatusLabels[order.status]}
        </h2>
        <p className='text-foreground/70 mt-2 text-sm leading-6'>
          {orderStatusDetails[order.status]}
        </p>
      </div>
      <div className='grid gap-3 text-sm'>
        <SummaryTile label='Product' value={order.productName} />
        <SummaryTile
          label='Quoted amount'
          value={order.quotedAmountMusd ?? order.amountMusd}
        />
        <SummaryTile
          label='Paid or reserved'
          value={order.paidAmountMusd ?? order.reservedAmountMusd ?? 'Pending'}
        />
        {order.actualAmountMusd ? (
          <SummaryTile label='Final usage' value={order.actualAmountMusd} />
        ) : null}
        {order.deltaAmountMusd && order.deltaAmountMusd !== '0.00 MUSD' ? (
          <SummaryTile label='Delta' value={order.deltaAmountMusd} />
        ) : null}
        <SummaryTile label='Provider' value={order.providerName} />
        <SummaryTile label='Request ID' value={order.requestId} />
      </div>
    </Card>
  )
}

function StatusMessage({
  status,
  explorerUrl
}: {
  status: string
  explorerUrl?: string | null
}) {
  if (!status) {
    return (
      <p className='text-foreground/60 mt-3 text-sm leading-6'>
        First-time wallets may need one MUSD approval transaction before the
        x402 payment signature.
      </p>
    )
  }

  return (
    <div className='text-foreground/70 mt-3 space-y-2 text-sm leading-6'>
      <p>{status.replace(/ Transaction: .+$/, '.')}</p>
      {explorerUrl ? (
        <a
          className='text-primary inline-flex max-w-full items-center gap-1 font-semibold break-all underline-offset-4 hover:underline'
          href={explorerUrl}
          target='_blank'
          rel='noreferrer'
        >
          Open settlement transaction
          <ExternalLink className='h-3.5 w-3.5 shrink-0' aria-hidden />
        </a>
      ) : null}
    </div>
  )
}

function ProviderResponsePanel({
  order,
  isPolling,
  onPoll,
  isClaiming,
  onClaim
}: {
  order: MarketplaceOrder
  isPolling: boolean
  onPoll: () => Promise<void>
  isClaiming: boolean
  onClaim: () => Promise<void>
}) {
  const hasAsyncJob = Boolean(order.externalJobId)
  const hasResponse = Boolean(order.responsePayload)
  const needsDeltaPayment =
    order.status === 'delta_payment_required' ||
    order.resultReleaseStatus === 'delta_payment_required'

  return (
    <Card className='space-y-5 p-5 sm:p-6 lg:p-8'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            API response
          </p>
          <h2 className='mt-2 text-2xl font-semibold'>
            {hasAsyncJob && order.status !== 'completed'
              ? 'Async job accepted'
              : hasResponse
                ? 'Provider response received'
                : 'No provider response yet'}
          </h2>
          <p className='text-foreground/70 mt-2 max-w-3xl text-base leading-7'>
            {needsDeltaPayment
              ? 'The provider finished processing, but final usage exceeded the prepaid quote. Pay the metered delta to reveal the result.'
              : hasAsyncJob && order.status !== 'completed'
                ? 'This API started a long-running provider job. Poll the job until it completes, or wait for the provider webhook to update the order.'
                : hasResponse
                  ? 'This is the paid response returned by the provider adapter after x402 settlement.'
                  : 'Run the paid request to receive either a direct result or an async job id.'}
          </p>
        </div>
        {hasAsyncJob ? (
          <Badge className='w-fit'>Async provider job</Badge>
        ) : null}
      </div>

      {hasAsyncJob ? (
        <div className='grid gap-3 md:grid-cols-3'>
          <SummaryTile label='Job ID' value={order.externalJobId ?? ''} />
          <SummaryTile
            label='Job status'
            value={orderStatusLabels[order.status]}
          />
          <div className='border-foreground/10 rounded-lg border p-3'>
            <p className='text-foreground/60 text-xs uppercase'>Result link</p>
            {order.resultUrl ? (
              <a
                className='text-primary mt-1 inline-flex max-w-full items-center gap-1 font-semibold break-all underline-offset-4 hover:underline'
                href={order.resultUrl}
                target='_blank'
                rel='noreferrer'
              >
                Open result
                <ExternalLink className='h-3.5 w-3.5 shrink-0' aria-hidden />
              </a>
            ) : (
              <p className='text-foreground/65 mt-1 font-semibold'>
                Not available yet
              </p>
            )}
          </div>
        </div>
      ) : null}

      {hasAsyncJob ? (
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
          <Button onClick={onPoll} disabled={isPolling || needsDeltaPayment}>
            {isPolling ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                Polling status
              </>
            ) : (
              'Poll provider status'
            )}
          </Button>
          <p className='text-foreground/60 text-sm leading-6'>
            Long-running APIs should return quickly with a job id, then expose a
            status endpoint or webhook for completion.
          </p>
        </div>
      ) : null}

      {needsDeltaPayment ? (
        <div className='border-primary/30 bg-primary/10 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='font-semibold'>Metered delta required</p>
            <p className='text-foreground/70 mt-1 text-sm leading-6'>
              Final usage is {order.actualAmountMusd ?? 'above the quote'}. Pay
              the remaining {order.deltaAmountMusd ?? 'MUSD'} to unlock the
              completed provider response.
            </p>
          </div>
          <Button onClick={onClaim} disabled={isClaiming}>
            {isClaiming ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                Claiming result
              </>
            ) : (
              'Pay delta and reveal'
            )}
          </Button>
        </div>
      ) : null}

      {hasResponse ? (
        <pre className='bg-muted max-h-[32rem] overflow-auto rounded-lg p-4 text-sm leading-6 whitespace-pre-wrap'>
          {JSON.stringify(order.responsePayload, null, 2)}
        </pre>
      ) : (
        <div className='border-foreground/10 bg-background/40 rounded-lg border p-5 text-sm leading-6'>
          The response panel will show the JSON returned by the provider
          adapter. For async products, the first response is usually a job
          object; the final output appears after polling or webhook completion.
        </div>
      )}
    </Card>
  )
}

function SettlementLinks({ order }: { order: MarketplaceOrder }) {
  if (!order.receiptId && !order.explorerUrl && !order.agentRunId) {
    return null
  }

  const txHash = getTransactionHashFromExplorerUrl(order.explorerUrl)

  return (
    <Card className='grid gap-3 p-5 text-sm md:grid-cols-2 lg:grid-cols-3'>
      {order.receiptId ? (
        <div className='border-foreground/10 rounded-lg border p-4'>
          <p className='text-foreground/60 text-xs uppercase'>Receipt</p>
          <a
            className='text-primary mt-1 block font-semibold break-all underline-offset-4 hover:underline'
            href={`/receipts/${order.receiptId}`}
          >
            {order.receiptId}
          </a>
        </div>
      ) : null}
      {order.explorerUrl ? (
        <div className='border-foreground/10 rounded-lg border p-4'>
          <p className='text-foreground/60 text-xs uppercase'>
            Mezo transaction
          </p>
          <a
            className='text-primary mt-1 inline-flex max-w-full items-center gap-1 font-semibold break-all underline-offset-4 hover:underline'
            href={order.explorerUrl}
            target='_blank'
            rel='noreferrer'
          >
            {txHash ? shortenHash(txHash) : 'Open on explorer'}
            <ExternalLink className='h-3.5 w-3.5 shrink-0' aria-hidden />
          </a>
        </div>
      ) : null}
      {order.agentRunId ? (
        <div className='border-foreground/10 rounded-lg border p-4'>
          <p className='text-foreground/60 text-xs uppercase'>Agent run</p>
          <a
            className='text-primary mt-1 block font-semibold break-all underline-offset-4 hover:underline'
            href={`/agents/${order.agentRunId}`}
          >
            {order.agentRunId}
          </a>
        </div>
      ) : null}
    </Card>
  )
}

function OrderMetadataGrid({ order }: { order: MarketplaceOrder }) {
  return (
    <Card className='grid gap-3 p-5 text-sm md:grid-cols-2 xl:grid-cols-3'>
      {[
        ['Order ID', order.id],
        ['Request ID', order.requestId],
        ['Provider wallet', order.providerWallet ?? ''],
        ['Buyer wallet', order.buyerWallet],
        ['Pricing source', order.pricingSource ?? 'fixed'],
        ['Result release', order.resultReleaseStatus ?? 'not_applicable'],
        ['Created', new Date(order.createdAt).toLocaleString()],
        ['Updated', new Date(order.updatedAt).toLocaleString()]
      ].map(([label, value]) => (
        <SummaryTile key={label} label={label} value={value} />
      ))}
    </Card>
  )
}

function StepIcon({ status }: { status: WalletStepStatus }) {
  if (status === 'active') {
    return <Loader2 className='text-primary h-4 w-4 animate-spin' aria-hidden />
  }

  if (status === 'complete') {
    return <CheckCircle2 className='h-4 w-4 text-emerald-500' aria-hidden />
  }

  if (status === 'error') {
    return <AlertTriangle className='text-destructive h-4 w-4' aria-hidden />
  }

  return (
    <span
      className='border-foreground/25 block h-4 w-4 rounded-full border'
      aria-hidden
    />
  )
}

function PaymentRequirementCard({
  inspection
}: {
  inspection: PaymentRequirementInspection
}) {
  const requirement = inspection.paymentRequired?.accepts[0]

  return (
    <Card className='space-y-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Payment quote
          </p>
          <h2 className='mt-2 text-lg font-semibold'>
            {requirement
              ? `${formatMusdAmount(BigInt(requirement.amount))} MUSD required`
              : 'x402 payment requirement returned'}
          </h2>
        </div>
        <Badge className='w-fit'>{inspection.status} Payment Required</Badge>
      </div>
      {requirement ? (
        <div className='grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4'>
          <SummaryTile label='Network' value={requirement.network} />
          <SummaryTile label='Scheme' value={requirement.scheme} />
          <SummaryTile label='Asset' value={requirement.asset} />
          <SummaryTile label='Pay to' value={requirement.payTo} />
        </div>
      ) : null}
      <details className='border-foreground/10 rounded-lg border p-4'>
        <summary className='cursor-pointer text-sm font-semibold'>
          Raw x402 requirement JSON
        </summary>
        <pre className='bg-muted mt-4 max-h-80 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {JSON.stringify(inspection, null, 2)}
        </pre>
      </details>
    </Card>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className='border-foreground/10 rounded-lg border p-3'>
      <p className='text-foreground/60 text-xs uppercase'>{label}</p>
      <p className='mt-1 font-semibold break-all'>{value}</p>
    </div>
  )
}

function PaymentErrorCard({ message }: { message: string }) {
  return (
    <Card className='border-destructive/45 bg-destructive/10'>
      <div className='flex gap-3'>
        <AlertTriangle className='text-destructive mt-0.5 h-5 w-5 shrink-0' />
        <div>
          <p className='font-semibold'>Payment did not settle</p>
          <p className='text-foreground/70 mt-2 text-sm leading-6'>{message}</p>
        </div>
      </div>
    </Card>
  )
}

function getSettleResponseOrNull(
  httpClient: x402HTTPClient,
  response: Response
) {
  try {
    return httpClient.getPaymentSettleResponse(name =>
      response.headers.get(name)
    )
  } catch {
    return null
  }
}

function buildPaidRequestError(
  response: Response,
  body: {
    error?: string
    message?: string
    reason?: string
    guidance?: string
    details?: unknown
    settlement?: PaidApiErrorBody['settlement']
  },
  paymentResult: x402PaymentResult | null
) {
  const paymentRequired = decodePaymentRequiredHeader(response)

  if (
    response.status === 412 ||
    paymentRequired?.error === 'permit2_allowance_required'
  ) {
    return [
      'Mezo MUSD settlement still needs Permit2 allowance or sufficient wallet funds.',
      'Approve the MUSD allowance when prompted, then confirm the wallet has enough MUSD and BTC gas on Mezo Testnet.'
    ].join(' ')
  }

  if (
    paymentResult?.kind === 'error' &&
    isPaidApiErrorBody(paymentResult.body)
  ) {
    return formatPaidApiError(paymentResult.body, response)
  }

  if (paymentResult?.kind === 'settle_failed') {
    return (
      [
        paymentResult.settleResponse.errorMessage,
        paymentResult.settleResponse.errorReason
      ]
        .filter(Boolean)
        .join(' ') || 'MUSD settlement failed.'
    )
  }

  if (paymentResult?.kind === 'payment_required') {
    return (
      paymentResult.paymentRequired.error ??
      'Payment was not accepted by the x402 facilitator.'
    )
  }

  const message = formatPaidApiError(body, response)

  return message
    ? message
    : `Paid API request failed (${response.status} ${response.statusText}).`
}

function formatPaidApiError(body: PaidApiErrorBody, response: Response) {
  const details =
    typeof body.details === 'string'
      ? body.details
      : body.details
        ? JSON.stringify(body.details)
        : ''
  const settlementReason =
    body.settlement?.errorMessage ?? body.settlement?.errorReason
  const parts = [
    body.error,
    body.message,
    settlementReason,
    body.reason,
    details,
    body.guidance
  ].filter((part): part is string => Boolean(part))

  if (parts.length === 0) {
    return ''
  }

  return `${dedupeText(parts).join(' ')} (${response.status} ${
    response.statusText
  }).`
}

function dedupeText(parts: string[]) {
  return parts.filter((part, index) => parts.indexOf(part) === index)
}

function isPaidApiErrorBody(value: unknown): value is PaidApiErrorBody {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

async function requestPaymentRequirement(order: MarketplaceOrder) {
  const response = await fetch(`/api/x402/products/${order.productSlug}/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Tollora-Order-Id': order.id
    },
    body: order.requestPayloadJson ?? '{}'
  })

  if (response.status !== 402) {
    return null
  }

  const body = await readResponseBody(response)
  const paymentRequired = decodePaymentRequiredHeader(response)

  if (!paymentRequired) {
    throw new Error('Tollora did not return a readable x402 requirement.')
  }

  return {
    status: response.status,
    statusText: response.statusText,
    paymentRequired,
    body
  }
}

async function requestClaimPaymentRequirement(order: MarketplaceOrder) {
  const response = await fetch(`/api/x402/orders/${order.id}/claim`, {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    }
  })

  if (response.status !== 402) {
    return null
  }

  const body = await readResponseBody(response)
  const paymentRequired = decodePaymentRequiredHeader(response)

  if (!paymentRequired) {
    throw new Error(
      'Tollora did not return a readable x402 delta payment requirement.'
    )
  }

  return {
    status: response.status,
    statusText: response.statusText,
    paymentRequired,
    body
  }
}

async function ensurePermit2Allowance(
  paymentRequired: PaymentRequired,
  walletControls: BrowserWalletControls,
  onStatus: (message: string) => void,
  onStep: (id: WalletStepId, update: Partial<WalletStep>) => void
) {
  onStep('allowance', {
    status: 'active',
    detail: 'Checking MUSD balance and Permit2 allowance.'
  })
  const requirement = getPermit2Requirement(paymentRequired)

  if (!requirement) {
    onStep('allowance', {
      status: 'complete',
      detail: 'This payment requirement does not need Permit2 approval.'
    })
    return
  }

  const tokenAddress = requirement.asset

  if (!isHexAddress(tokenAddress)) {
    throw new Error(
      'The x402 payment requirement did not include a valid MUSD token address.'
    )
  }

  const requiredAmount = BigInt(requirement.amount)

  if (requiredAmount <= 0n) {
    onStep('allowance', {
      status: 'complete',
      detail: 'No MUSD allowance is needed for a zero-amount request.'
    })
    return
  }

  onStatus('Checking MUSD Permit2 allowance on Mezo Testnet.')

  const [balance, allowance] = await Promise.all([
    mezoPublicClient.readContract({
      address: tokenAddress,
      abi: musdBalanceAbi,
      functionName: 'balanceOf',
      args: [walletControls.signer.address]
    }),
    mezoPublicClient.readContract(
      getPermit2AllowanceReadParams({
        tokenAddress,
        ownerAddress: walletControls.signer.address
      })
    )
  ])

  if (balance < requiredAmount) {
    throw new Error(
      `Insufficient MUSD balance. This API call needs ${formatMusdAmount(
        requiredAmount
      )} MUSD, but the connected wallet has ${formatMusdAmount(
        balance
      )} MUSD on Mezo Testnet.`
    )
  }

  if (allowance >= requiredAmount) {
    onStep('allowance', {
      status: 'complete',
      detail: 'MUSD Permit2 allowance is already sufficient.'
    })
    return
  }

  onStatus(
    'Approve the one-time MUSD Permit2 allowance in your wallet, then Tollora will continue the paid API run.'
  )

  const approvalTransaction = createPermit2ApprovalTx(tokenAddress)
  const transactionHash =
    await walletControls.sendTransaction(approvalTransaction)

  onStep('allowance', {
    status: 'active',
    detail: 'MUSD approval transaction submitted.',
    txHash: transactionHash
  })
  onStatus(`Waiting for MUSD Permit2 approval to confirm: ${transactionHash}`)

  const receipt = await mezoPublicClient.waitForTransactionReceipt({
    hash: transactionHash
  })

  if (receipt.status !== 'success') {
    throw new Error('MUSD Permit2 approval transaction did not succeed.')
  }

  onStep('allowance', {
    status: 'complete',
    detail: 'MUSD Permit2 approval confirmed on Mezo.',
    txHash: transactionHash
  })
}

function getPermit2Requirement(paymentRequired: PaymentRequired) {
  return paymentRequired.accepts.find(requirement => {
    const assetTransferMethod = requirement.extra?.assetTransferMethod

    return assetTransferMethod === 'permit2'
  })
}

function isHexAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function isHexTransactionHash(
  value: string | null | undefined
): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(value ?? '')
}

function getTransactionHashFromExplorerUrl(value: string | null | undefined) {
  const match = value?.match(/0x[a-fA-F0-9]{64}/)

  return match?.[0] ?? ''
}

function shortenHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function formatMusdAmount(amount: bigint) {
  return Number(formatUnits(amount, MUSD_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6
  })
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (
    contentType.includes('application/json') ||
    contentType.includes('+json')
  ) {
    return response.json()
  }

  const text = await response.text()

  return {
    error:
      response.status === 402
        ? 'MUSD payment required.'
        : 'The server returned a non-JSON response.',
    contentType,
    bodyPreview: text.slice(0, 300)
  }
}

function decodePaymentRequiredHeader(
  response: Response
): PaymentRequired | null {
  const encoded =
    response.headers.get('payment-required') ??
    response.headers.get('PAYMENT-REQUIRED')

  if (!encoded) {
    return null
  }

  try {
    return decodeX402PaymentRequiredHeader(encoded)
  } catch {
    // Some non-standard implementations may send raw JSON instead of base64.
  }

  try {
    return JSON.parse(encoded) as PaymentRequired
  } catch {
    return null
  }
}
