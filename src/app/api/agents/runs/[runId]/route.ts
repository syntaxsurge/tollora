import { NextResponse } from 'next/server'

import { getAgentRun } from '@/features/agents/store'

export const dynamic = 'force-dynamic'

type AgentRunRouteProps = {
  params: Promise<{
    runId: string
  }>
}

export async function GET(_request: Request, { params }: AgentRunRouteProps) {
  const run = getAgentRun((await params).runId)

  if (!run) {
    return NextResponse.json(
      { error: 'Agent run was not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json(run)
}
