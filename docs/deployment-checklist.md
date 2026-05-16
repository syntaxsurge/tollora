# Tollora Deployment Checklist

Use this checklist before submitting or presenting the app.

## Required Environment

- `NEXT_PUBLIC_APP_NAME=Tollora`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_WALLET_PROVIDER=rainbowkit`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_MEZO_TESTNET_CHAIN_ID=31611`
- `NEXT_PUBLIC_MEZO_TESTNET_RPC_URL=https://rpc.test.mezo.org`
- `NEXT_PUBLIC_MEZO_TESTNET_EXPLORER_URL=https://explorer.test.mezo.org`
- `NEXT_PUBLIC_X402_NETWORK=eip155:31611`
- `X402_FACILITATOR_URL=https://facilitator.vativ.io/`
- `TOLLORA_PLATFORM_FEE_BPS=500`
- `CLIPLORE_API_URL`
- `CLIPLORE_API_KEY`
- `CLIPLORE_WEBHOOK_SECRET`
- `AGENT_SPENDER_PRIVATE_KEY`
- `AGENT_ATTESTER_PRIVATE_KEY`
- `NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS`

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
- `POST /api/agents/runs/[runId]/execute` completes paid actions or the
  deterministic demo path.
- `POST /api/agents/runs/[runId]/attest` returns a proof with a Mezo explorer
  link.
- `GET /api/proofs/[proofId]` returns the public proof package.
- `POST /api/x402/products/prompt-enhancer-api/call` without `X-PAYMENT`
  returns HTTP 402 and a `payment-required` header.
- `POST /api/provider-webhooks/cliplore` accepts a valid ClipLore job status
  payload.
- `/marketplace` shows published API products.
- `/agents` and `/agents/new` show the autonomous agent lifecycle.
- `/proofs/[proofId]` renders without wallet auth.
- `/provider` shows MUSD revenue, recent request activity, and fee split.
- `/billing` shows MUSD receipts.
- `/admin/operations` shows payment, adapter, wallet, and receipt readiness.
