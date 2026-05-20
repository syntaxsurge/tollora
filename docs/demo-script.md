Project: Tollora  
One-liner: A Mezo native AI and API marketplace where developers list paid APIs, users pay with MUSD through x402, and autonomous OpenAI agents buy tools, collect receipts, and publish on chain proofs.

## 1. Show The Product In One Screen
- **URL:** /
- **Shot:** Tollora homepage with the hero, marketplace promise, agent workflow, provider earning story, and ClipLore featured provider.
- **Steps:**
  1. **Current page:** Browser start page - confirm the address bar is ready.
  2. **Navigate:** Open URL directly: [DEMO_URL]/.
  3. **Action:** Scroll once through the hero, marketplace cards, agent section, and provider earning section.
  4. Click "Marketplace" in the top navigation, then lands on /marketplace.
  5. **Verify on-screen:** The "Marketplace" heading and paid API table are visible.
- **Voiceover:**
  > "This is Tollora. It lets API owners list paid tools, lets buyers pay per request with MUSD through x402, and lets OpenAI powered agents buy tools autonomously. The core loop is simple: list an API, pay for it, receive a receipt, then let an agent repeat that workflow with proof."

## 2. List A Paid API With OpenAPI
- **URL:** /provider/products/new
- **Shot:** Provider listing page with Import OpenAPI, product details, private upstream API key, pricing, async polling, visibility, and agent ready controls.
- **Steps:**
  1. **Current page:** /marketplace - confirm the marketplace API table is visible.
  2. **Navigate:** Click "Provider" in the top navigation, then lands on /provider.
  3. **Action:** Click "Products" in the provider area, then lands on /provider/products.
  4. Click "Create API product" or "List API", then lands on /provider/products/new.
  5. **(Only if needed) Enter values:**
     - OpenAPI URL = https://cliplore.ai/api/v1/openapi.json
     - Override Server URL = https://cliplore.ai
     - Auth type = bearer
     - Header name = Authorization
     - Auth secret or API key = [CLIPLORE_API_KEY=clip_live_your_key]
     - Visibility = draft
  6. Click "Import spec" - wait for "Imported operations" to appear.
  7. Click "Fill listing" - wait for the listing fields to populate.
  8. Click "Save API product" - wait for the "API is ready for review" toast.
  9. **Verify on-screen:** The new draft API appears on the product management page owned by the connected wallet.
- **Voiceover:**
  > "A provider can bring an existing API into Tollora without custom code. I paste the OpenAPI URL, choose the operation, add the private upstream API key, and save it as a draft. Tollora keeps the key server side, builds the request form, maps async polling, and makes the API ready for paid testing."

## 3. Test And Publish The Provider API
- **URL:** /provider/products/[productId]
- **Shot:** Product management page with draft status, test request builder, gateway endpoint, schema preview, payable test run, and publish control.
- **Steps:**
  1. **Current page:** /provider/products/[productId] - confirm the draft status badge is visible.
  2. **Navigate:** Stay on /provider/products/[productId].
  3. **Action:** Click "Use sample payload".
  4. Click "Create payable test run" - wait for the Run and Pay page to open.
  5. **Verify on-screen:** The Run and Pay page shows "Payment required", the product name, quote amount, and request ID.
  6. **Navigate:** Return to /provider/products/[productId].
  7. Click "Publish" - wait for the status badge to change.
  8. **Verify on-screen:** The product status badge changes from "Draft" to "Published".
- **Voiceover:**
  > "Before an API goes live, the owner can create a payable test run while it is still private. Tollora quotes the request first, so expensive provider work does not start before payment. After the test works, I publish it, and it becomes available in the marketplace and to agents."

## 4. Buy A Paid API With Wallet
- **URL:** /orders/[orderId]
- **Shot:** Run and Pay page with Quote, Approve, Sign, Settle, Result steps, connected signer, quote amount, explorer link, receipt, and API response.
- **Steps:**
  1. **Current page:** /marketplace/[slug] - confirm the product detail page and "Run with wallet" button are visible.
  2. **Navigate:** Click "Run with wallet", then lands on /orders/new?product=[PRODUCT_SLUG].
  3. **Action:** Click "Use sample payload".
  4. Click "Test run" - wait for the Run and Pay page to open.
  5. Click "Run" in the payment console.
  6. Click "Confirm" in MetaMask for approval if requested.
  7. Click "Confirm" in MetaMask for the payment signature.
  8. **Verify on-screen:** The payment timeline reaches "Result", the Mezo transaction link is clickable, and the API response is visible.
- **Voiceover:**
  > "This is the human checkout flow. The buyer picks an API, creates a payable request, signs the x402 payment, and Tollora settles MUSD on Mezo before returning the provider result. The screen shows the status, transaction link, receipt, and response in one place."

