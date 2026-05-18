import { randomBytes } from 'node:crypto'

import { NextResponse } from 'next/server'

import {
  debitManagedCredits,
  getManagedCreditAccountByApiKey,
  toPublicManagedCreditAccount
} from '@/features/billing/managed-credits'
import {
  buildExplorerUrl,
  buildReceiptAmounts,
  recordMarketplaceReceipt
} from '@/features/marketplace/receipts'
import { recordMarketplaceOrder } from '@/features/marketplace/orders'
import { getProductBySlug } from '@/features/marketplace/products'
import { resolveProductPrice } from '@/features/marketplace/pricing'
import { x402Network } from '@/lib/config/chains'
import { getProviderAdapter } from '@/features/provider-adapters/registry'

type CreditProductCallRouteProps = {
  params: Promise<{
    slug: string
  }>
}

export async function POST(
  request: Request,
  { params }: CreditProductCallRouteProps
) {
  const { slug } = await params
  const product = getProductBySlug(slug)
  const apiKey = getBearerToken(request.headers.get('authorization'))

  if (!product || product.status !== 'published') {
    return NextResponse.json(
      { error: 'API product was not found.' },
      { status: 404 }
    )
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Tollora API key required for managed-credit calls.' },
      { status: 401 }
    )
  }

  const account = getManagedCreditAccountByApiKey(apiKey)

  if (!account) {
    return NextResponse.json(
      { error: 'Tollora API key was not found.' },
      { status: 401 }
    )
  }

  const latestTopUp = account.topUps[0]

  if (!latestTopUp) {
    return NextResponse.json(
      { error: 'Managed credit balance is empty. Top up with MUSD first.' },
      { status: 402 }
    )
  }

  const payload = await request.json().catch(() => ({}))
  const orderId = `ord_credit_${randomBytes(6).toString('hex')}`
  const requestId = `req_credit_${randomBytes(6).toString('hex')}`
  const receiptId = `rcpt_credit_${randomBytes(6).toString('hex')}`
  const resolvedPrice = await resolveProductPrice({
    product,
    requestPayload: payload
  })
  const debitResult = debitManagedCredits({
    apiKey,
    productSlug: slug,
    receiptId,
    amountMusd: resolvedPrice.amountUsd
  })

  if (!debitResult?.debit) {
    return NextResponse.json(
      {
        error: 'Managed credit balance is too low for this API call.',
        account: debitResult
          ? toPublicManagedCreditAccount(debitResult.account)
          : undefined
      },
      { status: 402 }
    )
  }

  const providerAdapter = getProviderAdapter(slug)

  if (!providerAdapter) {
    return NextResponse.json(
      { error: 'Provider adapter was not found.' },
      { status: 502 }
    )
  }

  const providerResult = await providerAdapter.call({
    productSlug: product.slug,
    requestPayload: payload,
    orderId,
    requestId,
    receiptId,
    buyerWallet: account.wallet
  })

  if (providerResult.status === 'failed') {
    return NextResponse.json(
      {
        error: providerResult.errorMessage ?? 'Provider request failed.',
        provider: {
          id: providerAdapter.id,
          response: providerResult.responsePayload
        }
      },
      { status: 502 }
    )
  }

  const createdAt = new Date().toISOString()
  const receipt = {
    id: receiptId,
    orderId,
    requestId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    buyerWallet: account.wallet,
    providerWallet: product.providerWallet,
    amountMusd: resolvedPrice.amountLabel,
    ...buildReceiptAmounts(resolvedPrice.amountUsd),
    network: x402Network as 'eip155:31611',
    txHash: latestTopUp.settlementTxHash,
    explorerUrl: buildExplorerUrl(latestTopUp.settlementTxHash),
    createdAt,
    resultUrl: providerResult.resultUrl
  }
  const order = {
    id: orderId,
    productSlug: product.slug,
    productName: product.name,
    providerName: product.providerName,
    providerWallet: product.providerWallet,
    buyerWallet: account.wallet,
    status: providerResult.status,
    amountMusd: resolvedPrice.amountLabel,
    requestId,
    requestPayloadJson: JSON.stringify(payload, null, 2),
    receiptId,
    explorerUrl: receipt.explorerUrl,
    externalJobId: providerResult.externalJobId,
    responsePayload: providerResult.responsePayload,
    resultUrl: providerResult.resultUrl,
    createdAt,
    updatedAt: createdAt
  }

  recordMarketplaceReceipt(receipt)
  recordMarketplaceOrder(order)

  return NextResponse.json({
    order,
    receipt,
    pricing: resolvedPrice,
    data: providerResult.responsePayload,
    creditAccount: toPublicManagedCreditAccount(debitResult.account)
  })
}

function getBearerToken(header: string | null) {
  if (!header?.toLowerCase().startsWith('bearer ')) {
    return null
  }

  return header.slice(7).trim()
}
