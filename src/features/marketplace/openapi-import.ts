import { parse as parseYaml } from 'yaml'

import type {
  ApiProductCategory,
  ApiProductExecutionMode,
  ApiProductResultDelivery,
  ApiProductSettlementModel
} from '@/features/marketplace/products'

export type OpenApiImportCandidate = {
  operationId: string
  label: string
  name: string
  slug: string
  category: ApiProductCategory
  method: 'GET' | 'POST'
  endpointUrl: string
  authType: 'none' | 'bearer' | 'api_key_header' | 'api_key_query'
  authHeaderName: string
  authQueryParam: string
  executionMode: ApiProductExecutionMode
  settlementModel: ApiProductSettlementModel
  resultDelivery: ApiProductResultDelivery
  estimatedLatency: string
  statusEndpointUrl: string
  externalJobIdPath: string
  statusPath: string
  resultUrlPath: string
  errorMessagePath: string
  requestSchema: Record<string, string>
  responseSchema: Record<string, string>
  referencePayload: Record<string, unknown>
}

type OpenApiDocument = {
  openapi?: string
  swagger?: string
  info?: {
    title?: string
  }
  servers?: { url?: string }[]
  paths?: Record<string, Record<string, OpenApiOperation>>
  components?: {
    schemas?: Record<string, unknown>
    securitySchemes?: Record<
      string,
      {
        type?: string
        scheme?: string
        in?: string
        name?: string
      }
    >
  }
}

type OpenApiOperation = {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  security?: Record<string, unknown[]>[]
  requestBody?: {
    content?: Record<string, { schema?: unknown; example?: unknown }>
  }
  responses?: Record<
    string,
    {
      content?: Record<string, { schema?: unknown; example?: unknown }>
    }
  >
}

const httpMethods = ['get', 'post'] as const

export function parseOpenApiDocument(input: string) {
  const trimmed = input.trim()

  if (!trimmed) {
    throw new Error('OpenAPI document is empty.')
  }

  return (trimmed.startsWith('{') || trimmed.startsWith('[')
    ? JSON.parse(trimmed)
    : parseYaml(trimmed)) as OpenApiDocument
}

export function createOpenApiImportCandidates({
  document,
  sourceUrl,
  baseUrl
}: {
  document: OpenApiDocument
  sourceUrl?: string
  baseUrl?: string
}) {
  if (!document.paths) {
    throw new Error('OpenAPI document does not include a paths object.')
  }

  const resolvedBaseUrl = resolveBaseUrl({
    document,
    sourceUrl,
    baseUrl
  })
  const operations = Object.entries(document.paths).flatMap(
    ([path, pathItem]) =>
      httpMethods.flatMap(method => {
        const operation = pathItem[method]

        if (!operation) {
          return []
        }

        return [
          buildCandidate({
            document,
            operation,
            path,
            method: method.toUpperCase() as 'GET' | 'POST',
            baseUrl: resolvedBaseUrl
          })
        ]
      })
  )

  return operations
}

function buildCandidate({
  document,
  operation,
  path,
  method,
  baseUrl
}: {
  document: OpenApiDocument
  operation: OpenApiOperation
  path: string
  method: 'GET' | 'POST'
  baseUrl: string
}): OpenApiImportCandidate {
  const name = operation.summary || operation.operationId || titleize(path)
  const responseStatus = pickResponseStatus(operation)
  const responseSchema = getResponseSchema(document, operation, responseStatus)
  const requestSchema = getRequestSchema(document, operation)
  const schemaFields = schemaToFieldMap(requestSchema)
  const responseFields = schemaToFieldMap(responseSchema)
  const acceptedAsync = responseStatus === '202'
  const jobIdPath = pickFirstField(responseFields, [
    'jobId',
    'mediaJobId',
    'renderId',
    'transcriptionId',
    'voiceoverId',
    'id'
  ])
  const statusPath = pickFirstField(responseFields, ['status', 'state'])
  const resultUrlPath = pickFirstField(responseFields, [
    'resultUrl',
    'renderUrl',
    'previewUrl',
    'url',
    'outputUrl'
  ])
  const pollingPath = acceptedAsync
    ? findPollingPath(document, path, jobIdPath)
    : ''

  return {
    operationId: operation.operationId || `${method.toLowerCase()}-${path}`,
    label: `${method} ${path}`,
    name,
    slug: slugify(name),
    category: inferCategory(operation, path),
    method,
    endpointUrl: joinUrl(baseUrl, path),
    authType: inferAuthType(document, operation),
    authHeaderName: 'Authorization',
    authQueryParam: '',
    executionMode: acceptedAsync ? 'asynchronous' : 'synchronous',
    settlementModel: acceptedAsync
      ? 'pay_on_job_acceptance'
      : 'pay_on_successful_response',
    resultDelivery: acceptedAsync ? 'poll_or_webhook' : 'direct_response',
    estimatedLatency: acceptedAsync ? 'Async provider job' : 'Provider response',
    statusEndpointUrl: pollingPath
      ? joinUrl(baseUrl, pollingPath).replace(/\{[^}]+\}/g, '{externalJobId}')
      : '',
    externalJobIdPath: jobIdPath,
    statusPath,
    resultUrlPath,
    errorMessagePath: pickFirstField(responseFields, [
      'errorMessage',
      'message',
      'error'
    ]),
    requestSchema: schemaFields,
    responseSchema: responseFields,
    referencePayload: schemaToExamplePayload(requestSchema)
  }
}

