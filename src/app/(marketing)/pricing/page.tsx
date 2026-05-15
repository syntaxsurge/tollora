import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const pricingCards = [
  {
    name: 'Buyers',
    price: 'Pay per call',
    description:
      'Buyers pay the listed MUSD price only when they run a protected API call.',
    features: [
      'MUSD-denominated API prices',
      'x402 payment requirements',
      'Request receipts',
      'Explorer-linked settlement metadata'
    ]
  },
  {
    name: 'Providers',
    price: '95% share',
    description:
      'Providers keep 95% of successful MUSD-paid API calls recorded through Tollora.',
    features: [
      'Published marketplace listings',
      'Provider dashboard metrics',
      'Usage and success-rate records',
      'Gateway endpoints for every product'
    ],
    featured: true
  },
  {
    name: 'Platform',
    price: '5% fee',
    description:
      'Tollora records a 5% marketplace fee on successful paid calls for gateway operations.',
    features: [
      'Payment verification',
      'Request forwarding',
      'Receipt storage',
      'Provider and buyer activity logs'
    ]
  }
]

const faqs = [
  {
    question: 'What asset is used for payments?',
    answer:
      'Tollora prices paid API calls in MUSD and targets Mezo Testnet settlement for gateway receipts.'
  },
  {
    question: 'When does Tollora collect a fee?',
    answer:
      'The platform fee is recorded only for successful MUSD-paid API calls, keeping failed or unpaid requests out of provider revenue.'
  },
  {
    question: 'Can providers list high-value APIs?',
    answer:
      'Yes. Tollora is designed for metered AI, data, creator, developer, and agent APIs, including expensive workflows such as AI video generation.'
  }
]

export default function PricingPage() {
  return (
    <div className='bg-app-grid'>
      <section className='mx-auto w-full max-w-6xl px-6 py-16'>
        <div className='mb-10 max-w-3xl space-y-4'>
          <Badge>Pricing</Badge>
          <h1 className='font-display text-4xl leading-tight sm:text-5xl'>
            Transparent fees for MUSD-paid API commerce.
          </h1>
          <p className='text-foreground/70 text-base leading-7'>
            Tollora charges a small marketplace fee on successful paid calls.
            Providers keep the rest and receive clear usage records for every
            request.
          </p>
        </div>

        <div className='grid gap-5 lg:grid-cols-3'>
          {pricingCards.map(card => (
            <Card
              key={card.name}
              className={
                card.featured
                  ? 'border-accent bg-panel-sheen relative overflow-hidden'
                  : 'bg-card'
              }
            >
              {card.featured ? (
                <span className='bg-accent text-accent-foreground absolute top-4 right-4 rounded-md px-2.5 py-1 text-xs font-semibold'>
                  Provider default
                </span>
              ) : null}
              <div className='space-y-4'>
                <div>
                  <p className='text-lg font-semibold'>{card.name}</p>
                  <p className='text-foreground/65 mt-2 text-sm leading-6'>
                    {card.description}
                  </p>
                </div>
                <div>
                  <span className='font-display text-5xl'>{card.price}</span>
                </div>
                <Link
                  href={card.name === 'Buyers' ? '/marketplace' : '/provider'}
                  className={buttonClasses({
                    variant: card.featured ? 'primary' : 'outline',
                    size: 'sm'
                  })}
                >
                  {card.name === 'Buyers' ? 'Explore APIs' : 'Open provider'}
                </Link>
              </div>
              <ul className='mt-6 space-y-3 text-sm'>
                {card.features.map(feature => (
                  <li key={feature} className='flex gap-3'>
                    <span className='bg-accent mt-1.5 h-2 w-2 rounded-full' />
                    <span className='text-foreground/75'>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className='mx-auto grid w-full max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='space-y-3'>
          <Badge>Buyer and provider clarity</Badge>
          <h2 className='font-display text-3xl'>
            Every successful request has an auditable fee story.
          </h2>
        </div>
        <div className='grid gap-4'>
          {faqs.map(item => (
            <Card key={item.question} className='space-y-2'>
              <h3 className='font-semibold'>{item.question}</h3>
              <p className='text-foreground/70 text-sm leading-6'>
                {item.answer}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
