import type { Chain } from 'viem'
import { defineChain, parseUnits } from 'viem'

import { envClient } from '@/lib/env/env.client'

export type SupportedChainKey = 'app'

export type AppChain = {
  key: SupportedChainKey
  id: number
  name: string
  shortName: string
  nativeCurrency: Chain['nativeCurrency']
  viemChain: Chain
  explorer: {
    name: string
    baseUrl: string
  }
}

const appChainId = envClient.NEXT_PUBLIC_EVM_CHAIN_ID ?? 31611
const appChainName =
  envClient.NEXT_PUBLIC_EVM_CHAIN_NAME ?? 'Mezo Testnet'
const appChainShortName =
  envClient.NEXT_PUBLIC_EVM_CHAIN_SHORT_NAME ?? 'Mezo Testnet'
const appChainRpcUrl =
  envClient.NEXT_PUBLIC_EVM_RPC_URL ?? 'https://rpc.test.mezo.org'
const appChainExplorerName =
  envClient.NEXT_PUBLIC_EVM_EXPLORER_NAME ?? 'Mezo Testnet Explorer'
const appChainExplorerUrl =
  envClient.NEXT_PUBLIC_EVM_EXPLORER_URL ??
  'https://explorer.test.mezo.org'
const appChainNativeCurrency = {
  name: envClient.NEXT_PUBLIC_EVM_NATIVE_CURRENCY_NAME ?? 'Bitcoin',
  symbol: envClient.NEXT_PUBLIC_EVM_NATIVE_CURRENCY_SYMBOL ?? 'BTC',
  decimals: envClient.NEXT_PUBLIC_EVM_NATIVE_CURRENCY_DECIMALS ?? 18
}

export const appChains = {
  app: {
    key: 'app',
    id: appChainId,
    name: appChainName,
    shortName: appChainShortName,
    nativeCurrency: appChainNativeCurrency,
    viemChain: defineChain({
      id: appChainId,
      name: appChainName,
      nativeCurrency: appChainNativeCurrency,
      rpcUrls: {
        default: {
          http: [appChainRpcUrl]
        }
      },
      blockExplorers: {
        default: {
          name: appChainExplorerName,
          url: appChainExplorerUrl
        }
      },
      testnet: envClient.NEXT_PUBLIC_EVM_IS_TESTNET ?? true
    }),
    explorer: {
      name: appChainExplorerName,
      baseUrl: appChainExplorerUrl
    }
  }
} as const satisfies Record<SupportedChainKey, AppChain>

export const supportedAppChains = Object.values(appChains)
export const supportedViemChains = [appChains.app.viemChain] as const
export const defaultAppChain = appChains.app
export const x402Network =
  envClient.NEXT_PUBLIC_X402_NETWORK ?? `eip155:${defaultAppChain.id}`
export const defaultX402FacilitatorUrl =
  'https://facilitator.vativ.io/'
const defaultPaymentTokenAddress = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503'
const defaultPaymentTokenDomainName = 'MUSD'
export const paymentTokenAddress =
  envClient.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ?? defaultPaymentTokenAddress
export const paymentTokenName =
  envClient.NEXT_PUBLIC_PAYMENT_TOKEN_NAME ?? defaultPaymentTokenDomainName
export const paymentTokenSymbol =
  envClient.NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL ?? 'MUSD'
export const paymentTokenLabel =
  envClient.NEXT_PUBLIC_PAYMENT_TOKEN_LABEL ?? paymentTokenSymbol
export const paymentTokenVersion =
  envClient.NEXT_PUBLIC_PAYMENT_TOKEN_VERSION ?? '2'
export const paymentTokenDecimals =
  envClient.NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS ?? 18
export const paymentTokenTransferMethod =
  envClient.NEXT_PUBLIC_PAYMENT_TOKEN_TRANSFER_METHOD ?? 'permit2'

export function toPaymentAssetAmount(amountUsd: number) {
  return {
    amount: parseUnits(
      amountUsd.toFixed(Math.min(paymentTokenDecimals, 6)),
      paymentTokenDecimals
    ).toString(),
    asset: paymentTokenAddress,
    extra: {
      name: paymentTokenName,
      symbol: paymentTokenSymbol,
      version: paymentTokenVersion,
      decimals: paymentTokenDecimals,
      assetTransferMethod: paymentTokenTransferMethod
    }
  }
}

export function getAppChainById(chainId?: number | null) {
  return (
    supportedAppChains.find(chain => chain.id === chainId) ?? defaultAppChain
  )
}

export function getSubscriptionChain() {
  return getAppChainById(envClient.NEXT_PUBLIC_SUBSCRIPTION_CHAIN_ID)
}

export function getExplorerAddressUrl(
  address: string | null | undefined,
  chainId = getSubscriptionChain().id
) {
  if (!address) {
    return null
  }

  return `${getAppChainById(chainId).explorer.baseUrl}/address/${address}`
}

export function getExplorerTransactionUrl(
  hash: string | null | undefined,
  chainId = getSubscriptionChain().id
) {
  if (!hash) {
    return null
  }

  return `${getAppChainById(chainId).explorer.baseUrl}/tx/${hash}`
}
