import { randomBytes } from 'node:crypto'

import { getProductBySlug } from '@/features/marketplace/products'

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
  globalForManagedCredits.__tolloraManagedCreditAccounts ?? []

globalForManagedCredits.__tolloraManagedCreditAccounts = managedCreditAccounts

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

  return { account, topUp }
}

export function debitManagedCredits({
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
  const product = getProductBySlug(productSlug)

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
    createdAt: new Date().toISOString()
  }

  account.balanceMusd = Number(
    (account.balanceMusd - debitAmount).toFixed(2)
  )
  account.debits.unshift(debit)
  account.updatedAt = debit.createdAt

  return { account, product, debit }
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
