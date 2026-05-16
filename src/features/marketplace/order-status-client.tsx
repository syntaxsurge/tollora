'use client'

import { useEffect, useState } from 'react'

import { x402Client, x402HTTPClient, wrapFetchWithPayment } from '@x402/fetch'
import type { PaymentRequired, x402PaymentResult } from '@x402/fetch'
import { decodePaymentRequiredHeader as decodeX402PaymentRequiredHeader } from '@x402/core/http'
import {
  createPermit2ApprovalTx,
  getPermit2AllowanceReadParams
} from '@x402/evm'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
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
    <div className='space-y-5'>
      <div className='grid gap-4 md:grid-cols-3'>
        {[
          ['Product', order.productName],
          ['Amount', order.amountMusd],
          ['Status', orderStatusLabels[order.status]]
        ].map(([label, value]) => (
          <div key={label} className='bg-muted rounded-lg p-4'>
            <p className='text-foreground/60 text-xs uppercase'>{label}</p>
            <p className='mt-1 font-semibold'>{value}</p>
          </div>
        ))}
      </div>
      <div className='border-foreground/10 rounded-lg border p-5'>
        <p className='text-sm font-semibold'>
          {orderStatusLabels[order.status]}
        </p>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          {orderStatusDetails[order.status]}
        </p>
      </div>
      {order.status === 'payment_required' ? (
        <Card className='space-y-4'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <WalletCards className='text-primary h-5 w-5' aria-hidden />
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  Run & Pay playground
                </p>
              </div>
              <h2 className='mt-3 text-xl font-semibold'>
                Pay this API call with your wallet
              </h2>
              <p className='text-foreground/65 mt-2 max-w-3xl text-sm leading-6'>
                Tollora reads the x402 price, checks whether your wallet needs a
                one-time MUSD Permit2 approval, asks you to sign the payment,
                settles on Mezo, and then shows the paid provider response.
              </p>
            </div>
            <Badge className='w-fit'>Mezo MUSD x402</Badge>
          </div>
          <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]'>
            <PaymentStepList steps={walletSteps} />
            <div className='border-foreground/10 rounded-lg border p-4 text-sm'>
              <p className='text-foreground/60 text-xs uppercase'>
                Connected signer
              </p>
              <p className='mt-1 font-semibold break-all'>
                {walletAddress ??
                  `Connect a ${walletLabel} to pay from the site`}
              </p>
              <p className='text-foreground/60 mt-3 text-xs leading-5'>
                First-time wallets need one approval transaction, then one x402
                payment signature for each paid call.
              </p>
            </div>
          </div>
        </Card>
      ) : null}
      {order.responsePayload ? (
        <Card>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Provider result
          </p>
          <pre className='bg-muted mt-4 max-h-96 overflow-auto rounded-lg p-4 text-xs leading-6'>
            {JSON.stringify(order.responsePayload, null, 2)}
          </pre>
        </Card>
      ) : null}
      {paymentRequirements ? (
        <PaymentRequirementCard inspection={paymentRequirements} />
      ) : null}
      {paymentError ? <PaymentErrorCard message={paymentError} /> : null}
      <div className='grid gap-3 text-sm md:grid-cols-2'>
        {[
          ['Order ID', order.id],
          ['Request ID', order.requestId],
          ['Provider', order.providerName],
          ['Provider wallet', order.providerWallet ?? ''],
          ['Buyer wallet', order.buyerWallet],
          ['Created', new Date(order.createdAt).toLocaleString()],
          ['Updated', new Date(order.updatedAt).toLocaleString()]
        ].map(([label, value]) => (
          <div
            key={label}
            className='border-foreground/10 rounded-lg border p-4'
          >
            <p className='text-foreground/60 text-xs uppercase'>{label}</p>
            <p className='mt-1 font-semibold break-words'>{value}</p>
          </div>
        ))}
      </div>
      {order.receiptId ? (
        <div className='grid gap-3 text-sm md:grid-cols-2'>
          <div className='border-foreground/10 rounded-lg border p-4'>
            <p className='text-foreground/60 text-xs uppercase'>Receipt</p>
            <a
              className='text-foreground mt-1 block font-semibold underline-offset-4 hover:underline'
              href={`/receipts/${order.receiptId}`}
            >
              {order.receiptId}
            </a>
          </div>
          {order.explorerUrl ? (
            <div className='border-foreground/10 rounded-lg border p-4'>
              <p className='text-foreground/60 text-xs uppercase'>Explorer</p>
              <a
                className='text-foreground mt-1 block font-semibold underline-offset-4 hover:underline'
                href={order.explorerUrl}
                target='_blank'
                rel='noreferrer'
              >
                View transaction
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
      {order.agentRunId ? (
        <div className='border-foreground/10 rounded-lg border p-4 text-sm'>
          <p className='text-foreground/60 text-xs uppercase'>Agent run</p>
          <a
            className='text-foreground mt-1 block font-semibold underline-offset-4 hover:underline'
            href={`/agents/${order.agentRunId}`}
          >
            {order.agentRunId}
          </a>
        </div>
      ) : null}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button
          onClick={runWithWallet}
          disabled={order.status !== 'payment_required' || isPaying}
        >
          {isPaying ? 'Running with wallet' : 'Run with wallet'}
        </Button>
        <Button
          variant='outline'
          onClick={inspectPaymentRequirement}
          disabled={order.status !== 'payment_required' || isInspecting}
        >
          {isInspecting ? 'Checking payment' : 'Inspect 402'}
        </Button>
        {status ? (
          <p className='text-foreground/65 min-w-0 text-sm' role='status'>
            {status}
          </p>
        ) : null}
      </div>
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
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
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
