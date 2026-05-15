import { getConfig } from '@mezo-org/passport'

import { siteConfig } from '@/lib/config/site'
import { envClient } from '@/lib/env/env.client'

export const rainbowConfig = envClient.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  ? getConfig({
      appName: siteConfig.name,
      appDescription: siteConfig.description,
      appUrl: siteConfig.url,
      walletConnectProjectId: envClient.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      mezoNetwork: 'testnet',
      ssr: true
    })
  : null
