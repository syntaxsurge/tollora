import 'server-only'

import {
  readWorkspaceJsonArray,
  writeWorkspaceJsonArray
} from '@/lib/persistence/workspace-json-store'
import {
  defaultUserSettings,
  isUserSettingsComplete,
  normalizeUsername
} from '@/lib/settings/user-settings'
import type { UserSettings } from '@/lib/settings/user-settings'

export type UserProfileRecord = {
  walletAddress: string
  settings: UserSettings
  createdAt: string
  updatedAt: string
}

const profileStoreFile = 'user-profiles.json'
const reservedProfiles: UserProfileRecord[] = [
  {
    walletAddress: '0x7CE33579392AEAF1791c9B0c8302a502B5867688',
    settings: {
      ...defaultUserSettings,
      fullName: 'Tollora Labs',
      username: 'tollora',
      publicProfile: true
    },
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  }
]

export function listUserProfiles() {
  const savedProfiles = readWorkspaceJsonArray<UserProfileRecord>({
    fileName: profileStoreFile,
    isItem: isUserProfileRecord
  })
  const savedWallets = new Set(
    savedProfiles.map(profile => normalizeWallet(profile.walletAddress))
  )

  return [
    ...reservedProfiles.filter(
      profile => !savedWallets.has(normalizeWallet(profile.walletAddress))
    ),
    ...savedProfiles
  ]
}

export function getUserProfile(walletAddress: string) {
  const normalizedWallet = normalizeWallet(walletAddress)

  return listUserProfiles().find(
    profile => normalizeWallet(profile.walletAddress) === normalizedWallet
  )
}

export function saveUserProfile({
  walletAddress,
  settings
}: {
  walletAddress: string
  settings: UserSettings
}) {
  const normalizedWallet = normalizeWallet(walletAddress)
  const normalizedUsername = normalizeUsername(settings.username)
  const fullName = settings.fullName.trim()

  if (!normalizedWallet) {
    return {
      ok: false as const,
      status: 400,
      error: 'Wallet address is required.'
    }
  }

  if (fullName.length < 2) {
    return {
      ok: false as const,
      status: 400,
      error: 'Full name must be at least 2 characters.'
    }
  }

  const usernameError = validateStoredUsername(
    normalizedUsername,
    normalizedWallet
  )

  if (usernameError) {
    return {
      ok: false as const,
      status: 409,
      error: usernameError
    }
  }

  const now = new Date().toISOString()
  const savedProfiles = readWorkspaceJsonArray<UserProfileRecord>({
    fileName: profileStoreFile,
    isItem: isUserProfileRecord
  })
  const existingProfile = savedProfiles.find(
    profile => normalizeWallet(profile.walletAddress) === normalizedWallet
  )
  const nextProfile: UserProfileRecord = {
    walletAddress,
    settings: {
      ...defaultUserSettings,
      ...settings,
      fullName,
      username: normalizedUsername,
      publicProfile: true
    },
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now
  }
  const nextProfiles = existingProfile
    ? savedProfiles.map(profile =>
        normalizeWallet(profile.walletAddress) === normalizedWallet
          ? nextProfile
          : profile
      )
    : [...savedProfiles, nextProfile]

  writeWorkspaceJsonArray(profileStoreFile, nextProfiles)

  return {
    ok: true as const,
    profile: nextProfile
  }
}

export function validateStoredUsername(
  username: string,
  walletAddress: string
) {
  if (username.length < 3) {
    return 'Username must be at least 3 characters.'
  }

  if (username.length > 24) {
    return 'Username must be 24 characters or fewer.'
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(username)) {
    return 'Username must start with a letter or number and use only letters, numbers, hyphens, or underscores.'
  }

  const normalizedWallet = normalizeWallet(walletAddress)
  const isTaken = listUserProfiles().some(
    profile =>
      normalizeWallet(profile.walletAddress) !== normalizedWallet &&
      normalizeUsername(profile.settings.username) === username
  )

  return isTaken ? 'That username is already taken.' : ''
}

export function isStoredProfileComplete(walletAddress: string) {
  const profile = getUserProfile(walletAddress)

  return profile ? isUserSettingsComplete(profile.settings) : false
}

function normalizeWallet(walletAddress: string) {
  return walletAddress.trim().toLowerCase()
}

function isUserProfileRecord(value: unknown): value is UserProfileRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<UserProfileRecord>

  return (
    typeof candidate.walletAddress === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    isUserSettings(candidate.settings)
  )
}

function isUserSettings(value: unknown): value is UserSettings {
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
