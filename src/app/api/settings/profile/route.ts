import { NextRequest, NextResponse } from 'next/server'

import {
  getUserProfile,
  saveUserProfile
} from '@/lib/settings/user-profile-store'
import { defaultUserSettings } from '@/lib/settings/user-settings'
import type { UserSettings } from '@/lib/settings/user-settings'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get('walletAddress')

  if (!walletAddress) {
    return NextResponse.json(
      {
        error: 'Wallet address is required.'
      },
      { status: 400 }
    )
  }

  const profile = getUserProfile(walletAddress)

  return NextResponse.json({
    settings: profile?.settings ?? defaultUserSettings,
    profile: profile ?? null
  })
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    walletAddress?: unknown
    settings?: unknown
  } | null

  if (!body || typeof body.walletAddress !== 'string') {
    return NextResponse.json(
      {
        error: 'Wallet address is required.'
      },
      { status: 400 }
    )
  }

  if (!isUserSettingsInput(body.settings)) {
    return NextResponse.json(
      {
        error: 'Profile settings are required.'
      },
      { status: 400 }
    )
  }

  const result = saveUserProfile({
    walletAddress: body.walletAddress,
    settings: body.settings
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        message: result.error
      },
      { status: result.status }
    )
  }

  return NextResponse.json({
    settings: result.profile.settings,
    profile: result.profile
  })
}

function isUserSettingsInput(value: unknown): value is UserSettings {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<UserSettings>

  return (
    typeof candidate.fullName === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.plan === 'string' &&
    typeof candidate.timezone === 'string' &&
    typeof candidate.dashboardLanding === 'string' &&
    typeof candidate.dashboardDensity === 'string' &&
    typeof candidate.emailDigest === 'boolean' &&
    typeof candidate.productUpdates === 'boolean' &&
    typeof candidate.securityAlerts === 'boolean' &&
    typeof candidate.publicProfile === 'boolean'
  )
}
