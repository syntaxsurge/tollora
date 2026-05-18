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
          body='Providers do not need to rebuild their API around x402. They list an existing HTTPS endpoint, schema, provider authentication, pricing model, receiving wallet, execution mode, settlement model, result delivery model, and optional webhook. Tollora handles the 402 payment flow, then forwards only paid or reserved requests to the provider adapter or configured endpoint.'
        />
        <DocSection
          title='Fixed pricing'
          body='Use fixed pricing when the API has a predictable cost per request: text transforms, enrichment calls, short synchronous lookups, simple data APIs, or any operation where the provider can safely charge the same MUSD amount for every successful call. Tollora returns one exact x402 payment requirement for the configured price.'
        />
        <DocSection
          title='Credit-metered pricing'
          body='Use credit-metered pricing when cost depends on duration, token count, generated assets, processing tier, output size, or another provider-defined usage unit. The provider exposes either a cheap quote endpoint or a deterministic numeric field in the request. Tollora reads that number, applies the configured MUSD-per-credit rate, multiplier, minimum, and maximum, then requests x402 payment before expensive work starts.'
        />
        <DocSection
          title='Provider quote contract'
          body='A quote endpoint must be cheap and side-effect free. It should not create jobs, render media, call expensive models, or deduct provider credits. It should return a numeric estimate such as estimatedCredits, usage.estimatedCredits, or billing.estimatedCredits. Tollora maps the configured dot-path to an exact MUSD quote.'
        />
        <DocSection
          title='External prepaid jobs'
          body='For long-running credit-metered APIs, Tollora forwards billingMode: external_prepaid and a generic externalReference object after x402 settlement. Providers should record the external reference and reservation metadata, start work only for that accepted request, and return generic billing fields such as estimatedCredits, chargedCredits, refundedCredits, billingStatus, and refundReason.'
        />
        <DocSection
          title='Final usage and deltas'
          body='When final usage equals the quote, Tollora releases the result. When final usage is lower, Tollora records the unused amount as buyer credit or refundable value. When final usage is higher, Tollora keeps the final payload locked and asks the buyer or agent to pay the delta through another x402 claim before revealing the result.'
        />
        <DocSection
          title='Long-running API billing'
          body='Fast APIs can use pay-after-successful-response when no provider cost is incurred before success. Long-running or variable-cost APIs should use quote-first, pay-before-work: Tollora quotes the request, settles or reserves MUSD through x402, starts the provider job, then polls or receives webhook updates until the result is ready.'
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
  "allowedTools": ["media-launch-job-api"],
  "mode": "local"
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Fixed-price provider response
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`HTTP/1.1 200 OK
Content-Type: application/json

{
  "summary": "The buyer receives the completed synchronous result.",
  "requestId": "provider_req_123"
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Credit-metered quote response
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`HTTP/1.1 200 OK
Content-Type: application/json

{
  "estimatedCredits": 180,
  "breakdown": [
    { "label": "duration", "credits": 120 },
    { "label": "qualityTier", "credits": 60 }
  ],
  "billing": {
    "unit": "credit",
    "estimatedCredits": 180
  }
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          External prepaid job request
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`{
  "prompt": "Create a product launch asset.",
  "durationSeconds": 30,
  "quality": "1080p",
  "billingMode": "external_prepaid",
  "externalReference": {
    "orderId": "ord_abc123",
    "receiptId": "rcpt_def456",
    "buyerReference": "0xBuyer...",
    "settlementReference": "rcpt_def456"
  }
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Async job status response
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`HTTP/1.1 200 OK
Content-Type: application/json

{
  "jobId": "job_123",
  "status": "completed",
  "progress": 100,
  "resultUrl": "https://provider.example/results/job_123",
  "estimatedCredits": 180,
  "chargedCredits": 160,
  "refundedCredits": 20,
  "billingStatus": "partially_refunded",
  "refundReason": "Actual usage was lower than the estimate.",
  "externalReference": {
    "orderId": "ord_abc123",
    "receiptId": "rcpt_def456"
  }
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
  "https://tollora.vercel.app/api/x402/products/media-launch-job-api/call",
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

POST /api/credits/products/media-launch-job-api/call
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
  "name": "Media Launch Job API",
  "slug": "media-launch-job-api",
  "category": "media",
  "pricingModel": "credit_metered",
  "priceUsd": 2,
  "pricingQuoteEndpointUrl": "https://provider.example/api/quote",
  "pricingCreditUnitPath": "estimatedCredits",
  "pricingUsageCreditPath": "chargedCredits",
  "pricingCreditToMusdRate": 0.01,
  "pricingMultiplier": 1.2,
  "pricingMinimumChargeUsd": 1,
  "pricingMaximumChargeUsd": 50,
  "method": "POST",
  "endpointUrl": "https://provider.example/api/jobs",
  "authType": "bearer",
  "authSecret": "provider_api_key",
  "executionMode": "asynchronous",
  "settlementModel": "pay_on_job_acceptance",
  "resultDelivery": "poll_or_webhook",
  "statusEndpointUrl": "https://provider.example/api/jobs/{externalJobId}",
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
  "specUrl": "https://provider.example/api/openapi.json",
  "baseUrl": "https://provider.example/api"
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
