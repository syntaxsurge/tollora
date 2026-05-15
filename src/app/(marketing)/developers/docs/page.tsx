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
          title='Provider onboarding'
          body='Providers define product metadata, price, method, endpoint URL, request schema, response schema, sample payload, webhook URL, and receiving wallet address. Published products appear in the marketplace after moderation.'
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
          title='Webhook events'
          body='Provider webhooks post status changes with order ID, external job ID, status, optional receipt ID, result URL, and error message. ClipLore signatures are verified when the webhook secret is configured.'
        />
      </section>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Agent example
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`POST /api/x402/products/cliplore-ai-video-generator/call
Content-Type: application/json

{
  "prompt": "Create a product teaser for a MUSD-native paid API gateway.",
  "format": "vertical",
  "duration": "30s"
}`}
        </pre>
      </Card>

      <Card>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          ClipLore webhook
        </p>
        <pre className='bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs leading-6'>
          {`POST /api/provider-webhooks/cliplore
Content-Type: application/json
X-ClipLore-Signature: sha256=ad6e7b7d9d61c3bf7f9f7b6b0c0f7a1e53f6a8a426d4c23bb2bb52f8e4a91461

{
  "orderId": "ord_6f8d2a44c9b1",
  "receiptId": "rcpt_24d7c6fae911",
  "externalJobId": "clip_6f8d2a44c9b1",
  "status": "completed",
  "resultUrl": "https://media.cliplore.ai/jobs/clip_6f8d2a44c9b1/result.mp4"
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
