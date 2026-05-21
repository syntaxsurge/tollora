import { randomBytes } from 'node:crypto'

import { getProductBySlug } from '@/features/marketplace/products'
import { getConvexClient } from '@/lib/db/convex/client'

import { api } from '../../../convex/_generated/api'

export type ManagedCreditTopUp = {
  id: string
  amountMusd: number
  settlementTxHash: string
  createdAt: string
}

export type ManagedCreditDebit = {
  id: string
  productSlug: string
  productName: string
  amountMusd: number
  receiptId: string
  createdAt: string
  status?: 'reserved' | 'settled' | 'refunded' | 'delta_due'
  note?: string
}

export type ManagedCreditAccount = {
  wallet: string
  apiKey: string
  balanceMusd: number
  topUps: ManagedCreditTopUp[]
  debits: ManagedCreditDebit[]
  createdAt: string
  updatedAt: string
}

export async function listManagedCreditAccounts() {
  const rows = await getConvexClient().query(
    api.managedCredits.listSnapshots,
    {}
  )

  return Array.isArray(rows)
    ? rows
        .map(normalizeManagedCreditAccount)
        .filter((account): account is ManagedCreditAccount => Boolean(account))
    : []
}

export async function getManagedCreditAccountByWallet(wallet: string) {
  const account = await getConvexClient().query(
    api.managedCredits.getByWallet,
    {
      wallet
    }
  )

  return normalizeManagedCreditAccount(account)
}

export async function getManagedCreditAccountByApiKey(apiKey: string) {
  const account = await getConvexClient().query(
    api.managedCredits.getByApiKey,
    {
      apiKey
    }
  )

  return normalizeManagedCreditAccount(account)
}

export async function getOrCreateManagedCreditAccount(wallet: string) {
  const existing = await getManagedCreditAccountByWallet(wallet)

  if (existing) {
    return existing
  }

  const createdAt = new Date().toISOString()
  const account: ManagedCreditAccount = {
    wallet,
    apiKey: `tlr_${randomBytes(24).toString('hex')}`,
    balanceMusd: 0,
    topUps: [],
    debits: [],
    createdAt,
    updatedAt: createdAt
  }

  await persistManagedCreditAccount(account)

  return account
}

export async function recordManagedCreditTopUp({
  wallet,
  amountMusd,
  settlementTxHash
}: {
  wallet: string
  amountMusd: number
  settlementTxHash: string
}) {
  const account = await getOrCreateManagedCreditAccount(wallet)
  const topUp = {
    id: `top_${randomBytes(6).toString('hex')}`,
    amountMusd,
    settlementTxHash,
    createdAt: new Date().toISOString()
  }

  account.balanceMusd = Number((account.balanceMusd + amountMusd).toFixed(2))
  account.topUps.unshift(topUp)
  account.updatedAt = topUp.createdAt
  await persistManagedCreditAccount(account)

  return { account, topUp }
}

export async function debitManagedCredits({
  apiKey,
  productSlug,
  receiptId,
  amountMusd
}: {
  apiKey: string
  productSlug: string
  receiptId: string
  amountMusd?: number
}) {
  const account = await getManagedCreditAccountByApiKey(apiKey)
  const product = await getProductBySlug(productSlug)

  if (!account || !product) {
    return null
  }

  const debitAmount = amountMusd ?? product.priceUsd

  if (account.balanceMusd < debitAmount) {
    return { account, product, debit: null }
  }

  const debit = {
    id: `debit_${randomBytes(6).toString('hex')}`,
    productSlug,
    productName: product.name,
    amountMusd: debitAmount,
    receiptId,
    status: 'reserved' as const,
    note: 'Reserved before forwarding the paid request to the provider.',
    createdAt: new Date().toISOString()
  }

  account.balanceMusd = Number((account.balanceMusd - debitAmount).toFixed(2))
  account.debits.unshift(debit)
  account.updatedAt = debit.createdAt
  await persistManagedCreditAccount(account)

  return { account, product, debit }
}

export async function refundManagedCreditDebit({
  apiKey,
  debitId,
  note
}: {
  apiKey: string
  debitId: string
  note: string
}) {
  const account = await getManagedCreditAccountByApiKey(apiKey)

  if (!account) {
    return null
  }

  const debit = account.debits.find(item => item.id === debitId)

  if (!debit || debit.status === 'refunded') {
    return { account, debit: debit ?? null }
  }

  debit.status = 'refunded'
  debit.note = note
  account.balanceMusd = Number(
    (account.balanceMusd + debit.amountMusd).toFixed(6)
  )
  account.updatedAt = new Date().toISOString()
  await persistManagedCreditAccount(account)

  return { account, debit }
}

export async function settleManagedCreditDebit({
  apiKey,
  debitId,
  actualAmountMusd,
  note
}: {
  apiKey: string
  debitId: string
  actualAmountMusd: number
  note: string
}) {
  const account = await getManagedCreditAccountByApiKey(apiKey)

  if (!account) {
    return null
  }

  const debit = account.debits.find(item => item.id === debitId)

  if (!debit || debit.status === 'refunded') {
    return { account, debit: debit ?? null, deltaMusd: 0 }
  }

  const deltaMusd = Number((actualAmountMusd - debit.amountMusd).toFixed(6))

  if (deltaMusd < 0) {
    account.balanceMusd = Number(
      (account.balanceMusd + Math.abs(deltaMusd)).toFixed(6)
    )
    debit.status = 'settled'
  } else if (deltaMusd > 0) {
    debit.status = 'delta_due'
  } else {
    debit.status = 'settled'
  }

  debit.note = note
  account.updatedAt = new Date().toISOString()
  await persistManagedCreditAccount(account)

  return { account, debit, deltaMusd }
}

export function toPublicManagedCreditAccount(account: ManagedCreditAccount) {
  return {
    wallet: account.wallet,
    apiKey: account.apiKey,
    balanceMusd: account.balanceMusd.toFixed(2),
    topUps: account.topUps,
    debits: account.debits,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  }
}

async function persistManagedCreditAccount(account: ManagedCreditAccount) {
  await getConvexClient().mutation(api.managedCredits.upsertSnapshot, {
    wallet: account.wallet,
    apiKey: account.apiKey,
    accountJson: JSON.stringify(account)
  })
}

function normalizeManagedCreditAccount(
  value: unknown
): ManagedCreditAccount | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const account = value as Partial<ManagedCreditAccount>

  if (
    typeof account.wallet === 'string' &&
    typeof account.apiKey === 'string' &&
    typeof account.balanceMusd === 'number' &&
    Array.isArray(account.topUps) &&
    Array.isArray(account.debits) &&
    typeof account.createdAt === 'string' &&
    typeof account.updatedAt === 'string'
  ) {
    return account as ManagedCreditAccount
  }

  return null
}
