'use client'

import { HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, type ReactNode, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { OpenApiImportCandidate } from '@/features/marketplace/openapi-import'
import type {
  ApiProductAuthType,
  ApiProductExecutionMode
} from '@/features/marketplace/products'
import {
  apiProductAuthTypes,
  apiProductCategories,
  apiProductExecutionModes,
  apiProductResultDeliveries,
  apiProductSettlementModels
} from '@/features/marketplace/schemas'

const emptyJsonObject = JSON.stringify({}, null, 2)

export function ProviderProductForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authType, setAuthType] = useState<ApiProductAuthType>('bearer')
  const [executionMode, setExecutionMode] =
    useState<ApiProductExecutionMode>('synchronous')
  const authSecretIsRequired = [
    'bearer',
    'api_key_header',
    'api_key_query'
  ].includes(authType)
  const isBasicAuth = authType === 'basic'
  const isQueryKeyAuth = authType === 'api_key_query'
  const isHeaderAuth = authType === 'bearer' || authType === 'api_key_header'
  const isAsyncProduct = executionMode === 'asynchronous'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    const isAgentReady = formData.get('isAgentReady') === 'on'

    try {
      const response = await fetch('/api/providers/self/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          priceUsd: Number(payload.priceUsd),
          timeoutSeconds: Number(payload.timeoutSeconds),
          isX402Protected: true,
          isAgentReady
        })
      })
      const data = (await response.json()) as {
        error?: string
        slug?: string
      }

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to create the API product.')
      }

      setStatus('API product saved and ready for review.')
      router.push(`/provider/products/${data.slug}`)
      router.refresh()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create the API product.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function applyOpenApiCandidate(candidate: OpenApiImportCandidate) {
    const form = formRef.current

    if (!form) {
      return
    }

    setFormValue(form, 'name', candidate.name)
    setFormValue(form, 'slug', candidate.slug)
    setFormValue(form, 'category', candidate.category)
    setFormValue(
      form,
      'description',
      `${candidate.name} from imported OpenAPI operation ${candidate.label}.`
    )
    setFormValue(form, 'endpointUrl', candidate.endpointUrl)
    setFormValue(form, 'method', candidate.method)
    setAuthType(candidate.authType)
    setFormValue(form, 'authType', candidate.authType)
    setFormValue(form, 'authHeaderName', candidate.authHeaderName)
    setFormValue(form, 'authQueryParam', candidate.authQueryParam)
    setExecutionMode(candidate.executionMode)
    setFormValue(form, 'executionMode', candidate.executionMode)
    setFormValue(form, 'settlementModel', candidate.settlementModel)
    setFormValue(form, 'resultDelivery', candidate.resultDelivery)
    setFormValue(form, 'estimatedLatency', candidate.estimatedLatency)
    setFormValue(form, 'statusEndpointUrl', candidate.statusEndpointUrl)
    setFormValue(form, 'statusMethod', 'GET')
    setFormValue(form, 'externalJobIdPath', candidate.externalJobIdPath)
    setFormValue(form, 'statusPath', candidate.statusPath)
    setFormValue(form, 'resultUrlPath', candidate.resultUrlPath)
    setFormValue(form, 'errorMessagePath', candidate.errorMessagePath)
    setFormValue(
      form,
      'requestSchemaJson',
      JSON.stringify(candidate.requestSchema, null, 2)
    )
    setFormValue(
      form,
      'responseSchemaJson',
      JSON.stringify(candidate.responseSchema, null, 2)
    )
    setFormValue(
      form,
      'referencePayloadJson',
      JSON.stringify(candidate.referencePayload, null, 2)
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className='space-y-6'>
      <OpenApiImportPanel onApply={applyOpenApiCandidate} />

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Product details
          </p>
          <h2 className='font-display mt-2 text-2xl'>API listing</h2>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <Field
            label='Product name'
            name='name'
            defaultValue=''
            help='The buyer-facing name shown in the marketplace and receipts.'
          />
          <Field
            label='Slug'
            name='slug'
            defaultValue=''
            help='Stable URL identifier for the Tollora endpoint. Use lowercase letters, numbers, and hyphens.'
          />
          <SelectField
            label='Category'
            name='category'
            defaultValue='media'
            help='Marketplace grouping used for discovery and filtering.'
          >
            {apiProductCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </SelectField>
          <Field
            label='Price in MUSD'
            name='priceUsd'
            type='number'
            step='0.01'
            defaultValue=''
            help='Amount charged for each successful paid call through x402.'
          />
          <Field
            label='Provider endpoint URL'
            name='endpointUrl'
            type='url'
            defaultValue=''
            help='The real upstream URL Tollora forwards paid requests to after settlement.'
          />
          <SelectField
            label='HTTP method'
            name='method'
            defaultValue='POST'
            help='The upstream method for this product operation.'
          >
            <option value='POST'>POST</option>
            <option value='GET'>GET</option>
          </SelectField>
          <Field
            label='Owner wallet'
            name='ownerWallet'
            defaultValue=''
            help='Wallet that manages this provider listing in Tollora.'
          />
          <Field
            label='Receiving wallet'
            name='receivingWallet'
            defaultValue=''
            help='Wallet that receives MUSD payments for this API product.'
          />
          <Field
            label='Provider display name'
            name='providerDisplayName'
            defaultValue=''
            help='Provider name shown on marketplace, order, and receipt pages.'
          />
          <SelectField
            label='Visibility'
            name='status'
            defaultValue='draft'
            help='Draft keeps the listing private; published makes it available to buyers and agents.'
          >
            <option value='draft'>Draft</option>
            <option value='published'>Published</option>
            <option value='paused'>Paused</option>
          </SelectField>
        </div>
        <JsonTextField
          label='Description'
          name='description'
          defaultValue=''
          help='Short explanation of what buyers receive from this API operation.'
          minHeight='min-h-28'
          required
        />
      </Card>

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Provider authentication
          </p>
          <h2 className='font-display mt-2 text-2xl'>Private upstream API</h2>
          <p className='text-foreground/65 mt-2 text-sm leading-6'>
            Tollora keeps this credential server-side and uses it only when a
            paid buyer request is forwarded to the provider API.
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <SelectField
            label='Auth type'
            name='authType'
            defaultValue='bearer'
            value={authType}
            onChange={value => setAuthType(value as ApiProductAuthType)}
            help='How Tollora authenticates to the upstream provider API.'
          >
            {apiProductAuthTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectField>
          <Field
            label='Auth secret or API key'
            name='authSecret'
            type='password'
            defaultValue=''
            required={authSecretIsRequired}
            help='Provider API key or token. Imported OpenAPI operations that declare bearer or API-key security require this secret before Tollora can forward paid calls.'
          />
          <Field
            label='Header name'
            name='authHeaderName'
            defaultValue='Authorization'
            required={isHeaderAuth}
            help='Header used for bearer or API-key-header auth.'
          />
          <Field
            label='Query parameter name'
            name='authQueryParam'
            defaultValue=''
            required={isQueryKeyAuth}
            help='Query parameter used when auth type is api_key_query.'
          />
          <Field
            label='Basic auth username'
            name='authUsername'
            defaultValue=''
            required={isBasicAuth}
            help='Username used only when auth type is basic.'
          />
          <Field
            label='Basic auth password'
            name='authPassword'
            type='password'
            defaultValue=''
            required={isBasicAuth}
            help='Password used only when auth type is basic.'
          />
        </div>
      </Card>

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Runtime model
          </p>
          <h2 className='font-display mt-2 text-2xl'>
            Sync, async, and settlement behavior
          </h2>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <SelectField
            label='Execution mode'
            name='executionMode'
            defaultValue='synchronous'
            value={executionMode}
            onChange={value =>
              setExecutionMode(value as ApiProductExecutionMode)
            }
            help='Synchronous APIs return the final result immediately; asynchronous APIs return a job ID.'
          >
            {apiProductExecutionModes.map(mode => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </SelectField>
          <SelectField
            label='Settlement model'
            name='settlementModel'
            defaultValue='pay_on_successful_response'
            help='Defines when the buyer should pay relative to provider success or job acceptance.'
          >
            {apiProductSettlementModels.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </SelectField>
          <SelectField
            label='Result delivery'
            name='resultDelivery'
            defaultValue='direct_response'
            help='How buyers retrieve the usable result after the paid call.'
          >
            {apiProductResultDeliveries.map(delivery => (
              <option key={delivery} value={delivery}>
                {delivery}
              </option>
            ))}
          </SelectField>
          <Field
            label='Estimated latency'
            name='estimatedLatency'
            defaultValue='Depends on provider'
            help='Human-readable time estimate shown on product pages.'
          />
          <Field
            label='Timeout seconds'
            name='timeoutSeconds'
            type='number'
            defaultValue='60'
            help='Maximum time Tollora waits for the upstream provider response.'
          />
          <Field
            label='Idempotency header'
            name='idempotencyHeader'
            defaultValue='Idempotency-Key'
            required={false}
            help='Optional upstream header Tollora sends to avoid duplicate provider jobs.'
          />
        </div>
      </Card>

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Async polling
          </p>
          <h2 className='font-display mt-2 text-2xl'>Job status mapping</h2>
          <p className='text-foreground/65 mt-2 text-sm leading-6'>
            Fill this only for async APIs that return a provider job ID. For
            ClipLore video or media jobs, import OpenAPI and Tollora fills the
            likely polling URL and JSON paths. Fast quote/read endpoints can
            stay synchronous and leave this section blank.
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <Field
            label='Status endpoint URL'
            name='statusEndpointUrl'
            type='url'
            defaultValue=''
            required={isAsyncProduct}
            help='Polling URL for async jobs. Use {externalJobId} where the job ID belongs.'
          />
          <SelectField
            label='Status method'
            name='statusMethod'
            defaultValue='GET'
            required={isAsyncProduct}
            help='HTTP method Tollora uses to poll the upstream job status.'
          >
            <option value='GET'>GET</option>
            <option value='POST'>POST</option>
          </SelectField>
          <Field
            label='External job ID path'
            name='externalJobIdPath'
            defaultValue='jobId'
            required={isAsyncProduct}
            help='Dot-path where Tollora finds the provider job ID in the first response.'
          />
          <Field
            label='Status path'
            name='statusPath'
            defaultValue='status'
            required={isAsyncProduct}
            help='Dot-path where Tollora reads completed, processing, or failed status.'
          />
          <Field
            label='Result URL path'
            name='resultUrlPath'
            defaultValue='resultUrl'
            required={false}
            help='Dot-path where Tollora reads the final output URL when available.'
          />
          <Field
            label='Error message path'
            name='errorMessagePath'
            defaultValue='errorMessage'
            required={false}
            help='Dot-path where Tollora reads provider error details.'
          />
        </div>
      </Card>

      <Card className='grid gap-4 lg:grid-cols-3'>
        <JsonField
          label='Request schema'
          name='requestSchemaJson'
          defaultValue={emptyJsonObject}
          help='JSON object mapping request field names to simple type descriptions.'
        />
        <JsonField
          label='Response schema'
          name='responseSchemaJson'
          defaultValue={emptyJsonObject}
          help='JSON object mapping response field names to simple type descriptions.'
        />
        <JsonField
          label='Reference payload'
          name='referencePayloadJson'
          defaultValue={emptyJsonObject}
          help='Example JSON request shown to buyers and used by agent runs as a starting payload.'
        />
      </Card>

      <Field
        label='Webhook URL'
        name='webhookUrl'
        type='url'
        defaultValue=''
        required={false}
        help='Optional provider callback URL for future webhook coordination.'
      />

      <label className='border-foreground/10 flex items-start gap-3 rounded-lg border p-4 text-sm'>
        <input
          type='checkbox'
          name='isAgentReady'
          defaultChecked
          className='mt-1'
        />
        <span>
          <span className='block font-semibold'>
            Make this listing available to autonomous agents
          </span>
          <span className='text-foreground/65 mt-1 block leading-6'>
            Agent-ready products appear as selectable tools in the agent run
            builder after they are published.
          </span>
        </span>
      </label>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Saving product' : 'Save API product'}
        </Button>
        {status ? (
          <p className='text-foreground/65 text-sm' role='status'>
            {status}
          </p>
        ) : null}
        {error ? (
          <p className='text-sm text-red-600' role='alert'>
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function OpenApiImportPanel({
  onApply
}: {
  onApply: (candidate: OpenApiImportCandidate) => void
}) {
  const [specUrl, setSpecUrl] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [specText, setSpecText] = useState('')
  const [candidates, setCandidates] = useState<OpenApiImportCandidate[]>([])
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const selectedCandidate =
    candidates.find(
      candidate => candidate.operationId === selectedOperationId
    ) ?? candidates[0]

  async function handleFile(file: File | undefined) {
    if (!file) {
      return
    }

    setSpecText(await file.text())
    setSpecUrl('')
  }

  async function handleImport() {
    setStatus('')
    setError('')
    setIsImporting(true)

    try {
      const response = await fetch('/api/providers/openapi/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specUrl, specText, baseUrl })
      })
      const data = (await response.json()) as {
        error?: string
        info?: { title: string; operationCount: number }
        candidates?: OpenApiImportCandidate[]
      }

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to import OpenAPI document.')
      }

      const nextCandidates = data.candidates ?? []
      setCandidates(nextCandidates)
      setSelectedOperationId(nextCandidates[0]?.operationId ?? '')
      setStatus(
        `Imported ${nextCandidates.length} operation${nextCandidates.length === 1 ? '' : 's'} from ${data.info?.title ?? 'OpenAPI'}.`
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to import OpenAPI document.'
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card className='space-y-5'>
      <div>
        <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
          Fast setup
        </p>
        <h2 className='font-display mt-2 text-2xl'>Import OpenAPI</h2>
        <p className='text-foreground/65 mt-2 text-sm leading-6'>
          Paste an OpenAPI JSON/YAML URL or upload a spec file. Tollora reads
          the operations, detects auth and async jobs, then fills the listing
          fields for the selected endpoint.
        </p>
      </div>
      <div className='grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end'>
        <Field
          label='OpenAPI URL'
          name='openApiUrlPreview'
          type='url'
          defaultValue=''
          required={false}
          help='Public URL to the provider OpenAPI JSON or YAML document.'
          value={specUrl}
          onChange={setSpecUrl}
        />
        <Field
          label='Override server URL'
          name='openApiBaseUrlPreview'
          type='url'
          defaultValue=''
          required={false}
          help='Optional base URL when the OpenAPI servers value is relative or points to staging.'
          value={baseUrl}
          onChange={setBaseUrl}
        />
        <Button type='button' onClick={handleImport} disabled={isImporting}>
          {isImporting ? 'Importing' : 'Import spec'}
        </Button>
      </div>
      <div className='grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end'>
        <label className='space-y-2'>
          <HelpLabel
            label='Upload OpenAPI file'
            required={false}
            help='Use this when the provider spec is local instead of hosted at a URL.'
          />
          <Input
            type='file'
            accept='.json,.yaml,.yml,application/json,text/yaml,application/yaml'
            className='file:bg-muted file:text-foreground hover:file:bg-accent/10 flex h-16 cursor-pointer items-center py-0 leading-[4rem] file:mr-4 file:h-9 file:rounded-md file:border-0 file:px-4 file:text-sm file:font-semibold'
            onChange={event => handleFile(event.target.files?.[0])}
          />
        </label>
        <SelectField
          label='Imported operation'
          name='openApiOperationPreview'
          defaultValue={selectedOperationId}
          required={false}
          help='Choose which imported endpoint should become this paid marketplace listing.'
          value={selectedOperationId}
          onChange={setSelectedOperationId}
        >
          {candidates.length === 0 ? (
            <option value=''>Import a spec first</option>
          ) : null}
          {candidates.map(candidate => (
            <option key={candidate.operationId} value={candidate.operationId}>
              {candidate.label} - {candidate.name}
            </option>
          ))}
        </SelectField>
        <Button
          type='button'
          variant='outline'
          disabled={!selectedCandidate}
          onClick={() => selectedCandidate && onApply(selectedCandidate)}
        >
          Fill listing
        </Button>
      </div>
      {status ? (
        <p className='text-foreground/65 text-sm' role='status'>
          {status}
        </p>
      ) : null}
      {error ? (
        <p className='text-sm text-red-600' role='alert'>
          {error}
        </p>
      ) : null}
    </Card>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  step,
  required = true,
  help,
  value,
  onChange
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  step?: string
  required?: boolean
  help: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className='space-y-2'>
      <HelpLabel label={label} help={help} required={required} />
      <Input
        name={name}
        type={type}
        step={step}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={
          onChange ? event => onChange(event.currentTarget.value) : undefined
        }
        required={required}
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  children,
  help,
  required = true,
  value,
  onChange
}: {
  label: string
  name: string
  defaultValue: string
  children: ReactNode
  help: string
  required?: boolean
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className='space-y-2'>
      <HelpLabel label={label} help={help} required={required} />
      <select
        name={name}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={
          onChange ? event => onChange(event.currentTarget.value) : undefined
        }
        required={required}
        className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
      >
        {children}
      </select>
    </label>
  )
}

function JsonField({
  label,
  name,
  defaultValue,
  help
}: {
  label: string
  name: string
  defaultValue: string
  help: string
  required?: boolean
}) {
  return (
    <label className='space-y-2'>
      <HelpLabel label={label} help={help} required={false} />
      <textarea
        name={name}
        defaultValue={defaultValue}
        className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 min-h-56 w-full rounded-2xl border px-4 py-3 font-mono text-xs leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
      />
    </label>
  )
}

function JsonTextField({
  label,
  name,
  defaultValue,
  help,
  minHeight,
  required = false
}: {
  label: string
  name: string
  defaultValue: string
  help: string
  minHeight: string
  required?: boolean
}) {
  return (
    <label className='space-y-2'>
      <HelpLabel label={label} help={help} required={required} />
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={`border-foreground/15 bg-background text-foreground placeholder:text-foreground/50 focus-visible:ring-foreground/30 w-full rounded-2xl border px-4 py-3 text-sm leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${minHeight}`}
      />
    </label>
  )
}

function HelpLabel({
  label,
  help,
  required = true
}: {
  label: string
  help: string
  required?: boolean
}) {
  return (
    <span className='text-foreground/60 flex items-center gap-2 text-xs tracking-[0.16em] uppercase'>
      {label}
      {required ? (
        <span className='text-red-500' aria-label='required'>
          *
        </span>
      ) : null}
      <span className='group relative inline-flex'>
        <HelpCircle className='text-foreground/45 h-3.5 w-3.5' aria-hidden />
        <span className='bg-card text-card-foreground border-border ring-foreground/10 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 -translate-x-1/2 rounded-lg border p-3 text-xs leading-5 tracking-normal normal-case opacity-100 shadow-xl ring-1 shadow-black/30 group-focus-within:block group-hover:block dark:bg-slate-950 dark:text-white dark:ring-white/10'>
          {help}
        </span>
      </span>
    </span>
  )
}

function setFormValue(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name)

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
  }
}
