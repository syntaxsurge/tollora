import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyTextButton } from '@/features/marketplace/copy-endpoint-button'
import {
  getProductBySlug,
  marketplaceProducts
} from '@/features/marketplace/products'

type ProductPageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return marketplaceProducts.map(product => ({ slug: product.slug }))
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const endpointUrl = new URL(product.endpointPath, appUrl).toString()
  const requestPayload = JSON.stringify(product.referencePayload, null, 2)
  const compactPayload = JSON.stringify(product.referencePayload)
  const queryString = new URLSearchParams(
    Object.entries(product.referencePayload).map(([key, value]) => [
      key,
      String(value)
    ])
  ).toString()
  const callUrl =
    product.method === 'GET' && queryString
      ? `${endpointUrl}?${queryString}`
      : endpointUrl
  const curlCommand =
    product.method === 'POST'
      ? `curl -i -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '${compactPayload}'`
      : `curl -i "${callUrl}"`
  const installCommand = 'npm install @x402/fetch @x402/evm viem'
  const paidRequestOptions =
    product.method === 'POST'
      ? `{
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  },
  body: JSON.stringify(${requestPayload})
}`
      : `{
  method: "GET",
  headers: {
    Accept: "application/json"
  }
}`
  const buyerIntegrationTarget =
    product.method === 'GET'
      ? `\`${endpointUrl}?\${params}\``
      : `"${endpointUrl}"`
  const buyerIntegrationSetup =
    product.method === 'GET'
      ? `const params = new URLSearchParams(${requestPayload});
`
      : ''
  const buyerIntegrationCode = `import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
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
${buyerIntegrationSetup}const response = await fetchWithPayment(${buyerIntegrationTarget}, ${paidRequestOptions});

const body = await response.json();
const payment = new x402HTTPClient(client).getPaymentSettleResponse(name =>
  response.headers.get(name)
);

console.log({ body, payment });`

  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <div className='grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start'>
          <div className='min-w-0 space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge>{product.category}</Badge>
              <Badge>{product.method}</Badge>
              {product.isX402Protected ? <Badge>x402 protected</Badge> : null}
              {product.isAgentReady ? <Badge>Agent-ready</Badge> : null}
            </div>
            <div>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                {product.providerName}
              </p>
              <h1 className='font-display mt-2 text-4xl'>{product.name}</h1>
            </div>
            <p className='text-foreground/70 max-w-2xl text-sm leading-6'>
              {product.description}
            </p>
            <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
              <Link
                href={`/orders/new?product=${product.slug}`}
                className={buttonClasses({ size: 'sm' })}
              >
                Run with wallet
              </Link>
              <a
                href='#use-from-code'
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Use from code
              </a>
              <Link
                href={`/agents/new?tool=${product.slug}`}
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Use in agent run
              </Link>
            </div>
          </div>
          <Card className='bg-background/85 min-w-0 space-y-4'>
            {[
              ['Price', product.priceLabel],
              ['Settlement', 'MUSD on Mezo Testnet'],
              ['Processing', product.estimatedLatency],
              ['Endpoint', endpointUrl]
            ].map(([label, value]) => (
              <div key={label}>
                <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                  {label}
                </p>
                <p className='mt-1 min-w-0 text-sm font-semibold break-all'>
                  {value}
                </p>
              </div>
            ))}
            <CopyTextButton text={endpointUrl} label='Copy endpoint' />
          </Card>
        </div>
      </section>

      <section className='grid min-w-0 gap-5 2xl:grid-cols-2'>
        <SchemaCard title='Request schema' schema={product.requestSchema} />
        <SchemaCard title='Response schema' schema={product.responseSchema} />
      </section>

      <section className='grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
        <Card className='min-w-0'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Reference request body
            </p>
            <CopyTextButton text={requestPayload} label='Copy JSON' />
          </div>
          <pre className='bg-muted mt-4 max-w-full overflow-x-auto rounded-lg p-4 text-xs leading-6 break-words whitespace-pre-wrap'>
            {requestPayload}
          </pre>
        </Card>
        <Card id='use-from-code' className='min-w-0 scroll-mt-28 space-y-5'>
          <div className='space-y-2'>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              External app integration
            </p>
            <p className='text-foreground/70 text-sm leading-6'>
              Developers do not clone Tollora to use this API. Their backend,
              CLI, or agent calls this hosted endpoint with an x402 buyer
              client; the client reads the 402 payment requirement, signs the
              MUSD payment, retries, and receives the paid response. Keep the
              signer on a server or agent runtime, not in client-side browser
              code.
            </p>
          </div>

          <CodeBlock
            title='Install in your app'
            code={installCommand}
            copyLabel='Copy install'
          />
          <CodeBlock
            title='Call from your backend or agent'
            code={buyerIntegrationCode}
            copyLabel='Copy integration'
          />
          <CodeBlock
            title='Inspect payment requirement'
            code={curlCommand}
            copyLabel='Copy curl'
          />
        </Card>
      </section>
    </div>
  )
}

function SchemaCard({
  title,
  schema
}: {
  title: string
  schema: Record<string, string>
}) {
  return (
    <Card className='min-w-0'>
      <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {title}
      </p>
      <div className='mt-4 grid gap-3'>
        {Object.entries(schema).map(([field, type]) => (
          <div
            key={field}
            className='border-foreground/10 grid min-w-0 gap-2 rounded-lg border p-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]'
          >
            <span className='min-w-0 font-mono text-sm font-semibold break-words'>
              {field}
            </span>
            <span className='text-foreground/70 min-w-0 font-mono text-sm break-words'>
              {type}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function CodeBlock({
  title,
  code,
  copyLabel
}: {
  title: string
  code: string
  copyLabel: string
}) {
  return (
    <div className='min-w-0 space-y-3'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          {title}
        </p>
        <CopyTextButton text={code} label={copyLabel} />
      </div>
      <pre className='bg-muted max-w-full overflow-x-auto rounded-lg p-4 text-xs leading-6 break-words whitespace-pre-wrap'>
        {code}
      </pre>
    </div>
  )
}
