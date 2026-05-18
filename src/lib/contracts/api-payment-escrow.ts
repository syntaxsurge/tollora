import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  keccak256,
  parseUnits,
  toBytes,
  type Address,
  type Hex
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { buildExplorerUrl } from '@/features/marketplace/receipts'
import { defaultAppChain } from '@/lib/config/chains'
import { envServer } from '@/lib/env/env.server'

type EscrowableProduct = {
  executionMode: 'synchronous' | 'asynchronous'
  providerWallet?: string
  pricing: {
    model: 'fixed' | 'credit_metered'
  }
}

export type EscrowWriteResult = {
  txHash: Hex
  explorerUrl: string | null
}

export const apiPaymentEscrowAbi = [
  {
    type: 'function',
    name: 'reservePayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentId', type: 'bytes32' },
      { name: 'token', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'provider', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'settlementTxHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'releasePayment',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'refundPayment',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: []
  }
] as const

const publicClient = createPublicClient({
  chain: defaultAppChain.viemChain,
  transport: http(defaultAppChain.viemChain.rpcUrls.default.http[0])
})

export function shouldUseApiPaymentEscrow(product: EscrowableProduct) {
  return (
    product.pricing.model === 'credit_metered' &&
    product.executionMode === 'asynchronous' &&
    getEscrowAddress() !== null &&
    getEscrowOperatorPrivateKey() !== null
  )
}

export function getApiPaymentPayTo(product: EscrowableProduct) {
  const escrowAddress = getEscrowAddress()

  if (shouldUseApiPaymentEscrow(product) && escrowAddress) {
    return escrowAddress
  }

  return product.providerWallet ?? ''
}

export function getEscrowPaymentId(orderId: string, receiptId: string) {
  return keccak256(toBytes(`${orderId}:${receiptId}`))
}

export function toAtomicMusdAmount(amountUsd: number) {
  return parseUnits(amountUsd.toFixed(6), 18)
}

export async function reserveEscrowPayment({
  paymentId,
  token,
  payer,
  provider,
  amount,
  settlementTxHash
}: {
  paymentId: Hex
  token: Address
  payer: Address
  provider: Address
  amount: bigint
  settlementTxHash: Hex
}) {
  return writeEscrow({
    functionName: 'reservePayment',
    args: [paymentId, token, payer, provider, amount, settlementTxHash]
  })
}

export async function releaseEscrowPayment(paymentId: Hex) {
  return writeEscrow({
    functionName: 'releasePayment',
    args: [paymentId]
  })
}

export async function refundEscrowPayment(paymentId: Hex) {
  return writeEscrow({
    functionName: 'refundPayment',
    args: [paymentId]
  })
}

function getEscrowAddress() {
  const address = envServer.NEXT_PUBLIC_API_PAYMENT_ESCROW_ADDRESS

  return address && isAddress(address) ? address : null
}

function getEscrowOperatorPrivateKey() {
  const privateKey = envServer.API_ESCROW_OPERATOR_PRIVATE_KEY

  if (!privateKey) {
    return null
  }

  return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
}

async function writeEscrow({
  functionName,
  args
}: {
  functionName: 'reservePayment' | 'releasePayment' | 'refundPayment'
  args: readonly [Hex, Address, Address, Address, bigint, Hex] | readonly [Hex]
}): Promise<EscrowWriteResult | null> {
  const address = getEscrowAddress()
  const privateKey = getEscrowOperatorPrivateKey()

  if (!address || !privateKey) {
    return null
  }

  const account = privateKeyToAccount(privateKey as Hex)
  const walletClient = createWalletClient({
    account,
    chain: defaultAppChain.viemChain,
    transport: http(defaultAppChain.viemChain.rpcUrls.default.http[0])
  })
  const { request } = await publicClient.simulateContract({
    address,
    abi: apiPaymentEscrowAbi,
    functionName,
    args,
    account
  })
  const txHash = await walletClient.writeContract(request)

  await publicClient.waitForTransactionReceipt({
    hash: txHash
  })

  return {
    txHash,
    explorerUrl: buildExplorerUrl(txHash)
  }
}
