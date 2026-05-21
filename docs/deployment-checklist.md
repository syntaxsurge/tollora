# Tollora Deployment Checklist

Use this checklist before submitting or presenting the app.

## Required Environment

- `NEXT_PUBLIC_APP_NAME=Tollora`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_WALLET_PROVIDER=rainbowkit`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES` as one or more comma-separated admin
  wallets. The seeded demo data APIs are owned by the first admin demo wallet.
- `NEXT_PUBLIC_MEZO_TESTNET_CHAIN_ID=31611`
- `NEXT_PUBLIC_MEZO_TESTNET_RPC_URL=https://rpc.test.mezo.org`
- `NEXT_PUBLIC_MEZO_TESTNET_EXPLORER_URL=https://explorer.test.mezo.org`
- `NEXT_PUBLIC_X402_NETWORK=eip155:31611`
- `X402_FACILITATOR_URL=https://facilitator.vativ.io/`
- `AGENT_SPENDER_PRIVATE_KEY`
- `AGENT_ATTESTER_PRIVATE_KEY`
- `NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS`
- `NEXT_PUBLIC_AGENT_RUN_VAULT_ADDRESS`
- `AGENT_RUN_VAULT_OPERATOR_PRIVATE_KEY`
- `NEXT_PUBLIC_MUSD_TOKEN_ADDRESS`

## Verification Commands

```bash
pnpm install
pnpm typecheck
pnpm build
```

## Runtime Checks

- `GET /api/health` returns readiness checks.
- `GET /api/openapi.json` returns the OpenAPI document.
- `GET /api/reference` renders the Scalar reference.
- `POST /api/agents/runs` creates a Launch Pack Agent run.
- `POST /api/agents/runs/[runId]/execute` uses OpenAI planning and synthesis
  when `AGENT_LLM_API_KEY` is configured, clearly labels deterministic fallback
  when it is not, requires funded production runs before spending, and
  completes paid actions when the agent spender is configured.
- `POST /api/agents/runs/[runId]/funding/prepare` and
  `POST /api/agents/runs/[runId]/funding/confirm` prepare and record the MUSD
  vault deposit for production agent runs.
- `GET /api/agents/runs/[runId]/ledger` shows funding, spend, and refund
  events for a run.
- `POST /api/agents/runs/[runId]/refund` records unused agent budget refunds
  after terminal states.
- `POST /api/agents/runs/[runId]/attest` returns a proof with a Mezo explorer
  link.
- `GET /api/proofs/[proofId]` returns the public proof package.
- `POST /api/x402/products/{published-product-slug}/call` without `X-PAYMENT`
  returns HTTP 402 and a `payment-required` header.
- Browser Run & Pay signs a marketplace request from a connected wallet and
  returns a receipt after settlement.
- Credit-metered async listings return an x402 quote before provider work,
  start provider work only after settlement, and expose
  `POST /api/x402/orders/{orderId}/claim` when final usage requires a delta.
- Async provider listings that return editable project or workflow handoffs
  expose a public result URL such as `result.publicProjectUrl` or
  `result.cloneUrl`; Tollora treats that handoff as the completed paid result.
- Retryable provider outages such as temporary 5xx, Cloudflare, timeout,
  rate-limit, or provider-marked `retryable: true` responses keep escrow
  reserved and retry for up to 24 hours before refunding.
- `POST /api/credits/accounts`, `POST /api/credits/top-ups`, and
  `POST /api/credits/products/{published-product-slug}/call` support managed
  API-key credits with pre-call reservation and failed-provider release.
- `POST /api/providers/openapi/preview` imports a hosted or uploaded OpenAPI
  document and returns paid-listing candidates.
- `/marketplace` shows published API products.
- `/agents` and `/agents/new` show the autonomous agent lifecycle.
- `/proofs/[proofId]` renders without wallet auth.
- `/provider` shows only the connected wallet's owned listings, MUSD revenue,
  recent request activity, agent-created calls, and fee split.
- `/admin/products`, `/admin/orders`, `/admin/agents`, and `/admin/receipts`
  show global server-side tables for ownership, usage, autonomous runs, and
  settlement reconciliation.
- `/billing` shows MUSD receipts, managed credit balance, API key creation, and
  top-up/debit history.
- `/admin/operations` shows payment, adapter, wallet, and receipt readiness.
