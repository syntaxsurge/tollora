'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, type ReactNode, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
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
          />
          <Field
            label='Slug'
            name='slug'
            defaultValue=''
          />
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Category
            </span>
            <select
              name='category'
              defaultValue='media'
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              {apiProductCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <Field
            label='Price in MUSD'
            name='priceUsd'
            type='number'
            step='0.01'
            defaultValue=''
          />
          <Field
            label='Provider endpoint URL'
            name='endpointUrl'
            type='url'
            defaultValue=''
          />
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              HTTP method
            </span>
            <select
              name='method'
              defaultValue='POST'
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value='POST'>POST</option>
              <option value='GET'>GET</option>
            </select>
          </label>
          <Field
            label='Owner wallet'
            name='ownerWallet'
            defaultValue=''
          />
          <Field
            label='Receiving wallet'
            name='receivingWallet'
            defaultValue=''
          />
          <Field
            label='Provider display name'
            name='providerDisplayName'
            defaultValue=''
          />
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Visibility
            </span>
            <select
              name='status'
              defaultValue='draft'
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value='draft'>Draft</option>
              <option value='published'>Published</option>
              <option value='paused'>Paused</option>
            </select>
          </label>
        </div>
        <label className='space-y-2'>
          <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Description
          </span>
          <textarea
            name='description'
            defaultValue=''
            className='border-foreground/15 bg-background text-foreground placeholder:text-foreground/50 focus-visible:ring-foreground/30 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            required
          />
        </label>
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
          <SelectField label='Auth type' name='authType' defaultValue='bearer'>
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
            required={false}
          />
          <Field
            label='Header name'
            name='authHeaderName'
            defaultValue='Authorization'
            required={false}
          />
          <Field
            label='Query parameter name'
            name='authQueryParam'
            defaultValue=''
            required={false}
          />
          <Field
            label='Basic auth username'
            name='authUsername'
            defaultValue=''
            required={false}
          />
          <Field
            label='Basic auth password'
            name='authPassword'
            type='password'
            defaultValue=''
            required={false}
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
            defaultValue='asynchronous'
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
            defaultValue='pay_on_job_acceptance'
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
            defaultValue='poll_or_webhook'
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
          />
          <Field
            label='Timeout seconds'
            name='timeoutSeconds'
            type='number'
            defaultValue='60'
          />
          <Field
            label='Idempotency header'
            name='idempotencyHeader'
            defaultValue='Idempotency-Key'
            required={false}
          />
        </div>
      </Card>

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Async polling
          </p>
          <h2 className='font-display mt-2 text-2xl'>Job status mapping</h2>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <Field
            label='Status endpoint URL'
            name='statusEndpointUrl'
            type='url'
            defaultValue=''
            required={false}
          />
          <SelectField label='Status method' name='statusMethod' defaultValue='GET'>
            <option value='GET'>GET</option>
            <option value='POST'>POST</option>
          </SelectField>
          <Field
            label='External job ID path'
            name='externalJobIdPath'
            defaultValue='jobId'
            required={false}
          />
          <Field
            label='Status path'
            name='statusPath'
            defaultValue='status'
            required={false}
          />
          <Field
            label='Result URL path'
            name='resultUrlPath'
            defaultValue='resultUrl'
            required={false}
          />
          <Field
            label='Error message path'
            name='errorMessagePath'
            defaultValue='errorMessage'
            required={false}
          />
        </div>
      </Card>

      <Card className='grid gap-4 lg:grid-cols-3'>
        <JsonField
          label='Request schema'
          name='requestSchemaJson'
          defaultValue={emptyJsonObject}
        />
        <JsonField
          label='Response schema'
          name='responseSchemaJson'
          defaultValue={emptyJsonObject}
        />
        <JsonField
          label='Reference payload'
          name='referencePayloadJson'
          defaultValue={emptyJsonObject}
        />
      </Card>

      <Field
        label='Webhook URL'
        name='webhookUrl'
        type='url'
        defaultValue=''
        required={false}
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

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  step,
  required = true
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  step?: string
  required?: boolean
}) {
  return (
    <label className='space-y-2'>
      <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {label}
      </span>
      <Input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  children
}: {
  label: string
  name: string
  defaultValue: string
  children: ReactNode
}) {
  return (
    <label className='space-y-2'>
      <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
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
  defaultValue
}: {
  label: string
  name: string
  defaultValue: string
}) {
  return (
    <label className='space-y-2'>
      <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 min-h-56 w-full rounded-2xl border px-4 py-3 font-mono text-xs leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
      />
    </label>
  )
}
