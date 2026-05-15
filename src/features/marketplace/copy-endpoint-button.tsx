'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

export function CopyEndpointButton({ endpoint }: { endpoint: string }) {
  const [copied, setCopied] = useState(false)

  async function copyEndpoint() {
    await navigator.clipboard.writeText(endpoint)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Button type='button' variant='outline' size='sm' onClick={copyEndpoint}>
      {copied ? 'Copied' : 'Copy endpoint'}
    </Button>
  )
}
