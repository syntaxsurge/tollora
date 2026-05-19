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

const userSettingsStorageKey = 'tollora:user-settings'

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
