import { envClient } from '@/lib/env/env.client'

export const siteConfig = {
  name: envClient.NEXT_PUBLIC_APP_NAME ?? 'Tollora',
  description:
    envClient.NEXT_PUBLIC_APP_DESCRIPTION ??
    'MUSD-native API commerce for humans, applications, and AI agents on Mezo.',
  url: envClient.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  links: {
    github: 'https://github.com/mezo-org',
    twitter: 'https://x.com/MezoNetwork'
  }
}
