# Tollora Live Walkthrough Script

## Positioning

Tollora is a MUSD-native API marketplace where providers list paid endpoints and
humans, applications, or AI agents pay per request using Bitcoin-backed MUSD on
Mezo.

## Walkthrough

1. Open `/` and introduce Tollora as autonomous API commerce for MUSD payments
   and Mezo proof pages.
2. Open `/agents` and show the Launch Pack Agent template, recent runs, spend,
   and proof counts.
3. Open `/agents/new`, enter a goal, budget cap, owner wallet, max paid actions,
   allowed tools, and signer mode.
4. Open `/agents/[runId]`, run paid actions, show the action timeline, receipts,
   deliverables, and proof controls.
5. Attest the completed run and open `/proofs/[proofId]` to show the public
   proof hash, receipt IDs, total spend, attestation transaction, and Mezo
   explorer link.
6. Open `/marketplace` and show the product catalog with x402 and agent-ready
   badges.
7. Open `/marketplace/cliplore-ai-video-generator` and show the ClipLore API
   listing, request schema, response schema, price, and endpoint.
8. Create a paid request from the product page and open the order detail view.
9. Run the request without a payment header to show HTTP 402 payment
   requirements.
10. Retry with a signed `X-PAYMENT` payload from the wallet or agent client.
11. Show the provider response, receipt ID, and Mezo explorer link.
12. Open `/receipts/[receiptId]` and explain buyer wallet, provider wallet, MUSD
    amount, fee split, network, and transaction hash.
13. Open `/provider` to show provider earnings, request activity, listing
    health, and the 95% provider share.
14. Open `/developers/docs` and `/api/reference` to show agent-ready integration
    docs and OpenAPI coverage.
15. Open `/admin/operations` to show gateway readiness for x402, agent signers,
    ClipLore, wallet onboarding, receipts, proof pages, and provider adapters.

## Judge-Facing Notes

- MUSD is the payment asset for every paid API call.
- Mezo Testnet is configured with CAIP-2 network `eip155:31611`.
- x402 handles HTTP 402 requirements, signed payment retry, and facilitator
  settlement.
- Launch Pack Agent proves autonomous task execution by linking paid actions,
  receipts, deliverables, proof hash, and a Mezo attestation transaction.
- ClipLore proves Tollora can sell premium AI workflows through the same generic
  provider adapter interface used by lightweight API products.
- Tollora records the platform fee and provider amount for every successful paid
  request.
