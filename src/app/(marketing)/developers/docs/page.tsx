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
          title='Calling a paid Tollora API'
          body='A buyer integrates against the hosted Tollora product endpoint, not this repository. Their backend, CLI, or autonomous agent uses an x402 buyer client to handle the 402 response, sign the MUSD payment, retry the request, and read the paid response.'
        />
        <DocSection
          title='x402 payments'
          body={`Tollora uses ${x402Network} for Mezo Testnet payment requirements. Prices are expressed as dollar strings and resolve to MUSD through the x402 EVM stablecoin registry.`}
        />
        <DocSection
          title='Plain curl vs paid clients'
          body='A plain curl request is only a diagnostic check; it should return HTTP 402 with payment requirements. Production callers use @x402/fetch, @x402/axios, the x402 Go client, or the x402 Python client with a funded Mezo MUSD signer.'
        />
        <DocSection
          title='Where buyer code runs'
          body='Keep buyer private keys in a backend, CLI, worker, or autonomous-agent runtime. Browser frontends should call their own backend or use a wallet/paywall flow; they should not embed private keys in React code.'
        />
        <DocSection
          title='Managed credits'
          body='x402 is the native path. Managed credits are a convenience layer for teams that want API keys: create a credit account, record a MUSD top-up transaction, then call credit-backed product endpoints with a Tollora API key while Tollora debits the off-chain balance and records usage receipts.'
        />
        <DocSection
          title='Provider onboarding'
          body='Providers do not need to rebuild their API around x402. They list their existing HTTPS endpoint, schema, price, receiving wallet, execution mode, settlement model, result delivery model, and optional webhook. Tollora handles the 402 payment flow, then forwards the paid request to the provider adapter or configured endpoint.'
        />
        <DocSection
          title='Long-running API billing'
          body='Fast APIs use pay-after-successful-response: Tollora calls the provider, then settles MUSD only when the provider returns a successful response. Long-running APIs can use pay-on-job-acceptance when providers incur immediate cost, or pay-to-claim-result when buyers should only pay after completion. Async products return a job ID and are updated through polling or webhooks.'
        />
        <DocSection
          title='Receipt format'
          body='Receipts include product, provider, buyer wallet, provider wallet, amount in MUSD, network, transaction hash, request ID, timestamp, and result URL when the provider response exposes one.'
        />
        <DocSection
          title='External API adapter'
          body='Provider-created listings use a generic HTTP adapter. Tollora forwards paid requests to the configured upstream endpoint, applies server-side provider credentials, sends idempotency headers, extracts job IDs and result URLs from configured JSON paths, and polls status endpoints for async products.'
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
          title='OpenAPI import'
          body='Providers can import hosted or uploaded OpenAPI JSON/YAML documents from the List a paid API page. Tollora turns operations into listing candidates and pre-fills endpoint URL, method, auth type, request schema, response schema, reference payload, async polling, and result-path fields.'
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
  "allowedTools": ["cliplore-video-job-api"],
  "mode": "local"
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Buyer integration
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`npm install @x402/fetch @x402/evm viem

import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.EVM_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("Set EVM_PRIVATE_KEY to a Mezo MUSD-funded wallet.");
}

const signer = privateKeyToAccount(privateKey);
const client = new x402Client();

registerExactEvmScheme(client, { signer });

const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const response = await fetchWithPayment(
  "https://tollora.vercel.app/api/x402/products/cliplore-video-job-api/call",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Create a product launch video.",
      format: "portrait",
      durationSeconds: 30
    })
  }
);

console.log(await response.json());`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Managed-credit API key
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`POST /api/credits/accounts
Content-Type: application/json

{ "wallet": "0x7CE33579392AEAF1791c9B0c8302a502B5867688" }

POST /api/credits/top-ups
Content-Type: application/json

{
  "wallet": "0x7CE33579392AEAF1791c9B0c8302a502B5867688",
  "amountMusd": 25,
  "settlementTxHash": "0x1111111111111111111111111111111111111111111111111111111111111111"
}

POST /api/credits/products/cliplore-video-job-api/call
Authorization: Bearer tlr_your_api_key
Content-Type: application/json

{
  "prompt": "Create a product launch video.",
  "format": "portrait",
  "durationSeconds": 30
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Provider integration
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`POST /api/providers/self/products
Content-Type: application/json

{
  "name": "ClipLore Video Job API",
  "slug": "cliplore-video-job-api",
  "category": "media",
  "priceUsd": 18,
  "method": "POST",
  "endpointUrl": "https://cliplore.ai/api/v1/video/jobs",
  "authType": "bearer",
  "authSecret": "provider_api_key",
  "executionMode": "asynchronous",
  "settlementModel": "pay_on_job_acceptance",
  "resultDelivery": "poll_or_webhook",
  "statusEndpointUrl": "https://cliplore.ai/api/v1/video/jobs/{externalJobId}",
  "externalJobIdPath": "jobId",
  "statusPath": "status",
  "resultUrlPath": "resultUrl",
  "receivingWallet": "0x7CE33579392AEAF1791c9B0c8302a502B5867688",
  "requestSchemaJson": "{\\"prompt\\":\\"string\\",\\"format\\":\\"portrait | landscape | square\\"}",
  "responseSchemaJson": "{\\"jobId\\":\\"string\\",\\"status\\":\\"string\\",\\"resultUrl\\":\\"string | undefined\\"}",
  "referencePayloadJson": "{\\"prompt\\":\\"Create a product launch video.\\",\\"format\\":\\"portrait\\",\\"durationSeconds\\":30}",
  "status": "published",
  "isAgentReady": true
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          OpenAPI import
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`POST /api/providers/openapi/preview
Content-Type: application/json

{
  "specUrl": "https://cliplore.ai/api/openapi.json",
  "baseUrl": "https://cliplore.ai/api/v1"
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
