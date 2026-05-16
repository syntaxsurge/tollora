'use client'

import { FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CopyTextButton } from '@/features/marketplace/copy-endpoint-button'
import { WalletAddressConsumer } from '@/components/wallet/wallet-address-consumer'

type PublicManagedCreditAccount = {
  wallet: string
  apiKey: string
  balanceMusd: string
  topUps: Array<{
    id: string
    amountMusd: number
    settlementTxHash: string
    createdAt: string
  }>
  debits: Array<{
    id: string
    productName: string
    amountMusd: number
    receiptId: string
    createdAt: string
  }>
}

export function ManagedCreditsPanel() {
  return (
    <WalletAddressConsumer>
      {({ address }) => <ManagedCreditsPanelContent address={address} />}
    </WalletAddressConsumer>
  )
}

function ManagedCreditsPanelContent({ address }: { address: string | null }) {
  const [account, setAccount] = useState<PublicManagedCreditAccount | null>(
    null
  )
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function createAccount() {
    if (!address) {
      setStatus('Connect a wallet before creating a managed credit account.')
      return
    }

    setIsLoading(true)
    setStatus('')

    try {
      const response = await fetch('/api/credits/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address })
      })
      const body = (await response.json()) as {
        account?: PublicManagedCreditAccount
        error?: string
      }

      if (!response.ok || !body.account) {
        throw new Error(body.error ?? 'Unable to create credit account.')
      }

      setAccount(body.account)
      setStatus('Managed credit account ready.')
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create credit account.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function recordTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!address) {
      setStatus('Connect a wallet before recording a top-up.')
      return
    }

    const formData = new FormData(event.currentTarget)

    setIsLoading(true)
    setStatus('')

    try {
      const response = await fetch('/api/credits/top-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address,
          amountMusd: formData.get('amountMusd'),
          settlementTxHash: formData.get('settlementTxHash')
        })
      })
      const body = (await response.json()) as {
        account?: PublicManagedCreditAccount
        error?: string
      }

      if (!response.ok || !body.account) {
        throw new Error(body.error ?? 'Unable to record top-up.')
      }

      setAccount(body.account)
      setStatus('MUSD top-up recorded for managed API-key usage.')
      event.currentTarget.reset()
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to record top-up.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className='space-y-5'>
      <div className='flex flex-col justify-between gap-3 lg:flex-row lg:items-start'>
        <div>
          <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
            Managed credits
          </p>
          <h2 className='font-display mt-2 text-2xl'>API-key path for teams</h2>
          <p className='text-foreground/65 mt-2 max-w-2xl text-sm leading-6'>
            x402 remains the native payment path. Managed credits let a team
            record a MUSD top-up once, receive a Tollora API key, and debit
            usage from an off-chain balance for API-key ergonomics.
          </p>
        </div>
        <Button onClick={createAccount} disabled={isLoading || !address}>
          {account ? 'Refresh account' : 'Create API key'}
        </Button>
      </div>

      <div className='grid gap-3 text-sm md:grid-cols-3'>
        <Metric
          label='Wallet'
          value={address ?? 'Connect wallet to create account'}
        />
        <Metric
          label='Credit balance'
          value={`${account?.balanceMusd ?? '0.00'} MUSD`}
        />
        <Metric
          label='Usage debits'
          value={(account?.debits.length ?? 0).toString()}
        />
      </div>

      {account ? (
        <div className='border-foreground/10 rounded-lg border p-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='min-w-0'>
              <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
                Tollora API key
              </p>
              <p className='mt-2 font-mono text-xs break-all'>
                {account.apiKey}
              </p>
            </div>
            <CopyTextButton text={account.apiKey} label='Copy API key' />
          </div>
        </div>
      ) : null}

      <form
        onSubmit={recordTopUp}
        className='grid gap-3 lg:grid-cols-[160px_1fr_auto]'
      >
        <Input
          name='amountMusd'
          type='number'
          min='0.01'
          step='0.01'
          placeholder='25.00'
          required
          aria-label='Top-up amount in MUSD'
        />
        <Input
          name='settlementTxHash'
          placeholder='0x... Mezo MUSD top-up transaction hash'
          required
          aria-label='Mezo top-up transaction hash'
        />
        <Button type='submit' disabled={isLoading || !address}>
          Record top-up
        </Button>
      </form>

      <div className='grid gap-4 lg:grid-cols-2'>
        <HistoryList
          title='Top-ups'
          empty='Recorded MUSD top-ups appear here.'
          rows={
            account?.topUps.map(item => ({
              id: item.id,
              label: `${item.amountMusd.toFixed(2)} MUSD`,
              detail: item.settlementTxHash
            })) ?? []
          }
        />
        <HistoryList
          title='API-key debits'
          empty='Managed-credit API calls appear here.'
          rows={
            account?.debits.map(item => ({
              id: item.id,
              label: `${item.productName} - ${item.amountMusd.toFixed(2)} MUSD`,
              detail: item.receiptId
            })) ?? []
          }
        />
      </div>

      {status ? (
        <p className='text-foreground/65 text-sm' role='status'>
          {status}
        </p>
      ) : null}
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='bg-muted rounded-lg p-4'>
      <p className='text-foreground/60 text-xs uppercase'>{label}</p>
      <p className='mt-1 font-semibold break-all'>{value}</p>
    </div>
  )
}

function HistoryList({
  title,
  empty,
  rows
}: {
  title: string
  empty: string
  rows: Array<{ id: string; label: string; detail: string }>
}) {
  return (
    <div className='border-foreground/10 rounded-lg border p-4'>
      <p className='text-foreground/60 text-xs tracking-[0.16em] uppercase'>
        {title}
      </p>
      <div className='mt-3 space-y-3'>
        {rows.length > 0 ? (
          rows.map(row => (
            <div key={row.id} className='text-sm'>
              <p className='font-semibold'>{row.label}</p>
              <p className='text-foreground/60 mt-1 font-mono text-xs break-all'>
                {row.detail}
              </p>
            </div>
          ))
        ) : (
          <p className='text-foreground/60 text-sm leading-6'>{empty}</p>
        )}
      </div>
    </div>
  )
}
