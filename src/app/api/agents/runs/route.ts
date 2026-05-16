import { NextResponse } from 'next/server'

import { createAgentRunSchema } from '@/features/agents/schemas'
import { createAgentRun, listAgentRuns } from '@/features/agents/store'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    runs: listAgentRuns()
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createAgentRunSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid agent run payload.',
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  const run = createAgentRun(parsed.data)

  return NextResponse.json(run)
}
