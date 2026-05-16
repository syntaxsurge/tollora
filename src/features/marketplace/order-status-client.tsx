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
import { prepareTransaction, sendTransaction } from 'thirdweb'
import { useActiveAccount } from 'thirdweb/react'
import { createPublicClient, http } from 'viem'
import { useWalletClient } from 'wagmi'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MarketplaceReceipt } from '@/features/marketplace/receipts'
import {
  orderStatusDetails,
  orderStatusLabels
} from '@/features/marketplace/status'
import type { MarketplaceOrder } from '@/features/marketplace/types'
import { defaultAppChain } from '@/lib/config/chains'
import { walletProvider } from '@/lib/config/wallet'
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
  const [paymentRequirements, setPaymentRequirements] = useState<unknown>(null)
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
    setStatus('Reading the x402 payment requirement from Tollora.')
    setPaymentRequirements(null)

    try {
      const initialRequirement = await requestPaymentRequirement(order)

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
          message => setStatus(message)
        )
      }

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
        details?: unknown
        data?: unknown
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
        settlement?.transaction
          ? `MUSD payment settled on Mezo. Transaction: ${settlement.transaction}`
          : 'MUSD payment settled and provider response returned.'
      )
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to run the paid API request.'
      )
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
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Run with wallet
          </p>
          <p className='text-foreground/65 text-sm leading-6'>
            This page prepares a payable Tollora request, signs the x402 MUSD
            payment with your connected wallet, retries the API call, and saves
            the returned receipt. Developers and agents can call the same hosted
            endpoint with an x402 buyer client.
          </p>
          <p className='text-foreground/65 text-sm leading-6'>
            Mezo MUSD payments use Permit2. If this wallet has not approved MUSD
            for x402 settlement yet, the first run asks for a one-time allowance
            transaction before the payment signature.
          </p>
          <div className='border-foreground/10 rounded-lg border p-4 text-sm'>
            <p className='text-foreground/60 text-xs uppercase'>
              Connected signer
            </p>
            <p className='mt-1 font-semibold break-all'>
              {walletAddress ?? `Connect a ${walletLabel} to pay from the site`}
            </p>
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
        <Card>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Payment requirements
          </p>
          <pre className='bg-muted mt-4 max-h-80 overflow-auto rounded-lg p-4 text-xs leading-6'>
            {JSON.stringify(paymentRequirements, null, 2)}
          </pre>
        </Card>
      ) : null}
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
          <p className='text-foreground/65 text-sm' role='status'>
            {status}
          </p>
        ) : null}
      </div>
    </div>
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
    details?: unknown
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

  const details =
    typeof body.details === 'string'
      ? body.details
      : body.details
        ? JSON.stringify(body.details)
        : ''
  const message = body.error ?? body.message ?? body.reason ?? details

  return message
    ? `${message} (${response.status} ${response.statusText})`
    : `Paid API request failed (${response.status} ${response.statusText}).`
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
  onStatus: (message: string) => void
) {
  const requirement = getPermit2Requirement(paymentRequired)

  if (!requirement) {
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
    return
  }

  onStatus('Checking MUSD Permit2 allowance on Mezo Testnet.')

  const allowance = await mezoPublicClient.readContract(
    getPermit2AllowanceReadParams({
      tokenAddress,
      ownerAddress: walletControls.signer.address
    })
  )

  if (allowance >= requiredAmount) {
    return
  }

  onStatus(
    'Approve the one-time MUSD Permit2 allowance in your wallet, then Tollora will continue the paid API run.'
  )

  const approvalTransaction = createPermit2ApprovalTx(tokenAddress)
  const transactionHash =
    await walletControls.sendTransaction(approvalTransaction)

  onStatus(`Waiting for MUSD Permit2 approval to confirm: ${transactionHash}`)

  const receipt = await mezoPublicClient.waitForTransactionReceipt({
    hash: transactionHash
  })

  if (receipt.status !== 'success') {
    throw new Error('MUSD Permit2 approval transaction did not succeed.')
  }
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