## 5. Verify The Receipt
- **URL:** /receipts/[receiptId]
- **Shot:** Receipt page with receipt ID, buyer wallet, provider wallet, product, amount, platform fee, provider amount, network, and Mezo explorer link.
- **Steps:**
  1. **Current page:** /orders/[orderId] - confirm the completed payment and receipt ID are visible.
  2. **Navigate:** Click the visible receipt ID, then lands on /receipts/[receiptId].
  3. **Action:** Click the Mezo transaction link.
  4. Return to the receipt page.
  5. **Verify on-screen:** The receipt shows buyer wallet, provider wallet, MUSD amount, fee split, product, and transaction hash.
- **Voiceover:**
  > "Every paid call creates a receipt. This is what makes the marketplace auditable. We can see who paid, which provider earned, what product was used, how much MUSD moved, and the transaction hash that proves settlement happened on Mezo."

## 6. Create And Fund An Autonomous Agent
- **URL:** /agents/new
- **Shot:** Agent creation page with goal, tool strategy, server side tool table, connected owner wallet, budget, max actions, and Create run button.
- **Steps:**
  1. **Current page:** /receipts/[receiptId] - confirm the receipt details are visible.
  2. **Navigate:** Click "Agents" in the top navigation, then lands on /agents.
  3. **Action:** Click "Templates".
  4. Click "Use template" on "Video Launch Campaign", then lands on /agents/new?template=video-launch-campaign.
  5. Click "AI decides".
  6. **(Only if needed) Enter values:**
     - Objective = Create a launch campaign for Tollora showing that agents can buy paid APIs, generate a video asset, and publish proof.
     - Source context = Tollora is a Mezo native marketplace for paid APIs, x402 payments, MUSD settlement, provider earnings, and autonomous OpenAI powered agent runs.
     - Budget = 0.90
     - Actions = 4
  7. Click "Create run" - wait for the run page to load.
  8. Click "Fund agent" - confirm the wallet funding transaction.
  9. **Verify on-screen:** The funding ledger shows "User funded this autonomous agent run" and the funded budget card shows 0.90 MUSD.
- **Voiceover:**
  > "Now the same payment system becomes autonomous. I create an agent run from a template, let OpenAI choose the tools, set a 0.90 MUSD budget, and fund the agent vault. The agent cannot spend until the user funds it, and it cannot exceed the funded budget."

## 7. Run The OpenAI Agent
- **URL:** /agents/[runId]
- **Shot:** Agent run page with planner mode, selected tools, skipped tools, budget ledger, action cards, receipts, failures, completed results, and rendered deliverables.
- **Steps:**
  1. **Current page:** /agents/[runId] - confirm the funded budget card and "Run actions" button are visible.
  2. **Navigate:** Stay on /agents/[runId].
  3. **Action:** Click "Run actions".
  4. Wait for action cards to move through planned, quoted, paid, completed, skipped, or failed.
  5. Click "Planner, receipts, and deliverable diagnostics".
  6. **Verify on-screen:** The page shows "Planner: OpenAI gpt-5.2", selected tools, skipped tools, receipts, action results, and rendered launch deliverables.
- **Voiceover:**
  > "OpenAI is the agent brain. It reads the objective, chooses relevant paid APIs, skips tools that do not fit, respects the MUSD budget, and Tollora executes the paid calls through x402. Receipts, failures, refunds, and deliverables are all visible in the run timeline."

## 8. Publish The Mezo Proof
- **URL:** /proofs/[proofId]
- **Shot:** Public proof page with proof hash, receipt IDs, funded budget, spend, refunds, action summary, attestation transaction, and explorer links.
- **Steps:**
  1. **Current page:** /agents/[runId] - confirm action results or diagnostics are visible.
  2. **Navigate:** Stay on /agents/[runId].
  3. **Action:** Click "Attest proof".
  4. Wait for the proof transaction to complete.
  5. Click the proof link, then lands on /proofs/[proofId].
  6. **Verify on-screen:** The proof page shows proof hash, receipts, vault funding metadata, spend, refund metadata, and Mezo attestation transaction.
- **Voiceover:**
  > "The final step is public proof. Tollora hashes the objective, planner metadata, selected tools, receipts, spend, refunds, and result data. That proof is attested on Mezo, so judges or customers can audit what the agent did without seeing private prompts or API secrets."

## Final Wrap-Up
- **URL:** /proofs/[proofId]
- **Shot:** Public proof page with receipt IDs, proof hash, budget metadata, and attestation transaction visible.
- **Steps:**
  1. **Current page:** /proofs/[proofId] - confirm the public proof summary is visible.
  2. **Verify final state:** Tollora showed provider API listing, OpenAPI import, x402 wallet payment, MUSD settlement, receipts, provider earnings, funded autonomous OpenAI agent execution, and public Mezo proof.
- **Voiceover:**
  > "In under three minutes, Tollora proves the full hackathon loop. Developers list APIs and earn, users pay with MUSD through x402, agents autonomously buy tools inside a funded budget, and Mezo proofs make the work auditable. Try it at [DEMO_URL]."
