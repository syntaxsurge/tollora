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
    price: context =>
      `$${requireProductFromContext(context).priceUsd.toFixed(2)}`,
    maxTimeoutSeconds: 300
  },
  description:
    'MUSD-settled Tollora API call on Mezo Testnet through the x402 protocol.',
  mimeType: 'application/json',
  unpaidResponseBody: context => {
    const product = requireProductFromContext(context)

    return {
      contentType: 'application/json',
      body: {
        error: 'MUSD payment required.',
        product: {
          slug: product.slug,
          name: product.name,
          providerName: product.providerName,
          priceLabel: product.priceLabel,
          endpointPath: product.endpointPath
        },
        payment: {
          network: x402Network,
          scheme: 'exact',
          facilitatorUrl:
            envServer.X402_FACILITATOR_URL ?? 'https://facilitator.vativ.io/'
        }
      }
    }
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
