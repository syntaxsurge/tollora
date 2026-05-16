import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { x402Network } from '@/lib/config/chains'

export default function DeveloperDocsPage() {
  return (
    <div className='mx-auto w-full max-w-5xl space-y-8 px-6 py-16'>
      <section className='space-y-4'>
        <Badge>Docs</Badge>
        <h1 className='font-display text-4xl'>Tollora API gateway</h1>
        <p className='text-foreground/70 max-w-3xl text-sm leading-6'>
          Tollora routes paid API calls through HTTP 402 payment requirements,
          MUSD settlement on Mezo, provider request forwarding, and receipt
          records for buyers, providers, and programmatic clients.
        </p>
        <div className='flex flex-col gap-3 sm:flex-row'>
          <Link href='/api/reference' className={buttonClasses({ size: 'sm' })}>
            Open API reference
          </Link>
          <Link
            href='/api/openapi.json'
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Open OpenAPI JSON
          </Link>
        </div>
      </section>

      <section className='grid gap-5'>
        <DocSection
          title='Calling a paid API'
          body='Call the Tollora product endpoint with the provider payload. If the request is unpaid, the gateway responds with payment requirements. After signing the MUSD payment payload, retry the same request and receive the paid API response.'
        />
        <DocSection
          title='x402 payments'
          body={`Tollora uses ${x402Network} for Mezo Testnet payment requirements. Prices are expressed as dollar strings and resolve to MUSD through the x402 EVM stablecoin registry.`}
        />
        <DocSection
          title='Terminal buyers'
          body='A plain curl request should return HTTP 402 with payment requirements. A paid terminal or agent integration should use @x402/fetch with a funded Mezo MUSD signer so the client signs the payment, retries the request, and receives the paid response.'
        />
        <DocSection
          title='Provider onboarding'
          body='Providers define product metadata, price, method, endpoint URL, request schema, response schema, reference payload, webhook URL, and receiving wallet address. Published products appear in the marketplace after moderation.'
        />
        <DocSection
          title='Receipt format'
          body='Receipts include product, provider, buyer wallet, provider wallet, amount in MUSD, network, transaction hash, request ID, timestamp, and result URL when the provider response exposes one.'
        />
        <DocSection
          title='ClipLore provider adapter'
          body='The ClipLore adapter validates prompt, format, duration, optional script, and source preferences, starts video jobs through the configured ClipLore API, sends Tollora order and receipt metadata as the external reference, and accepts signed webhook status updates.'
        />
        <DocSection
          title='Autonomous agent runs'
          body='Agent runs accept an objective, source context, budget cap, max paid actions, owner wallet, allowed tools, and signer mode. The runner plans a launch-pack workflow, spends only through selected x402 product endpoints, and returns deliverables plus receipt metadata.'
        />
        <DocSection
          title='Mezo proof attestation'
          body='Completed agent runs hash the objective, selected tools, paid action log, response hashes, receipt IDs, and final deliverables. Tollora writes that proof hash to AgentRunAttestor on Mezo so the public proof page can be audited without publishing private content on-chain.'
        />
        <DocSection
          title='Webhook events'
          body='Provider webhooks post status changes with order ID, external job ID, status, optional receipt ID, result URL, and error message. ClipLore signatures are verified when the webhook secret is configured.'
        />
      </section>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Agent run
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`POST /api/agents/runs
Content-Type: application/json

{
  "objective": "Create a launch pack for my paid API product.",
  "ownerWallet": "0x7CE33579392AEAF1791c9B0c8302a502B5867688",
  "budgetCapMusd": 20,
  "maxPaidActions": 3,
  "allowedTools": ["prompt-enhancer-api", "document-summary-api", "market-snapshot-api"],
  "mode": "local"
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Paid terminal call
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`pnpm x402:call prompt-enhancer-api --payload '{"prompt":"Write a launch post for Tollora, a Mezo-native marketplace where agents buy paid APIs.","audience":"developers","outputStyle":"concise"}'`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          ClipLore webhook
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`POST /api/provider-webhooks/cliplore
Content-Type: application/json

{
  "orderId": "ord_6f8d2a44c9b1",
  "receiptId": "rcpt_24d7c6fae911",
  "externalJobId": "clip_6f8d2a44c9b1",
  "status": "completed",
  "resultUrl": "https://cliplore.ai"
}`}
        </pre>
      </Card>
    </div>
  )
}

function DocSection({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <h2 className='font-display text-2xl'>{title}</h2>
      <p className='text-foreground/70 mt-3 text-sm leading-6'>{body}</p>
    </Card>
  )
}
