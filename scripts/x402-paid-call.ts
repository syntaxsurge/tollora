import { config } from 'dotenv'
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from '@x402/fetch'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { privateKeyToAccount } from 'viem/accounts'

import { getProductBySlug } from '../src/features/marketplace/products'

config({ path: '.env.local' })
config()

type ParsedArgs = {
  slug: string
  payload?: string
  url?: string
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const slug = args.find(arg => !arg.startsWith('--')) ?? 'prompt-enhancer-api'
  const payloadIndex = args.indexOf('--payload')
  const urlIndex = args.indexOf('--url')

  return {
    slug,
    payload: payloadIndex >= 0 ? args[payloadIndex + 1] : undefined,
    url: urlIndex >= 0 ? args[urlIndex + 1] : undefined
  }
}

function getPrivateKey() {
  const privateKey =
    process.env.EVM_PRIVATE_KEY ?? process.env.AGENT_SPENDER_PRIVATE_KEY

  if (!privateKey) {
    throw new Error(
      'Set EVM_PRIVATE_KEY or AGENT_SPENDER_PRIVATE_KEY in your shell or .env.local.'
    )
  }

  return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
}

async function main() {
  const { slug, payload, url } = parseArgs()
  const product = getProductBySlug(slug)

  if (!product) {
    throw new Error(`Unknown Tollora product slug: ${slug}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const endpointUrl = url ?? new URL(product.endpointPath, appUrl).toString()
  const requestPayload = payload
    ? (JSON.parse(payload) as unknown)
    : product.referencePayload
  const signer = privateKeyToAccount(getPrivateKey() as `0x${string}`)
  const client = new x402Client()

  registerExactEvmScheme(client, { signer })

  const paidFetch = wrapFetchWithPayment(fetch, client)
  const response = await paidFetch(endpointUrl, {
    method: product.method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: product.method === 'POST' ? JSON.stringify(requestPayload) : undefined
  })
  const body = await response.json().catch(() => null)
  const httpClient = new x402HTTPClient(client)
  const paymentResponse = response.ok
    ? httpClient.getPaymentSettleResponse(name => response.headers.get(name))
    : null

  console.log(
    JSON.stringify(
      {
        status: response.status,
        ok: response.ok,
        endpointUrl,
        body,
        payment: paymentResponse
      },
      null,
      2
    )
  )

  if (!response.ok) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
