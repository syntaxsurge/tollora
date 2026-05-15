# Tollora Demo Script

## Positioning

Tollora is a MUSD-native API marketplace where providers list paid endpoints
and humans, applications, or AI agents pay per request using Bitcoin-backed MUSD
on Mezo.

## Walkthrough

1. Open `/` and introduce Tollora as API commerce for MUSD payments.
2. Open `/marketplace` and show the product catalog with x402 and agent-ready
   badges.
3. Open `/marketplace/cliplore-ai-video-generator` and show the ClipLore API
   listing, request schema, response schema, price, and endpoint.
4. Create a paid request from the product page and open the order detail view.
5. Run the request without a payment header to show HTTP 402 payment
   requirements.
6. Retry with a signed `X-PAYMENT` payload from the wallet or agent client.
7. Show the provider response, receipt ID, and Mezo explorer link.
8. Open `/receipts/[receiptId]` and explain buyer wallet, provider wallet,
   MUSD amount, fee split, network, and transaction hash.
9. Open `/provider` to show provider earnings, request activity, listing
   health, and the 95% provider share.
10. Open `/developers/docs` and `/api/reference` to show agent-ready
    integration docs and OpenAPI coverage.
11. Open `/admin/operations` to show gateway readiness for x402, ClipLore,
    wallet onboarding, receipts, and provider adapters.

## Judge-Facing Notes

- MUSD is the payment asset for every paid API call.
- Mezo Testnet is configured with CAIP-2 network `eip155:31611`.
- x402 handles HTTP 402 requirements, signed payment retry, and facilitator
  settlement.
- ClipLore proves Tollora can sell premium AI workflows through the same
  generic provider adapter interface used by lightweight API products.
- Tollora records the platform fee and provider amount for every successful
  paid request.
