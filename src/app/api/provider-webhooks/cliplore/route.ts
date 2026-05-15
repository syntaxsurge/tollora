import { createHmac, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { cliploreWebhookSchema } from '@/features/provider-adapters/cliplore/schemas'
import { envServer } from '@/lib/env/env.server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!isValidSignature(rawBody, request.headers.get('x-cliplore-signature'))) {
    return NextResponse.json(
      { error: 'Invalid ClipLore webhook signature.' },
      { status: 401 }
    )
  }

  const parsed = cliploreWebhookSchema.safeParse(parseJson(rawBody))

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid ClipLore webhook payload.',
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    accepted: true,
    event: {
      provider: 'cliplore',
      orderId: parsed.data.orderId,
      receiptId: parsed.data.receiptId,
      externalJobId: parsed.data.externalJobId,
      status: parsed.data.status,
      resultUrl: parsed.data.resultUrl,
      errorMessage: parsed.data.errorMessage
    }
  })
}

function parseJson(rawBody: string) {
  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    return null
  }
}

function isValidSignature(rawBody: string, signature: string | null) {
  if (!envServer.CLIPLORE_WEBHOOK_SECRET) {
    return true
  }

  if (!signature) {
    return false
  }

  const expected = createHmac('sha256', envServer.CLIPLORE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  const normalizedSignature = signature.replace(/^sha256=/, '')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const receivedBuffer = Buffer.from(normalizedSignature, 'hex')

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}
