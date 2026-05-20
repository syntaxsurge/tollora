export type DashboardDensity = 'comfortable' | 'compact'

export type DashboardLanding = 'overview' | 'activity' | 'billing'

export type UserPlan = 'free' | 'base' | 'plus'

export type UserSettings = {
  fullName: string
  username: string
  email: string
  role: string
  website: string
  plan: UserPlan
  timezone: string
  dashboardLanding: DashboardLanding
  dashboardDensity: DashboardDensity
  emailDigest: boolean
  productUpdates: boolean
  securityAlerts: boolean
  publicProfile: boolean
}

export type PublicUserProfile = {
  walletAddress: string
  fullName: string
  username: string
  role: string
  website: string
  avatarInitials: string
}

const userSettingsStorageKey = 'tollora:user-settings'

const adminProviderWallet = '0x7CE33579392AEAF1791c9B0c8302a502B5867688'

const publicProfilesByWallet: Record<
  string,
  Omit<PublicUserProfile, 'walletAddress' | 'avatarInitials'>
> = {
  [adminProviderWallet.toLowerCase()]: {
    fullName: 'Tollora Labs',
    username: 'tollora',
    role: 'Marketplace operator',
    website: 'https://tollora.xyz'
  }
}

function settingsStorageKey(walletAddress?: string | null) {
  if (!walletAddress) {
    return `${userSettingsStorageKey}:anonymous`
  }

  return `${userSettingsStorageKey}:${walletAddress.toLowerCase()}`
}

export const defaultUserSettings: UserSettings = {
  fullName: '',
  username: '',
  email: '',
  role: '',
  website: '',
  plan: 'free',
  timezone: 'Asia/Manila',
  dashboardLanding: 'overview',
  dashboardDensity: 'comfortable',
  emailDigest: true,
  productUpdates: false,
  securityAlerts: true,
  publicProfile: true
}

export function readUserSettings(walletAddress?: string | null): UserSettings {
  if (typeof window === 'undefined') {
    return defaultUserSettings
  }

  const rawSettings = window.localStorage.getItem(
    settingsStorageKey(walletAddress)
  )

  if (!rawSettings) {
    return defaultUserSettings
  }

  try {
    const parsed = JSON.parse(rawSettings) as Partial<UserSettings>
    return normalizeUserSettings(parsed)
  } catch {
    return defaultUserSettings
  }
}

export function writeUserSettings(
  settings: UserSettings,
  walletAddress?: string | null
) {
  window.localStorage.setItem(
    settingsStorageKey(walletAddress),
    JSON.stringify(normalizeUserSettings(settings))
  )
  window.dispatchEvent(new Event('tollora:user-settings-updated'))
}

export function clearUserSettings(walletAddress?: string | null) {
  window.localStorage.removeItem(settingsStorageKey(walletAddress))
  window.dispatchEvent(new Event('tollora:user-settings-updated'))
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_-]/g, '')
}

export function isUserSettingsComplete(settings: UserSettings) {
  return (
    settings.fullName.trim().length >= 2 &&
    normalizeUsername(settings.username).length >= 3
  )
}

export function validateUsername(
  username: string,
  walletAddress?: string | null
) {
  const normalizedUsername = normalizeUsername(username)

  if (normalizedUsername.length < 3) {
    return 'Username must be at least 3 characters.'
  }

  if (normalizedUsername.length > 24) {
    return 'Username must be 24 characters or fewer.'
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(normalizedUsername)) {
    return 'Username must start with a letter or number and use only letters, numbers, hyphens, or underscores.'
  }

  if (isUsernameReservedForAnotherWallet(normalizedUsername, walletAddress)) {
    return 'That username is already taken.'
  }

  if (isUsernameTakenLocally(normalizedUsername, walletAddress)) {
    return 'That username is already taken on this device.'
  }

  return ''
}

export function userDisplayName(settings: UserSettings) {
  return settings.fullName || settings.username || 'New builder'
}

export function userInitials(settings: UserSettings) {
  const nameParts = userDisplayName(settings)
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)

  return nameParts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

export function formatWalletAddress(walletAddress?: string | null) {
  if (!walletAddress) {
    return 'Wallet not connected'
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
}

export function getPublicUserProfile(
  walletAddress?: string | null,
  fallbackName = 'API creator'
): PublicUserProfile {
  const normalizedWallet = walletAddress?.toLowerCase() ?? ''
  const knownProfile = publicProfilesByWallet[normalizedWallet]
  const fullName =
    knownProfile?.fullName ||
    fallbackName.trim() ||
    formatWalletAddress(walletAddress)
  const username =
    knownProfile?.username ||
    normalizeUsername(fallbackName).replaceAll('-', '').slice(0, 18) ||
    'creator'
  const role = knownProfile?.role || 'API provider'
  const website = knownProfile?.website || ''
  const avatarInitials = initialsFromName(fullName)

  return {
    walletAddress: walletAddress ?? '',
    fullName,
    username,
    role,
    website,
    avatarInitials
  }
}

function isUsernameReservedForAnotherWallet(
  username: string,
  walletAddress?: string | null
) {
  const currentWallet = walletAddress?.toLowerCase()

  return Object.entries(publicProfilesByWallet).some(
    ([profileWallet, profile]) =>
      profileWallet !== currentWallet && profile.username === username
  )
}

function isUsernameTakenLocally(
  username: string,
  walletAddress?: string | null
) {
  if (typeof window === 'undefined') {
    return false
  }

  const currentKey = settingsStorageKey(walletAddress)

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)

    if (!key?.startsWith(`${userSettingsStorageKey}:`) || key === currentKey) {
      continue
    }

    try {
      const settings = normalizeUserSettings(
        JSON.parse(
          window.localStorage.getItem(key) ?? '{}'
        ) as Partial<UserSettings>
      )

      if (normalizeUsername(settings.username) === username) {
        return true
      }
    } catch {
      continue
    }
  }

  return false
}

function initialsFromName(name: string) {
  const parts = name
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)

  return (
    parts
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'TL'
  )
}

function normalizeUserSettings(
  settings: Partial<UserSettings> = {}
): UserSettings {
  return {
    ...defaultUserSettings,
    ...settings,
    dashboardLanding: isDashboardLanding(settings.dashboardLanding)
      ? settings.dashboardLanding
      : defaultUserSettings.dashboardLanding,
    dashboardDensity: isDashboardDensity(settings.dashboardDensity)
      ? settings.dashboardDensity
      : defaultUserSettings.dashboardDensity,
    plan: isUserPlan(settings.plan) ? settings.plan : defaultUserSettings.plan,
    emailDigest:
      typeof settings.emailDigest === 'boolean'
        ? settings.emailDigest
        : defaultUserSettings.emailDigest,
    productUpdates:
      typeof settings.productUpdates === 'boolean'
        ? settings.productUpdates
        : defaultUserSettings.productUpdates,
    securityAlerts:
      typeof settings.securityAlerts === 'boolean'
        ? settings.securityAlerts
        : defaultUserSettings.securityAlerts,
    publicProfile:
      typeof settings.publicProfile === 'boolean'
        ? settings.publicProfile
        : defaultUserSettings.publicProfile
  }
}

function isDashboardLanding(value: unknown): value is DashboardLanding {
  return value === 'overview' || value === 'activity' || value === 'billing'
}

function isDashboardDensity(value: unknown): value is DashboardDensity {
  return value === 'comfortable' || value === 'compact'
}

function isUserPlan(value: unknown): value is UserPlan {
  return value === 'free' || value === 'base' || value === 'plus'
}
