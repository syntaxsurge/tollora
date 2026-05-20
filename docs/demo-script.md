# Tollora Live Walkthrough Script

## Positioning

Tollora is a MUSD-native API marketplace where providers list paid endpoints and
humans, applications, or AI agents pay per request using Bitcoin-backed MUSD on
Mezo.

## Walkthrough

1. Open `/` and introduce Tollora as autonomous API commerce for MUSD payments
   and Mezo proof pages.
2. Open the provider app for the external service you want to resell. For the
   video demo, open `https://cliplore.ai/developers/docs`, create or copy a
   ClipLore API key, then open `https://cliplore.ai/developers/openapi` and
   copy the OpenAPI JSON URL.
3. Open `/provider/products/new`, paste the OpenAPI URL into `Import OpenAPI`,
   choose the video job creation operation, fill the listing, paste the
   ClipLore API key into the private upstream credential field, confirm the
   quote/status mappings, and save the listing as a draft owned by the
   connected wallet.
4. Run the payable test from the product management page. Publish it only after
   the x402 quote, payment, async polling, and public handoff URL work.
5. Open `/marketplace` and show the published provider-created product catalog
   with x402 and agent-ready badges.
6. Open `/marketplace/[slug]` and show the request schema, response schema,
   price, settlement model, hosted Tollora endpoint, and code integration.
7. Create a payable request from the product page and open the Run & Pay
   playground.
8. Click `Inspect quote` to show the HTTP 402 requirement and quoted MUSD
   amount before provider work starts.
9. Click `Run with wallet`, approve the one-time MUSD Permit2 allowance if the
   wallet has not already approved it, approve the x402 wallet signature, settle
   MUSD, and show the direct provider response or pollable async job.
10. For credit-metered async products, poll the provider job. If final usage is
   lower than, equal to, or higher than the prepaid quote, show the credit-back,
   released result, or `Pay delta and reveal` flow. If the provider returns a
   public handoff or clone URL, open it as the completed paid result.
   If the provider returns a retryable outage such as a temporary 5xx,
   Cloudflare, timeout, rate-limit, or `retryable: true` response, show that the
   payment remains reserved in escrow while Tollora retries for up to 24 hours
   before refunding.
11. Open the receipt link to show receipt ID, buyer wallet, provider wallet,
   amount, fee split, and Mezo explorer link.
12. Open `/agents` and show the Launch Pack Agent template, recent runs, spend,
   and proof counts.
13. Open `/agents/new`, enter a goal, budget cap, max paid actions, and select
   the published API tools or click `Let agent choose tools`. The connected
   wallet is used as the run owner.
14. Open `/agents/[runId]`, fund the production agent budget vault with MUSD,
    then run paid actions. Show `Planner: OpenAI gpt-5.2` when
    `AGENT_LLM_API_KEY` is configured, then show selected tools, skipped tools,
    receipts, budget ledger events, Markdown-rendered deliverables, unused
    refund controls, and proof controls.
15. Attest the completed run and open `/proofs/[proofId]` to show the public
   proof hash, receipt IDs, total spend, funding/refund metadata, attestation
   transaction, and Mezo explorer link.
16. Open `/billing`, create a managed credit API key, and explain that credits
    are an optional API-key layer that reserves quoted MUSD before provider work
    and returns unused reserved credit when final usage is lower.
17. Open `/receipts/[receiptId]` and explain buyer wallet, provider wallet, MUSD
    amount, fee split, network, and transaction hash.
18. Open `/provider` with the same connected wallet to show only that wallet's
    owned API listings, including agent-created calls and provider earnings.
19. Open `/admin` with an allowlisted admin wallet, then visit `/admin/products`,
    `/admin/orders`, `/admin/agents`, and `/admin/receipts` to show the global
    owner-aware control room.
20. Open `/developers/docs` and `/api/reference` to show agent-ready integration
    docs and OpenAPI coverage.
21. Open `/admin/operations` to show gateway readiness for x402, agent signers,
    external API forwarding, wallet onboarding, receipts, proof pages, and
    provider adapters.

## Judge-Facing Notes

- MUSD is the payment asset for every paid API call.
- Mezo Testnet is configured with CAIP-2 network `eip155:31611`.
- x402 handles HTTP 402 requirements, signed payment retry, and facilitator
  settlement.
- Credit-metered products quote first, settle MUSD before expensive work, and
  use an x402 claim payment when final usage exceeds the prepaid amount.
- Launch Pack Agent proves autonomous task execution by linking a user-funded
  agent budget, paid actions, receipts, deliverables, proof hash, and a Mezo
  attestation transaction.
- Provider-created listings prove Tollora can sell premium AI workflows and
  ordinary HTTP APIs through the same generic external adapter.
- Tollora records the platform fee and provider amount for every successful paid
  request.
