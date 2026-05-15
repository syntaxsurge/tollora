import { parseAbi } from 'viem'

import { getSubscriptionChain } from '@/lib/config/chains'
import { envClient } from '@/lib/env/env.client'

export const subscriptionManagerAbi = parseAbi([
  'function paySubscription(address team, uint8 planKey) payable',
  'function renewSubscription(uint8 planKey) payable',
  'function cancelSubscription()',
  'function cancelSubscriptionFor(address team)',
  'function setAutoRenew(bool enabled)',
  'function setPlanPrice(uint8 planKey, uint256 newPriceWei)',
  'function withdraw(address payable recipient, uint256 amount)',
  'function paidUntil(address team) view returns (uint256)',
  'function isSubscriptionActive(address team) view returns (bool)',
  'function contractBalance() view returns (uint256)',
  'function subscriberCount() view returns (uint256)',
  'function subscriberAt(uint256 index) view returns (address)',
  'function subscribers(uint256 offset, uint256 limit) view returns (address[] wallets, uint256 total)',
  'function subscriptionOf(address team) view returns (uint8 planKey, uint256 paidUntilValue, bool active, bool autoRenew, uint256 canceledAt)',
  'function planPriceWei(uint8 planKey) view returns (uint256)'
])

export const subscriptionNativeTokenSymbol =
  getSubscriptionChain().nativeCurrency.symbol

function formatNativePrice(priceWei: string) {
  const whole = BigInt(priceWei) / 1_000_000_000_000_000_000n
  const remainder = BigInt(priceWei) % 1_000_000_000_000_000_000n

  if (remainder === 0n) {
    return `${whole.toString()} ${subscriptionNativeTokenSymbol}`
  }

  const decimals = remainder.toString().padStart(18, '0').replace(/0+$/, '')
  return `${whole.toString()}.${decimals} ${subscriptionNativeTokenSymbol}`
}

export function formatNativeAmount(priceWei: string | bigint) {
  return formatNativePrice(priceWei.toString())
}

export const subscriptionPlans = [
  {
    key: 'free',
    planKey: 0,
    name: 'Free',
    priceLabel: '$0',
    priceWei: '0',
    description: 'Explore Tollora, connect a wallet, and browse paid APIs.',
    features: [
      'Wallet-gated marketplace',
      'Profile and settings pages',
      'Admin allowlist support'
    ]
  },
  {
    key: 'base',
    planKey: 1,
    name: 'Base',
    priceWei:
      envClient.NEXT_PUBLIC_SUBSCRIPTION_BASE_PRICE_WEI ?? '1000000000000000',
    get priceLabel() {
      return formatNativePrice(this.priceWei)
    },
    description:
      'Activate a 30-day paid subscription through SubscriptionManager.',
    features: [
      'Native-token checkout',
      '30-day paid period',
      'Server-side admin visibility'
    ]
  },
  {
    key: 'plus',
    planKey: 2,
    name: 'Plus',
    priceWei:
      envClient.NEXT_PUBLIC_SUBSCRIPTION_PLUS_PRICE_WEI ?? '2000000000000000',
    get priceLabel() {
      return formatNativePrice(this.priceWei)
    },
    description:
      'Upgrade to the higher workspace tier through the same on-chain flow.',
    features: [
      'Higher-tier subscription',
      'Same contract interface',
      'Deployment-ready env config'
    ]
  }
] as const

export type SubscriptionPlanKey = (typeof subscriptionPlans)[number]['key']

export function getSubscriptionManagerAddress() {
  return envClient.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS
}

export function getSubscriptionChainId() {
  return getSubscriptionChain().id
}
