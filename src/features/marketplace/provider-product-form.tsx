'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { apiProductCategories } from '@/features/marketplace/schemas'

const defaultRequestSchema = JSON.stringify(
  {
    owner: 'string',
    repo: 'string'
  },
  null,
  2
)

const defaultResponseSchema = JSON.stringify(
  {
    fullName: 'string',
    stars: 'number',
    openIssues: 'number',
    defaultBranch: 'string'
  },
  null,
  2
)

const defaultReferencePayload = JSON.stringify(
  {
    owner: 'mezo-org',
    repo: 'mezod'
  },
  null,
  2
)

export function ProviderProductForm() {
  const router = useRouter()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultWallet = useMemo(
    () => '0x7CE33579392AEAF1791c9B0c8302a502B5867688',
    []
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    try {
      const response = await fetch('/api/providers/self/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          priceUsd: Number(payload.priceUsd),
          isX402Protected: true,
          isAgentReady: true
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
            defaultValue='Mezo Repository Metadata API'
          />
          <Field
            label='Slug'
            name='slug'
            defaultValue='mezo-repository-metadata-api'
          />
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Category
            </span>
            <select
              name='category'
              defaultValue='developer'
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
            defaultValue='0.12'
          />
          <Field
            label='Provider endpoint URL'
            name='endpointUrl'
            type='url'
            defaultValue='https://api.github.com/repos/mezo-org/mezod'
          />
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              HTTP method
            </span>
            <select
              name='method'
              defaultValue='GET'
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value='POST'>POST</option>
              <option value='GET'>GET</option>
            </select>
          </label>
          <Field
            label='Owner wallet'
            name='ownerWallet'
            defaultValue={defaultWallet}
          />
          <Field
            label='Receiving wallet'
            name='receivingWallet'
            defaultValue={defaultWallet}
          />
          <Field
            label='Provider display name'
            name='providerDisplayName'
            defaultValue='Tollora Labs'
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
            defaultValue='Fetch public Mezo repository metadata, normalize it for agent workflows, and sell the response through a MUSD-paid API call.'
            className='border-foreground/15 bg-background text-foreground placeholder:text-foreground/50 focus-visible:ring-foreground/30 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          />
        </label>
      </Card>

      <Card className='grid gap-4 lg:grid-cols-3'>
        <JsonField
          label='Request schema'
          name='requestSchemaJson'
          defaultValue={defaultRequestSchema}
        />
        <JsonField
          label='Response schema'
          name='responseSchemaJson'
          defaultValue={defaultResponseSchema}
        />
        <JsonField
          label='Reference payload'
          name='referencePayloadJson'
          defaultValue={defaultReferencePayload}
        />
      </Card>

      <Field
        label='Webhook URL'
        name='webhookUrl'
        type='url'
        defaultValue='https://tollora.vercel.app/api/provider-webhooks/cliplore'
      />

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
  step
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  step?: string
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
        required={name !== 'webhookUrl'}
      />
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