function resolveBaseUrl({
  document,
  sourceUrl,
  baseUrl
}: {
  document: OpenApiDocument
  sourceUrl?: string
  baseUrl?: string
}) {
  const serverUrl = baseUrl || document.servers?.[0]?.url || ''

  if (/^https?:\/\//i.test(serverUrl)) {
    return serverUrl.replace(/\/$/, '')
  }

  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
    const origin = new URL(sourceUrl).origin

    return new URL(serverUrl || '/', origin).toString().replace(/\/$/, '')
  }

  return serverUrl.replace(/\/$/, '')
}

function inferAuthType(document: OpenApiDocument, operation: OpenApiOperation) {
  const securityName = Object.keys(operation.security?.[0] ?? {})[0]
  const security = securityName
    ? document.components?.securitySchemes?.[securityName]
    : undefined

  if (security?.type === 'http' && security.scheme === 'bearer') {
    return 'bearer'
  }

  if (security?.type === 'apiKey' && security.in === 'query') {
    return 'api_key_query'
  }

  if (security?.type === 'apiKey') {
    return 'api_key_header'
  }

  return 'none'
}

function inferCategory(
  operation: OpenApiOperation,
  path: string
): ApiProductCategory {
  const text = `${operation.tags?.join(' ') ?? ''} ${operation.summary ?? ''} ${path}`.toLowerCase()

  if (text.includes('video') || text.includes('media') || text.includes('image')) {
    return 'media'
  }

  if (text.includes('agent') || text.includes('workflow')) {
    return 'agent'
  }

  if (text.includes('billing') || text.includes('commerce')) {
    return 'commerce'
  }

  if (text.includes('usage') || text.includes('data')) {
    return 'data'
  }

  return 'developer'
}

function getRequestSchema(
  document: OpenApiDocument,
  operation: OpenApiOperation
) {
  return resolveSchema(
    document,
    operation.requestBody?.content?.['application/json']?.schema
  )
}

function getResponseSchema(
  document: OpenApiDocument,
  operation: OpenApiOperation,
  status: string
) {
  return resolveSchema(
    document,
    operation.responses?.[status]?.content?.['application/json']?.schema
  )
}

function pickResponseStatus(operation: OpenApiOperation) {
  return (
    ['202', '201', '200'].find(status => operation.responses?.[status]) ??
    Object.keys(operation.responses ?? {})[0] ??
    '200'
  )
}

function resolveSchema(document: OpenApiDocument, schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const ref = (schema as { $ref?: string }).$ref

  if (ref?.startsWith('#/components/schemas/')) {
    const name = ref.replace('#/components/schemas/', '')

    return resolveSchema(document, document.components?.schemas?.[name])
  }

  return schema
}

function schemaToFieldMap(schema: unknown) {
  const properties = readSchemaProperties(schema)

  if (!properties) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      describeSchemaField(value)
    ])
  )
}

function schemaToExamplePayload(schema: unknown) {
  const properties = readSchemaProperties(schema)

  if (!properties) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      exampleValueForSchema(value)
    ])
  )
}

function readSchemaProperties(schema: unknown) {
  if (!schema || typeof schema !== 'object') {
    return null
  }

  return (schema as { properties?: Record<string, unknown> }).properties ?? null
}

function describeSchemaField(schema: unknown): string {
  if (!schema || typeof schema !== 'object') {
    return 'unknown'
  }

  const field = schema as {
    type?: string
    enum?: unknown[]
    format?: string
    items?: { type?: string }
    nullable?: boolean
  }

  if (field.enum?.length) {
    return field.enum.map(item => JSON.stringify(item)).join(' | ')
  }

  if (field.type === 'array') {
    return `${field.items?.type ?? 'unknown'}[]`
  }

  return [field.type ?? 'object', field.format].filter(Boolean).join(':')
}

function exampleValueForSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') {
    return ''
  }

  const field = schema as {
    example?: unknown
    default?: unknown
    enum?: unknown[]
    type?: string
    items?: unknown
  }

  if (field.example !== undefined) {
    return field.example
  }

  if (field.default !== undefined) {
    return field.default
  }

  if (field.enum?.length) {
    return field.enum[0]
  }

  if (field.type === 'number' || field.type === 'integer') {
    return 1
  }

  if (field.type === 'boolean') {
    return true
  }

  if (field.type === 'array') {
    return []
  }

  return ''
}

function findPollingPath(
  document: OpenApiDocument,
  createPath: string,
  jobIdPath: string
) {
  if (!jobIdPath || !document.paths) {
    return ''
  }

  const candidates = Object.entries(document.paths)
    .filter(([, pathItem]) => Boolean(pathItem.get))
    .map(([path]) => path)

  return (
    candidates.find(
      path =>
        path.startsWith(createPath.replace(/\/$/, '')) && path.includes('{')
    ) ??
    candidates.find(path =>
      path.toLowerCase().includes(jobIdPath.toLowerCase().replace(/id$/, ''))
    ) ??
    ''
  )
}

function pickFirstField(fields: Record<string, string>, names: string[]) {
  const keys = Object.keys(fields)

  return names.find(name => keys.includes(name)) ?? ''
}

function joinUrl(baseUrl: string, path: string) {
  if (!baseUrl) {
    return path
  }

  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function titleize(path: string) {
  return path
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .map(segment => segment.replace(/-/g, ' '))
    .join(' ')
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'api-product'
  )
}
