import type { Chain } from 'viem'
import { defineChain } from 'viem'
import { baseSepolia } from 'viem/chains'

import { envClient } from '@/lib/env/env.client'

export type SupportedChainKey = 'mezoTestnet' | 'baseSepolia'

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

export const appChains = {
  mezoTestnet: {
    key: 'mezoTestnet',
    id: envClient.NEXT_PUBLIC_MEZO_TESTNET_CHAIN_ID ?? 31611,
    name: 'Mezo Testnet',
    shortName: 'Mezo Testnet',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 18
    },
    viemChain: defineChain({
      id: envClient.NEXT_PUBLIC_MEZO_TESTNET_CHAIN_ID ?? 31611,
      name: 'Mezo Testnet',
      nativeCurrency: {
        name: 'Bitcoin',
        symbol: 'BTC',
        decimals: 18
      },
      rpcUrls: {
        default: {
          http: [
            envClient.NEXT_PUBLIC_MEZO_TESTNET_RPC_URL ??
              'https://rpc.test.mezo.org'
          ],
          webSocket: ['wss://rpc-ws.test.mezo.org']
        }
      },
      blockExplorers: {
        default: {
          name: 'Mezo Testnet Explorer',
          url:
            envClient.NEXT_PUBLIC_MEZO_TESTNET_EXPLORER_URL ??
            'https://explorer.test.mezo.org'
        }
      },
      testnet: true
    }),
    explorer: {
      name: 'Mezo Testnet Explorer',
      baseUrl:
        envClient.NEXT_PUBLIC_MEZO_TESTNET_EXPLORER_URL ??
        'https://explorer.test.mezo.org'
    }
  },
  baseSepolia: {
    key: 'baseSepolia',
    id: baseSepolia.id,
    name: baseSepolia.name,
    shortName: 'Base Sepolia',
    nativeCurrency: baseSepolia.nativeCurrency,
    viemChain: baseSepolia,
    explorer: {
      name: 'BaseScan',
      baseUrl: 'https://sepolia.basescan.org'
    }
  }
} as const satisfies Record<SupportedChainKey, AppChain>

export const supportedAppChains = Object.values(appChains)
export const supportedViemChains = [
  appChains.mezoTestnet.viemChain,
  appChains.baseSepolia.viemChain
] as const
export const defaultAppChain = appChains.mezoTestnet
export const x402Network = envClient.NEXT_PUBLIC_X402_NETWORK ?? 'eip155:31611'

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
