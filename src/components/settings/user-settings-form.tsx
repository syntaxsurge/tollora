'use client'

import { FormEvent, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DashboardDensity,
  DashboardLanding,
  UserSettings,
  defaultUserSettings,
  readUserSettings,
  writeUserSettings
} from '@/lib/settings/user-settings'

const timezones = [
  'Asia/Manila',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'UTC'
]

export function UserSettingsForm() {
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings)
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setSettings(readUserSettings())
    setIsReady(true)
  }, [])

  function updateField<Field extends keyof UserSettings>(
    field: Field,
    value: UserSettings[Field]
  ) {
    setSettings(current => ({ ...current, [field]: value }))
    setStatus('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    writeUserSettings(settings)
    setStatus('Settings saved on this device.')
  }

  function handleReset() {
    const nextSettings = {
      ...defaultUserSettings,
      plan: readUserSettings().plan
    }

    writeUserSettings(nextSettings)
    setSettings(nextSettings)
    setStatus('Settings reset to Tollora defaults.')
  }

  if (!isReady) {
    return <SettingsSkeleton />
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Identity
          </p>
          <h2 className='font-display mt-2 text-2xl'>Profile details</h2>
          <p className='text-foreground/65 mt-2 max-w-2xl text-sm leading-6'>
            These values power the local profile preview and keep account
            preferences available before provider and buyer records sync.
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <LabeledInput
            label='Full name'
            value={settings.fullName}
            onChange={value => updateField('fullName', value)}
          />
          <LabeledInput
            label='Username'
            value={settings.username}
            onChange={value => updateField('username', value)}
          />
          <LabeledInput
            label='Email'
            type='email'
            value={settings.email}
            onChange={value => updateField('email', value)}
          />
          <LabeledInput
            label='Role'
            value={settings.role}
            onChange={value => updateField('role', value)}
          />
          <LabeledInput
            label='Website'
            type='url'
            value={settings.website}
            onChange={value => updateField('website', value)}
          />
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Timezone
            </span>
            <select
              value={settings.timezone}
              onChange={event => updateField('timezone', event.target.value)}
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              {timezones.map(timezone => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className='space-y-5'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Workspace
          </p>
          <h2 className='font-display mt-2 text-2xl'>Dashboard behavior</h2>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Default view
            </span>
            <select
              value={settings.dashboardLanding}
              onChange={event =>
                updateField(
                  'dashboardLanding',
                  event.target.value as DashboardLanding
                )
              }
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value='overview'>Overview</option>
              <option value='activity'>Activity</option>
              <option value='billing'>Billing</option>
            </select>
          </label>
          <label className='space-y-2'>
            <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
              Card density
            </span>
            <select
              value={settings.dashboardDensity}
              onChange={event =>
                updateField(
                  'dashboardDensity',
                  event.target.value as DashboardDensity
                )
              }
              className='border-foreground/15 bg-background text-foreground focus-visible:ring-foreground/30 h-11 w-full rounded-2xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value='comfortable'>Comfortable</option>
              <option value='compact'>Compact</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className='space-y-4'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Preferences
          </p>
          <h2 className='font-display mt-2 text-2xl'>
            Notifications and privacy
          </h2>
        </div>
        <div className='grid gap-3 md:grid-cols-2'>
          <ToggleRow
            label='Weekly digest'
            description='Receive a compact product and launch summary.'
            checked={settings.emailDigest}
            onChange={checked => updateField('emailDigest', checked)}
          />
          <ToggleRow
            label='Product updates'
            description='Get notified when marketplace capabilities are added.'
            checked={settings.productUpdates}
            onChange={checked => updateField('productUpdates', checked)}
          />
          <ToggleRow
            label='Security alerts'
            description='Keep wallet and account security notices enabled.'
            checked={settings.securityAlerts}
            onChange={checked => updateField('securityAlerts', checked)}
          />
          <ToggleRow
            label='Public profile'
            description='Show your profile card to collaborators.'
            checked={settings.publicProfile}
            onChange={checked => updateField('publicProfile', checked)}
          />
        </div>
      </Card>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button type='submit'>Save settings</Button>
        <Button type='button' variant='outline' onClick={handleReset}>
          Reset
        </Button>
        {status ? (
          <p className='text-foreground/65 text-sm' role='status'>
            {status}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function LabeledInput({
  label,
  value,
  type = 'text',
  onChange
}: {
  label: string
  value: string
  type?: string
  onChange: (value: string) => void
}) {
  return (
    <label className='space-y-2'>
      <span className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {label}
      </span>
      <Input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className='border-foreground/10 hover:border-foreground/20 flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-4 transition'>
      <span>
        <span className='block text-sm font-semibold'>{label}</span>
        <span className='text-foreground/60 mt-1 block text-sm leading-6'>
          {description}
        </span>
      </span>
      <input
        type='checkbox'
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className='accent-foreground mt-1 h-5 w-5'
      />
    </label>
  )
}

function SettingsSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='skeleton h-72 rounded-lg' />
      <div className='skeleton h-40 rounded-lg' />
      <div className='skeleton h-48 rounded-lg' />
    </div>
  )
}
