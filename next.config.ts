import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@mezo-org/orangekit',
    '@mezo-org/orangekit-contracts',
    '@mezo-org/orangekit-smart-account',
    '@mezo-org/passport'
  ]
}

export default nextConfig
