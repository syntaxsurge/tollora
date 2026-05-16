import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  getOrCreateManagedCreditAccount,
  toPublicManagedCreditAccount
} from '@/features/billing/managed-credits'

const creditAccountSchema = z.object({
  wallet: z.string().trim().min(10)
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = creditAccountSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid credit account payload.',
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  const account = getOrCreateManagedCreditAccount(parsed.data.wallet)

  return NextResponse.json({
    account: toPublicManagedCreditAccount(account)
  })
}
