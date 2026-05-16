# Tollora

MUSD-native API commerce for humans, applications, and AI agents on Mezo.

Tollora is a paid API marketplace and gateway. Providers list paid endpoints,
buyers and agents pay per request using MUSD on Mezo, and Tollora handles
discovery, x402 payment flow, request forwarding, receipts, usage records, and
provider dashboards.

## Highlights

- Next.js 15 + React 19 App Router setup.
- Mezo Testnet chain configuration with BTC gas and RainbowKit wallet support.
- Mezo Passport integration for RainbowKit-compatible wallet onboarding.
- Marketplace catalog with MUSD prices, provider badges, x402 flags, and
  agent-ready API details.
- Autonomous Launch Pack Agent runs that plan a task, buy selected paid APIs,
  return deliverables, and publish Mezo proof pages.
- Provider dashboard with API call, revenue, success-rate, and fee-split
  metrics.
- Provider product management for listing APIs, validating schemas, reviewing
  product status, copying gateway endpoints, and testing paid request setup.
- Buyer order lifecycle pages for payment-required, processing, completed,
  failed, and expired API requests, with x402 payment requirement inspection,
  signed payment retry, MUSD settlement, and receipt links.
- x402-protected product call route for Mezo Testnet settlement through the
  configured facilitator.
- Public proof pages for autonomous runs with receipt rollups, proof hashes, and
  Mezo explorer links.
- Provider adapter registry with ClipLore video jobs, prompt enhancement, and
  data responses behind the same paid gateway contract.
- ClipLore webhook intake with optional HMAC verification.
- OpenAPI JSON and Scalar API reference for gateway, receipt, provider, and
  webhook routes.
- Receipt pages with MUSD amount, fee split, payer, provider wallet, transaction
  hash, and explorer links.
- Admin moderation pages for API products and buyer request operations.
- Convex schema for providers, API products, versions, orders, receipts,
  requests, usage events, webhooks, payouts, examples, and reviews.
- Admin panel and wallet-protected app routes.
- Light/dark mode using `next-themes`.

## Getting Started

```bash
pnpm install
pnpm dev
```

## Convex

```bash
pnpm convex:dev
pnpm convex:deploy
```

## Mezo

Tollora targets Mezo Testnet for MUSD-paid API commerce:

- Chain ID: `31611`
- CAIP-2 network: `eip155:31611`
- RPC: `https://rpc.test.mezo.org`
- Explorer: `https://explorer.test.mezo.org`
- Native gas currency: `BTC`
- x402 facilitator: `https://facilitator.vativ.io/`

## Paid API Calls

Raw `curl` requests intentionally return `402 Payment Required` because the
server is advertising the MUSD payment requirements. To execute a paid request
from a terminal, set `AGENT_SPENDER_PRIVATE_KEY` or `EVM_PRIVATE_KEY` to a
Mezo-funded MUSD wallet and run:

```bash
pnpm x402:call prompt-enhancer-api
```

The command uses `@x402/fetch` to sign the payment, retry the request, and print
the settled response.

## Walkthrough And Deployment

- Deployment checklist:
  [docs/deployment-checklist.md](docs/deployment-checklist.md)
- Walkthrough script: [docs/demo-script.md](docs/demo-script.md)
- API reference: `/api/reference`
- OpenAPI JSON: `/api/openapi.json`
- Operations health: `/api/health`

## Environment

Copy `.env.example` to `.env.local` and configure the values for your local
deployment.

Key values:

- `NEXT_PUBLIC_WALLET_PROVIDER=rainbowkit`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_MEZO_TESTNET_CHAIN_ID=31611`
- `NEXT_PUBLIC_X402_NETWORK=eip155:31611`
- `X402_FACILITATOR_URL=https://facilitator.vativ.io/`
- `TOLLORA_PLATFORM_FEE_BPS=500`
- `CLIPLORE_API_URL`
- `CLIPLORE_API_KEY`
- `CLIPLORE_WEBHOOK_SECRET`
- `AGENT_SPENDER_PRIVATE_KEY`
- `AGENT_ATTESTER_PRIVATE_KEY`
- `NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS`

## Autonomous Agent Walkthrough

1. Open `/agents/new`.
2. Enter a launch-pack goal, budget cap, owner wallet, and allowed tools.
3. Start the run, open `/agents/[runId]`, and execute paid actions.
4. Attest the completed run and open `/proofs/[proofId]`.
5. For production settlement, fund `AGENT_SPENDER_PRIVATE_KEY` with MUSD and set
   `NEXT_PUBLIC_APP_URL` to the deployed app URL.

## Core Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm convex:dev
pnpm convex:deploy
```
