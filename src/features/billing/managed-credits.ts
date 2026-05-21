import { randomBytes } from 'node:crypto'

import { getProductBySlug } from '@/features/marketplace/products'
import {
  readWorkspaceJsonArray,
  writeWorkspaceJsonArray
} from '@/lib/persistence/workspace-json-store'

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

const globalForManagedCredits = globalThis as typeof globalThis & {
  __tolloraManagedCreditAccounts?: ManagedCreditAccount[]
}

export const managedCreditAccounts =
  globalForManagedCredits.__tolloraManagedCreditAccounts ??
  readWorkspaceJsonArray({
    fileName: 'managed-credit-accounts.json',
    isItem: isManagedCreditAccount
  })

globalForManagedCredits.__tolloraManagedCreditAccounts = managedCreditAccounts
persistManagedCreditAccounts()

export function getManagedCreditAccountByWallet(wallet: string) {
  return managedCreditAccounts.find(
    account => account.wallet.toLowerCase() === wallet.toLowerCase()
  )
}

export function getManagedCreditAccountByApiKey(apiKey: string) {
  return managedCreditAccounts.find(account => account.apiKey === apiKey)
}

export function getOrCreateManagedCreditAccount(wallet: string) {
  const existing = getManagedCreditAccountByWallet(wallet)

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

  managedCreditAccounts.unshift(account)
  persistManagedCreditAccounts()

  return account
}

export function recordManagedCreditTopUp({
  wallet,
  amountMusd,
  settlementTxHash
}: {
  wallet: string
  amountMusd: number
  settlementTxHash: string
}) {
  const account = getOrCreateManagedCreditAccount(wallet)
  const topUp = {
    id: `top_${randomBytes(6).toString('hex')}`,
    amountMusd,
    settlementTxHash,
    createdAt: new Date().toISOString()
  }

  account.balanceMusd = Number((account.balanceMusd + amountMusd).toFixed(2))
  account.topUps.unshift(topUp)
  account.updatedAt = topUp.createdAt
  persistManagedCreditAccounts()

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
  const account = getManagedCreditAccountByApiKey(apiKey)
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
  persistManagedCreditAccounts()

  return { account, product, debit }
}

export function refundManagedCreditDebit({
  apiKey,
  debitId,
  note
}: {
  apiKey: string
  debitId: string
  note: string
}) {
  const account = getManagedCreditAccountByApiKey(apiKey)

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
  persistManagedCreditAccounts()

  return { account, debit }
}

export function settleManagedCreditDebit({
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
  const account = getManagedCreditAccountByApiKey(apiKey)

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
  persistManagedCreditAccounts()

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

function persistManagedCreditAccounts() {
  writeWorkspaceJsonArray('managed-credit-accounts.json', managedCreditAccounts)
}

function isManagedCreditAccount(value: unknown): value is ManagedCreditAccount {
  if (!value || typeof value !== 'object') {
    return false
  }

  const account = value as Partial<ManagedCreditAccount>

  return (
    typeof account.wallet === 'string' &&
    typeof account.apiKey === 'string' &&
    typeof account.balanceMusd === 'number' &&
    Array.isArray(account.topUps) &&
    Array.isArray(account.debits) &&
    typeof account.createdAt === 'string' &&
    typeof account.updatedAt === 'string'
  )
}
