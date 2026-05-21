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
- Autonomous Launch Pack Agent runs with an OpenAI planner and synthesizer that
  choose paid tools, buy selected APIs, return deliverables, and publish Mezo
  proof pages. A deterministic planner is available when no OpenAI key is set.
- Provider dashboard with API call, revenue, success-rate, and fee-split
  metrics.
- Provider product management for listing APIs, validating schemas, reviewing
  product status, copying gateway endpoints, and testing paid request setup.
- Buyer order lifecycle pages for payment-required, processing, completed,
  failed, and expired API requests, with browser wallet x402 checkout, MUSD
  settlement, provider results, and receipt links.
- Managed credits for teams that prefer API-key usage after recording MUSD
  top-ups.
- x402-protected product call route for Mezo Testnet settlement through the
  configured facilitator.
- Public proof pages for autonomous runs with receipt rollups, proof hashes, and
  Mezo explorer links.
- Generic external HTTP adapter for provider-created APIs, including private
  upstream auth, optional provider-required idempotency headers, async job
  polling, and result-path extraction behind the same paid gateway contract.
- OpenAPI import for faster provider onboarding from hosted JSON/YAML specs or
  uploaded files.
- OpenAPI JSON and Scalar API reference for gateway, receipt, provider, and
  agent routes.
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
server is advertising the MUSD payment requirements. External developers do not
need to clone this repository to use Tollora APIs; they install the x402 buyer
SDK in their own backend, CLI, or agent and call the hosted Tollora product
endpoint.

After publishing a provider product, set `AGENT_SPENDER_PRIVATE_KEY` or
`EVM_PRIVATE_KEY` to a Mezo-funded MUSD wallet and run the hosted product slug:

```bash
pnpm x402:call media-launch-job-api
```

The command uses `@x402/fetch` to sign the payment, retry the request, and print
the settled response.

Humans can also open a marketplace product, create a payable request, and click
`Run with wallet` to approve MUSD Permit2 allowance when needed, sign the x402
payment from the connected browser wallet, and receive the provider response.
Teams that want API-key ergonomics can use `/billing` to create a managed credit
account and call `/api/credits/products/{slug}/call` with a Tollora API key.

Providers can open `/provider/products/new` and import an OpenAPI JSON/YAML URL
or file to prefill endpoint URL, method, auth type, schemas, sample payload,
async polling, and result-path fields before publishing a paid listing.

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
- `AGENT_SPENDER_PRIVATE_KEY`
- `AGENT_ATTESTER_PRIVATE_KEY`
- `AGENT_LLM_API_KEY`
- `AGENT_LLM_MODEL=gpt-5.2`
- `NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS`

## Autonomous Agent Walkthrough

1. Open `/agents/new`.
2. Enter a launch-pack goal, budget cap, and allowed tools. The owner is the
   connected wallet and is not typed manually.
3. Start the run, open `/agents/[runId]`, and execute paid actions.
4. Attest the completed run and open `/proofs/[proofId]`.
5. For OpenAI-planned agent runs, set `AGENT_LLM_API_KEY` and optionally
   `AGENT_LLM_MODEL`; otherwise the run is labeled as deterministic fallback.
6. For x402 settlement, fund `AGENT_SPENDER_PRIVATE_KEY` with MUSD and set
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
