import { NextResponse } from 'next/server'

import { marketplaceProducts } from '@/features/marketplace/products'
import { x402Network } from '@/lib/config/chains'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json({
    openapi: '3.1.0',
    info: {
      title: 'Tollora API',
      version: '1.0.0',
      description:
        'MUSD-native paid API marketplace and x402 gateway for Mezo Testnet.'
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        description: 'Tollora gateway'
      }
    ],
    tags: [
      { name: 'Marketplace' },
      { name: 'x402' },
      { name: 'Receipts' },
      { name: 'Providers' },
      { name: 'Operations' }
    ],
    paths: {
      '/api/health': {
        get: {
          tags: ['Operations'],
          summary: 'Read gateway readiness checks',
          responses: {
            '200': {
              description: 'Operational readiness summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      readyChecks: { type: 'number' },
                      attentionChecks: { type: 'number' },
                      checks: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ReadinessCheck' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/orders': {
        post: {
          tags: ['Marketplace'],
          summary: 'Create a buyer order record',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateOrderRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Payment-required order',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Order' }
                }
              }
            },
            '400': { description: 'Invalid order payload' },
            '404': { description: 'Product not found' }
          }
        }
      },
      '/api/x402/products/{slug}/call': {
        get: paidCallOperation('GET'),
        post: paidCallOperation('POST')
      },
      '/api/receipts/{receiptId}': {
        get: {
          tags: ['Receipts'],
          summary: 'Get a MUSD settlement receipt',
          parameters: [
            {
              name: 'receiptId',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Settlement receipt',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Receipt' }
                }
              }
            },
            '404': { description: 'Receipt not found' }
          }
        }
      },
      '/api/provider-webhooks/cliplore': {
        post: {
          tags: ['Providers'],
          summary: 'Receive ClipLore video job status updates',
          parameters: [
            {
              name: 'x-cliplore-signature',
              in: 'header',
              required: false,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ClipLoreWebhook' }
              }
            }
          },
          responses: {
            '200': { description: 'Webhook accepted' },
            '400': { description: 'Invalid webhook payload' },
            '401': { description: 'Invalid webhook signature' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        x402Payment: {
          type: 'apiKey',
          in: 'header',
          name: 'X-PAYMENT',
          description:
            'Signed x402 payment payload for MUSD settlement on Mezo Testnet.'
        }
      },
      schemas: {
        CreateOrderRequest: {
          type: 'object',
          required: ['productSlug', 'buyerWallet', 'requestPayloadJson'],
          properties: {
            productSlug: {
              type: 'string',
              enum: marketplaceProducts.map(product => product.slug)
            },
            buyerWallet: { type: 'string' },
            requestPayloadJson: { type: 'string' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productSlug: { type: 'string' },
            productName: { type: 'string' },
            providerName: { type: 'string' },
            buyerWallet: { type: 'string' },
            status: { type: 'string' },
            amountMusd: { type: 'string' },
            requestId: { type: 'string' },
            receiptId: { type: 'string' },
            explorerUrl: { type: 'string' }
          }
        },
        Receipt: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderId: { type: 'string' },
            requestId: { type: 'string' },
            productName: { type: 'string' },
            providerName: { type: 'string' },
            buyerWallet: { type: 'string' },
            providerWallet: { type: 'string' },
            amountMusd: { type: 'string' },
            network: { type: 'string', enum: [x402Network] },
            txHash: { type: 'string' },
            explorerUrl: { type: 'string' }
          }
        },
        ClipLoreWebhook: {
          type: 'object',
          required: ['orderId', 'externalJobId', 'status'],
          properties: {
            orderId: { type: 'string' },
            receiptId: { type: 'string' },
            externalJobId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['queued', 'processing', 'completed', 'failed']
            },
            resultUrl: { type: 'string', format: 'uri' },
            errorMessage: { type: 'string' }
          }
        },
        ReadinessCheck: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'string' },
            state: { type: 'string', enum: ['ready', 'attention'] },
            detail: { type: 'string' }
          }
        }
      }
    }
  })
}

function paidCallOperation(method: 'GET' | 'POST') {
  return {
    tags: ['x402'],
    summary: `${method} a paid API product`,
    security: [{ x402Payment: [] }],
    parameters: [
      {
        name: 'slug',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          enum: marketplaceProducts.map(product => product.slug)
        }
      }
    ],
    requestBody:
      method === 'POST'
        ? {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true }
              }
            }
          }
        : undefined,
    responses: {
      '200': {
        description: 'Paid provider response and receipt metadata',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                order: { $ref: '#/components/schemas/Order' },
                receipt: { $ref: '#/components/schemas/Receipt' },
                data: { type: 'object', additionalProperties: true }
              }
            }
          }
        }
      },
      '402': {
        description: 'x402 MUSD payment required'
      },
      '502': {
        description: 'Provider request failed'
      }
    }
  }
}
