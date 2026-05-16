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
      { name: 'Agents' },
      { name: 'Proofs' },
      { name: 'Credits' },
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
      '/api/credits/accounts': {
        post: {
          tags: ['Credits'],
          summary: 'Create or read a managed credit account and API key',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreditAccountRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Managed credit account',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreditAccountResponse' }
                }
              }
            },
            '400': { description: 'Invalid account payload' }
          }
        }
      },
      '/api/credits/top-ups': {
        post: {
          tags: ['Credits'],
          summary: 'Record a MUSD top-up for managed API-key usage',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreditTopUpRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Recorded top-up and updated account',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreditAccountResponse' }
                }
              }
            },
            '400': { description: 'Invalid top-up payload' }
          }
        }
      },
      '/api/credits/products/{slug}/call': {
        post: {
          tags: ['Credits'],
          summary: 'Call a product with managed credits and a Tollora API key',
          security: [{ tolloraApiKey: [] }],
          parameters: [pathStringParameter('slug')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true }
              }
            }
          },
          responses: {
            '200': {
              description: 'Provider response and managed-credit receipt',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaidProductResponse' }
                }
              }
            },
            '401': { description: 'Missing or invalid API key' },
            '402': { description: 'Managed credit balance is too low' }
          }
        }
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
      '/api/agents/runs': {
        get: {
          tags: ['Agents'],
          summary: 'List autonomous agent runs',
          responses: {
            '200': {
              description: 'Agent run list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      runs: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/AgentRun' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Agents'],
          summary: 'Create an autonomous agent run',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateAgentRunRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Planned agent run',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AgentRun' }
                }
              }
            },
            '400': { description: 'Invalid agent run payload' }
          }
        }
      },
      '/api/agents/runs/{runId}': {
        get: {
          tags: ['Agents'],
          summary: 'Get autonomous agent run status',
          parameters: [pathStringParameter('runId')],
          responses: {
            '200': {
              description: 'Agent run',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AgentRun' }
                }
              }
            },
            '404': { description: 'Agent run not found' }
          }
        }
      },
      '/api/agents/runs/{runId}/execute': {
        post: {
          tags: ['Agents'],
          summary: 'Execute paid actions for an autonomous agent run',
          parameters: [pathStringParameter('runId')],
          responses: {
            '200': {
              description: 'Executed agent run',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AgentRun' }
                }
              }
            },
            '404': { description: 'Agent run not found' }
          }
        }
      },
      '/api/agents/runs/{runId}/attest': {
        post: {
          tags: ['Agents'],
          summary: 'Attest an agent run proof hash on Mezo',
          parameters: [pathStringParameter('runId')],
          responses: {
            '200': {
              description: 'Attested agent run',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AgentRun' }
                }
              }
            },
            '404': { description: 'Agent run not found' }
          }
        }
      },
      '/api/proofs/{proofId}': {
        get: {
          tags: ['Proofs'],
          summary: 'Get a public agent run proof',
          parameters: [pathStringParameter('proofId')],
          responses: {
            '200': {
              description: 'Public agent proof',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AgentProofResponse' }
                }
              }
            },
            '404': { description: 'Proof not found' }
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
            'Signed x402 payment payload generated by an x402 buyer client for MUSD settlement on Mezo Testnet.'
        },
        tolloraApiKey: {
          type: 'http',
          scheme: 'bearer',
          description:
            'Managed-credit Tollora API key for teams that prefer prepaid API-key usage.'
        }
      },
      schemas: {
        CreditAccountRequest: {
          type: 'object',
          required: ['wallet'],
          properties: {
            wallet: { type: 'string' }
          }
        },
        CreditTopUpRequest: {
          type: 'object',
          required: ['wallet', 'amountMusd', 'settlementTxHash'],
          properties: {
            wallet: { type: 'string' },
            amountMusd: { type: 'number' },
            settlementTxHash: { type: 'string' }
          }
        },
        CreditAccountResponse: {
          type: 'object',
          properties: {
            account: { $ref: '#/components/schemas/CreditAccount' }
          }
        },
        CreditAccount: {
          type: 'object',
          properties: {
            wallet: { type: 'string' },
            apiKey: { type: 'string' },
            balanceMusd: { type: 'string' },
            topUps: { type: 'array', items: { type: 'object' } },
            debits: { type: 'array', items: { type: 'object' } }
          }
        },
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
        PaidProductResponse: {
          type: 'object',
          properties: {
            order: { $ref: '#/components/schemas/Order' },
            receipt: { $ref: '#/components/schemas/Receipt' },
            data: { type: 'object', additionalProperties: true }
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
        CreateAgentRunRequest: {
          type: 'object',
          required: [
            'objective',
            'ownerWallet',
            'budgetCapMusd',
            'maxPaidActions',
            'allowedTools'
          ],
          properties: {
            objective: { type: 'string' },
            sourceText: { type: 'string' },
            ownerWallet: { type: 'string' },
            budgetCapMusd: { type: 'number' },
            maxPaidActions: { type: 'number' },
            allowedTools: {
              type: 'array',
              items: {
                type: 'string',
                enum: marketplaceProducts.map(product => product.slug)
              }
            },
            mode: { type: 'string', enum: ['local', 'production'] }
          }
        },
        AgentRun: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            objective: { type: 'string' },
            ownerWallet: { type: 'string' },
            budgetCapMusd: { type: 'number' },
            maxPaidActions: { type: 'number' },
            status: { type: 'string' },
            summary: { type: 'string' },
            actions: {
              type: 'array',
              items: { $ref: '#/components/schemas/AgentAction' }
            },
            proof: { $ref: '#/components/schemas/AgentProof' }
          }
        },
        AgentAction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productSlug: { type: 'string' },
            status: { type: 'string' },
            amountMusd: { type: 'string' },
            orderId: { type: 'string' },
            requestId: { type: 'string' },
            receipt: { $ref: '#/components/schemas/Receipt' }
          }
        },
        AgentProof: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            runId: { type: 'string' },
            ownerWallet: { type: 'string' },
            proofHash: { type: 'string' },
            proofUri: { type: 'string' },
            network: { type: 'string', enum: [x402Network] },
            txHash: { type: ['string', 'null'] },
            explorerUrl: { type: ['string', 'null'] },
            receiptIds: { type: 'array', items: { type: 'string' } },
            totalSpendMusd: { type: 'string' }
          }
        },
        AgentProofResponse: {
          type: 'object',
          properties: {
            proof: { $ref: '#/components/schemas/AgentProof' },
            run: { type: 'object', additionalProperties: true }
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

function pathStringParameter(name: string) {
  return {
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' }
  }
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
