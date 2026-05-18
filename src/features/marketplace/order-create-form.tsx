'use client'

import { FormEvent, useMemo, useState } from 'react'

import { useRouter } from 'nextjs-toploader/app'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'
import type { ApiProduct } from '@/features/marketplace/products'
import type { MarketplaceOrder } from '@/features/marketplace/types'
import { cn } from '@/lib/utils/cn'

type RequestFieldValue = string | boolean

type OrderCreateFormProps = {
  product: Pick<
    ApiProduct,
    'slug' | 'name' | 'referencePayload' | 'requestSchema'
  >
  compact?: boolean
}

export function OrderCreateForm({ product, compact }: OrderCreateFormProps) {
  return (
    <WalletAddressConsumer>
      {({ address }) => (
        <OrderCreateFormFields
          product={product}
          connectedWallet={address}
          compact={compact}
        />
      )}
    </WalletAddressConsumer>
  )
}

function OrderCreateFormFields({
  product,
  connectedWallet,
  compact = false
}: OrderCreateFormProps & {
  connectedWallet: string | null
}) {
  const router = useRouter()
  const fieldEntries = useMemo(
    () => Object.entries(product.requestSchema),
    [product.requestSchema]
  )
  const hasStructuredFields = fieldEntries.length > 0
  const defaultValues = useMemo(
    () =>
      getInitialFieldValues(product.requestSchema, product.referencePayload),
    [product.requestSchema, product.referencePayload]
  )
  const [fieldValues, setFieldValues] =
    useState<Record<string, RequestFieldValue>>(defaultValues)
  const [rawPayloadJson, setRawPayloadJson] = useState(
    JSON.stringify(product.referencePayload, null, 2)
  )
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [buyerWallet, setBuyerWallet] = useState(connectedWallet ?? '')

  const requestPayloadJson = useMemo(() => {
    if (!hasStructuredFields) {
      return rawPayloadJson
    }

    try {
      return JSON.stringify(
        buildPayloadFromFields(fieldEntries, fieldValues),
        null,
        2
      )
    } catch {
      return '{}'
    }
  }, [fieldEntries, fieldValues, hasStructuredFields, rawPayloadJson])

  function updateField(name: string, value: RequestFieldValue) {
    setFieldValues(current => ({ ...current, [name]: value }))
  }

  function resetSamplePayload() {
    setFieldValues(defaultValues)
    setRawPayloadJson(JSON.stringify(product.referencePayload, null, 2))
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const requestPayload = hasStructuredFields
        ? buildPayloadFromFields(fieldEntries, fieldValues)
        : parseRawPayload(rawPayloadJson)

      validateBuyerWallet(buyerWallet)

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: product.slug,
          buyerWallet,
          requestPayloadJson: JSON.stringify(requestPayload)
        })
      })
      const order = (await response.json()) as MarketplaceOrder & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(order.error ?? 'Unable to prepare the API request.')
      }

      window.sessionStorage.setItem(
        `tollora:order:${order.id}`,
        JSON.stringify(order)
      )
      router.push(`/orders/${order.id}`)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to prepare the API request.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-5'>
      <Card className={cn('space-y-6', compact && 'p-5')}>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Test request
            </p>
            <h2 className='mt-2 text-2xl font-semibold'>
              Build a payable API call
            </h2>
            <p className='text-foreground/65 mt-2 max-w-2xl text-sm leading-6'>
              Fill the fields generated from this listing schema. Tollora
              creates a payable order first; the wallet payment happens on the
              Run & Pay page before the provider receives the request.
            </p>
          </div>
          <Button type='button' variant='outline' onClick={resetSamplePayload}>
            Use sample payload
          </Button>
        </div>

        <label className='space-y-2'>
          <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Buyer wallet <span className='text-red-500'>*</span>
          </span>
          <Input
            name='buyerWallet'
            value={buyerWallet}
            onChange={event => setBuyerWallet(event.target.value)}
            placeholder='Connect a wallet or paste the buyer wallet address'
            required
            pattern='^0x[a-fA-F0-9]{40}$'
          />
          <span className='text-foreground/60 block text-xs leading-5'>
            This wallet owns the request and signs the x402 payment on the next
            page.
          </span>
        </label>

        {hasStructuredFields ? (
          <div className='grid gap-4 lg:grid-cols-2'>
            {fieldEntries.map(([fieldName, fieldType]) => (
              <RequestSchemaField
                key={fieldName}
                name={fieldName}
                typeLabel={fieldType}
                value={fieldValues[fieldName] ?? ''}
                onChange={value => updateField(fieldName, value)}
              />
            ))}
          </div>
        ) : (
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Request JSON <span className='text-red-500'>*</span>
            </span>
            <textarea
              value={rawPayloadJson}
              onChange={event => setRawPayloadJson(event.target.value)}
              className='border-border bg-card text-foreground focus-visible:ring-ring focus-visible:ring-offset-background min-h-64 w-full rounded-lg border px-4 py-3 font-mono text-xs leading-6 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              required
            />
          </label>
        )}

        <details className='border-border/80 bg-background/40 rounded-lg border p-4'>
          <summary className='cursor-pointer text-sm font-semibold'>
            JSON request preview
          </summary>
          <pre className='bg-muted mt-4 max-h-80 overflow-auto rounded-lg p-4 text-xs leading-6 whitespace-pre-wrap'>
            {requestPayloadJson}
          </pre>
        </details>
      </Card>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Preparing request' : 'Create payable test run'}
        </Button>
        {error ? (
          <p className='text-sm text-red-600' role='alert'>
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function RequestSchemaField({
  name,
  typeLabel,
  value,
  onChange
}: {
  name: string
  typeLabel: string
  value: RequestFieldValue
  onChange: (value: RequestFieldValue) => void
}) {
  const label = humanizeFieldName(name)
  const required = isRequiredField(typeLabel)
  const options = getUnionOptions(typeLabel)
  const lowerName = name.toLowerCase()
  const lowerType = typeLabel.toLowerCase()
  const isBoolean = lowerType.includes('boolean')
  const isNumber =
    lowerType.includes('number') ||
    lowerType.includes('integer') ||
    lowerType.includes('float')
  const isUrl = lowerName.includes('url') || lowerType.includes('url')
  const isLongText =
    lowerName.includes('prompt') ||
    lowerName.includes('script') ||
    lowerName.includes('summary') ||
    lowerName.includes('description') ||
    lowerName.includes('context') ||
    lowerType.includes('object') ||
    lowerType.includes('array') ||
    lowerType.includes('json')

  return (
    <label className={cn('space-y-2', isLongText && 'lg:col-span-2')}>
      <span className='text-foreground/60 flex flex-wrap items-center gap-2 text-xs tracking-[0.16em] uppercase'>
        {label}
        {required ? <span className='text-red-500'>*</span> : null}
        <span className='bg-muted text-foreground/70 rounded-md px-2 py-1 font-mono text-[0.65rem] tracking-normal normal-case'>
          {typeLabel}
        </span>
      </span>
      {isBoolean ? (
        <select
          value={String(value || false)}
          onChange={event => onChange(event.target.value === 'true')}
          required={required}
          className='border-border bg-card text-foreground focus-visible:ring-ring focus-visible:ring-offset-background h-11 w-full rounded-lg border px-4 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
        >
          <option value='true'>true</option>
          <option value='false'>false</option>
        </select>
      ) : options.length > 1 ? (
        <select
          value={String(value)}
          onChange={event => onChange(event.target.value)}
          required={required}
          className='border-border bg-card text-foreground focus-visible:ring-ring focus-visible:ring-offset-background h-11 w-full rounded-lg border px-4 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
        >
          {!required ? <option value=''>Leave empty</option> : null}
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : isLongText ? (
        <textarea
          value={String(value)}
          onChange={event => onChange(event.target.value)}
          required={required}
          className='border-border bg-card text-foreground focus-visible:ring-ring focus-visible:ring-offset-background min-h-32 w-full rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
        />
      ) : (
        <Input
          type={isNumber ? 'number' : isUrl ? 'url' : 'text'}
          step={isNumber ? 'any' : undefined}
          value={String(value)}
          onChange={event => onChange(event.target.value)}
          required={required}
        />
      )}
    </label>
  )
}

function getInitialFieldValues(
  schema: Record<string, string>,
  referencePayload: Record<string, unknown>
) {
  return Object.fromEntries(
    Object.keys(schema).map(fieldName => [
      fieldName,
      stringifyReferenceValue(referencePayload[fieldName])
    ])
  ) as Record<string, RequestFieldValue>
}

function stringifyReferenceValue(value: unknown): RequestFieldValue {
  if (typeof value === 'boolean') {
    return value
  }

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function buildPayloadFromFields(
  fieldEntries: [string, string][],
  fieldValues: Record<string, RequestFieldValue>
) {
  return Object.fromEntries(
    fieldEntries
      .map(([fieldName, typeLabel]) => [
        fieldName,
        coerceFieldValue(fieldName, typeLabel, fieldValues[fieldName])
      ])
      .filter(([, value]) => value !== undefined)
  )
}

function coerceFieldValue(
  fieldName: string,
  typeLabel: string,
  value: RequestFieldValue | undefined
) {
  const lowerType = typeLabel.toLowerCase()
  const lowerName = fieldName.toLowerCase()
  const required = isRequiredField(typeLabel)

  if (value === undefined || value === '') {
    if (required) {
      throw new Error(`${humanizeFieldName(fieldName)} is required.`)
    }

    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (
    lowerType.includes('number') ||
    lowerType.includes('integer') ||
    lowerType.includes('float')
  ) {
    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) {
      throw new Error(`${humanizeFieldName(fieldName)} must be a number.`)
    }

    return numberValue
  }

  if (lowerName.includes('url') || lowerType.includes('url')) {
    try {
      return new URL(value).toString()
    } catch {
      throw new Error(`${humanizeFieldName(fieldName)} must be a valid URL.`)
    }
  }

  if (
    lowerType.includes('object') ||
    lowerType.includes('array') ||
    lowerType.includes('json')
  ) {
    try {
      return JSON.parse(value) as unknown
    } catch {
      throw new Error(`${humanizeFieldName(fieldName)} must be valid JSON.`)
    }
  }

  return value
}

function parseRawPayload(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Request JSON must be an object.')
    }

    return parsed
  } catch {
    throw new Error('Request JSON must be a valid JSON object.')
  }
}

function validateBuyerWallet(value: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error('Buyer wallet must be a valid 0x wallet address.')
  }
}

function isRequiredField(typeLabel: string) {
  if (/undefined|optional|null/i.test(typeLabel)) {
    return false
  }

  return /\brequired\b/i.test(typeLabel)
}

function getUnionOptions(typeLabel: string) {
  if (!typeLabel.includes('|')) {
    return []
  }

  return stripRequirementLabel(typeLabel)
    .split('|')
    .map(option => option.trim().replace(/^['"]|['"]$/g, ''))
    .filter(option => !/undefined|optional|null/i.test(option))
}

function stripRequirementLabel(typeLabel: string) {
  return typeLabel.replace(/\s*\((required|optional)\)\s*$/i, '')
}

function humanizeFieldName(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}
