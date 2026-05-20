import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

const userPlan = v.union(
  v.literal('free'),
  v.literal('base'),
  v.literal('plus')
)
const dashboardLanding = v.union(
  v.literal('overview'),
  v.literal('activity'),
  v.literal('billing')
)
const dashboardDensity = v.union(v.literal('comfortable'), v.literal('compact'))

const seededAdminWallet = '0x7ce33579392aeaf1791c9b0c8302a502b5867688'
const seededAdminUsername = 'tollora'

export const getByWallet = query({
  args: {
    walletAddress: v.string()
  },
  handler: async (ctx: any, args: { walletAddress: string }) => {
    const walletAddress = normalizeWallet(args.walletAddress)
    const profile = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) =>
        q.eq('walletAddress', walletAddress)
      )
      .first()

    if (profile) {
      return profile
    }

    if (walletAddress === seededAdminWallet) {
      const now = Date.now()

      return {
        walletAddress,
        fullName: 'Tollora Labs',
        username: seededAdminUsername,
        normalizedUsername: seededAdminUsername,
        email: '',
        plan: 'plus',
        timezone: 'Asia/Manila',
        dashboardLanding: 'overview',
        dashboardDensity: 'comfortable',
        emailDigest: true,
        productUpdates: true,
        securityAlerts: true,
        publicProfile: true,
        createdAt: now,
        updatedAt: now
      }
    }

    return null
  }
})

export const upsertProfile = mutation({
  args: {
    walletAddress: v.string(),
    fullName: v.string(),
    username: v.string(),
    email: v.string(),
    plan: userPlan,
    timezone: v.string(),
    dashboardLanding,
    dashboardDensity,
    emailDigest: v.boolean(),
    productUpdates: v.boolean(),
    securityAlerts: v.boolean(),
    publicProfile: v.boolean()
  },
  handler: async (
    ctx: any,
    args: {
      walletAddress: string
      fullName: string
      username: string
      email: string
      plan: 'free' | 'base' | 'plus'
      timezone: string
      dashboardLanding: 'overview' | 'activity' | 'billing'
      dashboardDensity: 'comfortable' | 'compact'
      emailDigest: boolean
      productUpdates: boolean
      securityAlerts: boolean
      publicProfile: boolean
    }
  ) => {
    const walletAddress = normalizeWallet(args.walletAddress)
    const fullName = args.fullName.trim()
    const normalizedUsername = normalizeUsername(args.username)

    if (!walletAddress) {
      throw new Error('Wallet address is required.')
    }

    if (fullName.length < 2) {
      throw new Error('Full name must be at least 2 characters.')
    }

    validateUsername(normalizedUsername)

    if (
      normalizedUsername === seededAdminUsername &&
      walletAddress !== seededAdminWallet
    ) {
      throw new Error('That username is already taken.')
    }

    const existingUsername = await ctx.db
      .query('users')
      .withIndex('by_normalized_username', (q: any) =>
        q.eq('normalizedUsername', normalizedUsername)
      )
      .first()

    if (
      existingUsername &&
      normalizeWallet(existingUsername.walletAddress) !== walletAddress
    ) {
      throw new Error('That username is already taken.')
    }

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_wallet_address', (q: any) =>
        q.eq('walletAddress', walletAddress)
      )
      .first()
    const now = Date.now()
    const profile = {
      walletAddress,
      fullName,
      username: normalizedUsername,
      normalizedUsername,
      email: args.email.trim(),
      plan: args.plan,
      timezone: args.timezone,
      dashboardLanding: args.dashboardLanding,
      dashboardDensity: args.dashboardDensity,
      emailDigest: args.emailDigest,
      productUpdates: args.productUpdates,
      securityAlerts: args.securityAlerts,
      publicProfile: args.publicProfile,
      updatedAt: now
    }

    if (existingUser) {
      await ctx.db.patch(existingUser._id, profile)
      return await ctx.db.get(existingUser._id)
    }

    const userId = await ctx.db.insert('users', {
      ...profile,
      createdAt: now
    })

    return await ctx.db.get(userId)
  }
})

function normalizeWallet(walletAddress: string) {
  return walletAddress.trim().toLowerCase()
}

function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_-]/g, '')
}

function validateUsername(username: string) {
  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters.')
  }

  if (username.length > 24) {
    throw new Error('Username must be 24 characters or fewer.')
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(username)) {
    throw new Error(
      'Username must start with a letter or number and use only letters, numbers, hyphens, or underscores.'
    )
  }
}
