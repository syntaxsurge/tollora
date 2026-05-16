import { NextResponse } from 'next/server'

import { executeStoredAgentRun } from '@/features/agents/store'

export const dynamic = 'force-dynamic'

type ExecuteAgentRunRouteProps = {
  params: Promise<{
    runId: string
  }>
}

export async function POST(
  _request: Request,
  { params }: ExecuteAgentRunRouteProps
) {
  const run = await executeStoredAgentRun((await params).runId)

  if (!run) {
    return NextResponse.json(
      { error: 'Agent run was not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json(run)
}
