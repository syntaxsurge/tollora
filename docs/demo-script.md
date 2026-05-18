# Tollora Live Walkthrough Script

## Positioning

Tollora is a MUSD-native API marketplace where providers list paid endpoints and
humans, applications, or AI agents pay per request using Bitcoin-backed MUSD on
Mezo.

## Walkthrough

1. Open `/` and introduce Tollora as autonomous API commerce for MUSD payments
   and Mezo proof pages.
2. Open `/provider/products/new`, add a real external API endpoint, upstream API
   credential, request schema, response schema, price, async polling mappings,
   and publish it as agent-ready.
3. Open `/marketplace` and show the published provider-created product catalog
   with x402 and agent-ready badges.
4. Open `/marketplace/[slug]` and show the request schema, response schema,
   price, settlement model, hosted Tollora endpoint, and code integration.
5. Create a payable request from the product page and open the Run & Pay
   playground.
6. Click `Inspect quote` to show the HTTP 402 requirement and quoted MUSD
   amount before provider work starts.
7. Click `Run with wallet`, approve the one-time MUSD Permit2 allowance if the
   wallet has not already approved it, approve the x402 wallet signature, settle
   MUSD, and show the direct provider response or pollable async job.
8. For credit-metered async products, poll the provider job. If final usage is
   higher than the prepaid quote, click `Pay delta and reveal` to settle the
   remaining MUSD through x402 before showing the completed result.
9. Open the receipt link to show receipt ID, buyer wallet, provider wallet,
   amount, fee split, and Mezo explorer link.
10. Open `/agents` and show the Launch Pack Agent template, recent runs, spend,
   and proof counts.
11. Open `/agents/new`, enter a goal, budget cap, owner wallet, max paid actions,
   select the published API tools or click `Let agent choose tools`, and choose
   signer mode.
12. Open `/agents/[runId]`, run paid actions, show the action timeline,
    receipts, deliverables, and proof controls.
13. Attest the completed run and open `/proofs/[proofId]` to show the public
   proof hash, receipt IDs, total spend, attestation transaction, and Mezo
   explorer link.
14. Open `/billing`, create a managed credit API key, and explain that credits
    are an optional API-key layer that reserves quoted MUSD before provider work
    and returns unused reserved credit when final usage is lower.
15. Open `/receipts/[receiptId]` and explain buyer wallet, provider wallet, MUSD
    amount, fee split, network, and transaction hash.
16. Open `/provider` to show provider earnings, request activity, listing
    health, and the 95% provider share.
17. Open `/developers/docs` and `/api/reference` to show agent-ready integration
    docs and OpenAPI coverage.
18. Open `/admin/operations` to show gateway readiness for x402, agent signers,
    external API forwarding, wallet onboarding, receipts, proof pages, and
    provider adapters.

## Judge-Facing Notes

- MUSD is the payment asset for every paid API call.
- Mezo Testnet is configured with CAIP-2 network `eip155:31611`.
- x402 handles HTTP 402 requirements, signed payment retry, and facilitator
  settlement.
- Credit-metered products quote first, settle MUSD before expensive work, and
  use an x402 claim payment when final usage exceeds the prepaid amount.
- Launch Pack Agent proves autonomous task execution by linking paid actions,
  receipts, deliverables, proof hash, and a Mezo attestation transaction.
- Provider-created listings prove Tollora can sell premium AI workflows and
  ordinary HTTP APIs through the same generic external adapter.
- Tollora records the platform fee and provider amount for every successful paid
  request.
