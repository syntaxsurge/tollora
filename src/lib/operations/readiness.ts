import { getPublishedProducts } from '@/features/marketplace/products'
import { demoReceipts } from '@/features/marketplace/receipts'
import { x402Network } from '@/lib/config/chains'
import { envClient } from '@/lib/env/env.client'
import { envServer } from '@/lib/env/env.server'

export type ReadinessState = 'ready' | 'attention'

export type ReadinessItem = {
  label: string
  value: string
  state: ReadinessState
  detail: string
}

export function getOperationalReadiness() {
  const products = getPublishedProducts()
  const cliploreConfigured = Boolean(
    envServer.CLIPLORE_API_URL && envServer.CLIPLORE_API_KEY
  )
  const facilitatorUrl =
    envServer.X402_FACILITATOR_URL ?? 'https://facilitator.vativ.io/'

  const items: ReadinessItem[] = [
    {
      label: 'Mezo network',
      value: x402Network,
      state: x402Network === 'eip155:31611' ? 'ready' : 'attention',
      detail: 'Paid API routes settle MUSD on the configured x402 network.'
    },
    {
      label: 'x402 facilitator',
      value: facilitatorUrl,
      state: facilitatorUrl.length > 0 ? 'ready' : 'attention',
      detail: 'The gateway verifies and settles signed payment payloads here.'
    },
    {
      label: 'Wallet onboarding',
      value: envClient.NEXT_PUBLIC_WALLET_PROVIDER ?? 'rainbowkit',
      state: envClient.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
        ? 'ready'
        : 'attention',
      detail:
        'WalletConnect project configuration enables the production wallet modal.'
    },
    {
      label: 'ClipLore adapter',
      value: cliploreConfigured ? 'Configured' : 'Credentials required',
      state: cliploreConfigured ? 'ready' : 'attention',
      detail:
        'ClipLore API URL and API key are required to start premium video jobs.'
    },
    {
      label: 'ClipLore webhook',
      value: envServer.CLIPLORE_WEBHOOK_SECRET
        ? 'Signature verification enabled'
        : 'Unsigned local intake',
      state: envServer.CLIPLORE_WEBHOOK_SECRET ? 'ready' : 'attention',
      detail:
        'Webhook signatures are verified when the shared secret is configured.'
    },
    {
      label: 'Marketplace listings',
      value: products.length.toString(),
      state: products.length > 0 ? 'ready' : 'attention',
      detail: 'Published listings are available for paid buyer and agent calls.'
    },
    {
      label: 'Receipt records',
      value: demoReceipts.length.toString(),
      state: demoReceipts.length > 0 ? 'ready' : 'attention',
      detail:
        'Receipt pages show MUSD amount, fee split, tx hash, and explorer.'
    }
  ]

  return {
    items,
    readyCount: items.filter(item => item.state === 'ready').length,
    attentionCount: items.filter(item => item.state === 'attention').length
  }
}
