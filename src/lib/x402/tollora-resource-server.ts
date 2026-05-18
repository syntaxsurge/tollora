import {
  HTTPFacilitatorClient,
  type HTTPRequestContext,
  type RouteConfig,
  x402HTTPResourceServer,
  x402ResourceServer
} from '@x402/core/server'
import type { Network } from '@x402/core/types'
import { registerExactEvmScheme } from '@x402/evm/exact/server'

import { getProductBySlug } from '@/features/marketplace/products'
import { resolveProductPrice } from '@/features/marketplace/pricing'
import { x402Network } from '@/lib/config/chains'
import { envServer } from '@/lib/env/env.server'

const paidCallPattern = '/api/x402/products/:slug/call'
let serverPromise: Promise<x402HTTPResourceServer> | null = null

function getProductSlugFromPath(path: string) {
  const match = path.match(/^\/api\/x402\/products\/([^/]+)\/call$/)

  return match?.[1]
}

function requireProductFromContext(context: HTTPRequestContext) {
  const slug = getProductSlugFromPath(context.path)
  const product = slug ? getProductBySlug(slug) : undefined

  if (!product || product.status !== 'published') {
    throw new Error('Published API product was not found.')
  }

  return product
}

const paidCallRoute: RouteConfig = {
  accepts: {
    scheme: 'exact',
    network: x402Network as Network,
    payTo: context => requireProductFromContext(context).providerWallet,
    price: async context => {
      const product = requireProductFromContext(context)
      const resolvedPrice = await resolveProductPrice({
        product,
        requestPayload: getRequestPayload(context)
      })

      return `$${resolvedPrice.amountUsd.toFixed(6)}`
    },
    maxTimeoutSeconds: 300
  },
  description:
    'MUSD-settled Tollora API call on Mezo Testnet through the x402 protocol.',
  mimeType: 'application/json',
  unpaidResponseBody: context => {
    const product = requireProductFromContext(context)
    const requestPayload = getRequestPayload(context)

    return Promise.resolve(
      resolveProductPrice({ product, requestPayload }).catch(error => ({
        amountUsd: product.priceUsd,
        amountLabel: product.priceLabel,
        model: product.pricing.model,
        source: 'fixed' as const,
        quoteError: error instanceof Error ? error.message : 'Quote failed.'
      }))
    ).then(resolvedPrice => ({
      contentType: 'application/json',
      body: {
        error: 'MUSD payment required.',
        product: {
          slug: product.slug,
          name: product.name,
          providerName: product.providerName,
          priceLabel: resolvedPrice.amountLabel,
          endpointPath: product.endpointPath
        },
        pricing: resolvedPrice,
        payment: {
          network: x402Network,
          scheme: 'exact',
          facilitatorUrl:
            envServer.X402_FACILITATOR_URL ?? 'https://facilitator.vativ.io/'
        }
      }
    }))
  },
  settlementFailedResponseBody: (_context, settleResult) => ({
    contentType: 'application/json',
    body: {
      error: 'MUSD payment settlement failed.',
      reason: settleResult.errorReason,
      message: settleResult.errorMessage
    }
  })
}

function getRequestPayload(context: HTTPRequestContext) {
  return context.adapter.getBody?.() ?? context.adapter.getQueryParams?.() ?? {}
}

export async function getTolloraX402Server() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const facilitator = new HTTPFacilitatorClient({
        url: envServer.X402_FACILITATOR_URL ?? 'https://facilitator.vativ.io/'
      })
      const resourceServer = new x402ResourceServer(facilitator)

      registerExactEvmScheme(resourceServer, {
        networks: [x402Network as Network]
      })

      const httpServer = new x402HTTPResourceServer(resourceServer, {
        [`GET ${paidCallPattern}`]: paidCallRoute,
        [`POST ${paidCallPattern}`]: paidCallRoute
      })

      await httpServer.initialize()

      return httpServer
    })()
  }

  return serverPromise
}

export function getTolloraPaywallConfig(currentUrl: string) {
  return {
    appName: 'Tollora',
    currentUrl,
    testnet: true
  }
}
