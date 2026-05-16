'use client'

import { useEffect, useState } from 'react'

import { x402Client, x402HTTPClient, wrapFetchWithPayment } from '@x402/fetch'
import type { x402PaymentResult } from '@x402/fetch'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { useActiveAccount } from 'thirdweb/react'
import { useWalletClient } from 'wagmi'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MarketplaceReceipt } from '@/features/marketplace/receipts'
import {
  orderStatusDetails,
  orderStatusLabels
} from '@/features/marketplace/status'
import type { MarketplaceOrder } from '@/features/marketplace/types'
import { walletProvider } from '@/lib/config/wallet'

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

function RainbowOrderStatusClient(props: OrderStatusClientProps) {
  const { data: walletClient } = useWalletClient()

  return (
    <OrderStatusContent
      {...props}
      walletAddress={walletClient?.account?.address ?? null}
      walletLabel='RainbowKit wallet'
      getSigner={() => {
        if (!walletClient?.account) {
          return null
        }

        return {
          address: walletClient.account.address,
          signTypedData: message =>
            walletClient.signTypedData({
              account: walletClient.account,
              domain: message.domain,
              types: message.types,
              primaryType: message.primaryType,
              message: message.message
            } as Parameters<typeof walletClient.signTypedData>[0])
        } satisfies BrowserEvmSigner
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
      getSigner={() => {
        if (!account?.address) {
          return null
        }

        return {
          address: account.address as `0x${string}`,
          signTypedData: message =>
            account.signTypedData(message as never) as Promise<`0x${string}`>
        } satisfies BrowserEvmSigner
      }}
    />
  )
}

function OrderStatusContent({
  orderId,
  initialOrder,
  walletAddress,
  walletLabel,
  getSigner
}: OrderStatusClientProps & {
  walletAddress: string | null
  walletLabel: string
  getSigner: () => BrowserEvmSigner | null
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

    const signer = getSigner()

    if (!signer) {
      setStatus(`Connect a ${walletLabel} before running this paid API call.`)
      return
    }

    setIsPaying(true)
    setStatus('Waiting for wallet signature and MUSD settlement.')
    setPaymentRequirements(null)

    try {
      const client = registerExactEvmScheme(new x402Client(), { signer })
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
        buyerWallet: receipt?.buyerWallet ?? signer.address,
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

function decodePaymentRequiredHeader(response: Response) {
  const encoded =
    response.headers.get('payment-required') ??
    response.headers.get('PAYMENT-REQUIRED')

  if (!encoded) {
    return null
  }

  try {
    return JSON.parse(encoded) as unknown
  } catch {
    // Some x402 implementations send the header as base64/base64url JSON.
  }

  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    )

    return JSON.parse(window.atob(padded)) as unknown
  } catch {
    return encoded
  }
}
