After you finish each task, please provide a one-line GitHub commit message that
I can use to manually commit the changes you made. Keep the message focused only
on your changes from my latest prompt and your response, since I’ll be working
on this repository with multiple AI agents. When creating the commit message,
don’t rely on git diff or porcelain commands; instead, rely on my latest prompt
and your latest response to create the best commit message.

# Agent Playbook (Living Document)

This file is the authoritative reference for platform architecture and agent
expectations. It must always describe the current, production-ready state of the
system—never legacy behavior. Update this file alongside any material feature
change. Only capture structural, user-visible, or integration-impacting details;
omit trivia. When we remove/replace something, like a feature, I DO NOT want you
to document the removal or replacement here, but instead, if that feature is
documented here currently, I want you to just remove it if we done removal and
replace it with teh new feature if we did replacement. The reason is that I only
want to support latest versions of my application here without documenting the
previous iterations, this file should serve as the current machination
explanation of my codebase and not for changelogs. If any previous version
explanation is present here, then it should be removed. Do not also imply that
we just implemented a certain feature here, by using words like "we now have
this X feature" since I only want to imply that the features we have iin our
application was in here already initially, without any implications of the new
changes we made.

## Documentation Expectations

- Update this document whenever routes, flows, data contracts, or integration
  requirements change.
- Describe the latest behavior succinctly; avoid references to prior
  implementations.
- Skip minor cosmetic tweaks—limit entries to structural or behavioral updates
  that affect future engineering work.

## Engineering Principles

1. **Import cleanly, delete legacy.** Never add re‑exports or preserve legacy
   APIs. Always import from canonical sources and remove unused branches, empty
   blocks, or deprecated files during every change.

2. **Extend before you create.** Before writing new functions, components, or
   libraries, analyze existing ones in `src/lib`, shared UI, and feature
   modules. Check related files for possible extension points—props, return
   types, or configuration options. Prefer enhancing them by adding parameters
   or return variants rather than duplicating logic. Only build something new
   when there’s _no existing code_ that can be extended without harm.

3. **Simplify through reuse.** If you or the AI analysis discover that a piece
   of code can be simplified by calling an existing component, function, or
   library instead of re‑implementing logic, refactor it. Merge redundant
   utilities or components when their behavior overlaps and eliminate
   unnecessary abstractions. The codebase should always converge toward fewer,
   more capable building blocks.

4. **Be minimal and accessible.** All new pages and components should follow the
   modern, minimal UI style—clean, responsive, and accessible (ARIA labels,
   focus states, keyboard navigation, color contrast). Avoid over‑engineering or
   speculative flexibility.

5. **Type‑sound and consistent.** Run `pnpm typecheck` before merging. Maintain
   consistent naming, small API surfaces, and clear defaults. Remove unused
   files and ensure new or extended helpers live in canonical locations to
   encourage immediate reuse.

### Examples

- Instead of creating `formatDate2`, extend `formatDate` with
  `options: { locale?: string; format?: string }`.
- Replace custom loaders with an existing `Spinner` component configured via
  props rather than duplicating markup.
- If two button variants differ only in color and spacing, merge them into one
  component with configurable variants.
- When adding a new fetch utility, inspect existing APIs—if a related
  `fetchData` exists, add optional parameters or expand return types instead of
  building another function.

### Guiding Mindset

Analyze → Extend → Simplify → Delete. Every change should either improve
clarity, reduce duplication, or enable reuse. Only create new code when
absolutely necessary and back it with clear reasoning in the PR description.

# Next.js 15 App Router Project Structure Guide

You are an AI coding assistant that builds **production-grade, scalable Next.js
15 App Router** applications.

When creating or editing a project, assume this blueprint as the default unless
explicitly told otherwise:

- Use **Next.js 15** with the **App Router** under `src/app`.
- Use **TypeScript** everywhere (`.ts`, `.tsx`).
- Use a **`src/`-based layout**: application code under `src`, configuration at
  the project root.
- Treat components in `app/` as **Server Components by default**; add
  `"use client"` only when necessary.
- Use **`middleware.ts`** at `src/middleware.ts` to run logic before a request
  is completed (auth, redirects, rewrites, logging).
- Manage environment variables with **workspace-scoped `.env` files**:
  - Root `.env.local` / `.env.*` for the Next.js app and cross-cutting services.
  - `blockchain/.env` for Hardhat deployment secrets, with
    `blockchain/.env.example` as a template.
- Use **Convex** as the off-chain backend stack.
- Support a **Hardhat blockchain workspace** under `blockchain/` with a Mezo
  Testnet `SubscriptionManager.sol` as the canonical Solidity contract and
  frontend subscription helpers in `src/lib/contracts/`.
- Keep **caching explicit** in Next.js 15:
  - `GET` Route Handlers are **not cached by default**.
  - `fetch` is **`no-store` by default** in many server contexts.
  - Opt into caching via route segment config (`dynamic`, `revalidate`, etc.)
    and `fetch` options.
  - Centralize caching decisions in a small number of modules instead of
    scattering them.

Everything below defines **where to place each file**, **what belongs in each
folder**, and **how to avoid redundant files**.

---

## 1. Target Project Tree (Baseline Template)

Use this as the **default template**. Extend or trim as needed. Folders marked
`# OPTIONAL` are add-ons.

```txt
.
├─ public/
│  ├─ favicon.ico
│  ├─ icons/
│  ├─ images/
│  └─ manifest.webmanifest
├─ blockchain/                   # OPTIONAL: smart-contract workspace (only if using blockchain)
│  ├─ .env.example               # Template for blockchain/.env (Hardhat secrets)
│  ├─ contracts/
│  │  └─ SubscriptionManager.sol # Source of truth for paid plans
│  ├─ scripts/
│  │  └─ deploySubscriptionManager.ts
│  ├─ hardhat.config.ts
│  ├─ package.json
│  ├─ artifacts/                 # generated (gitignored)
│  └─ cache/                     # generated (gitignored)
├─ convex/                       # Convex backend (schema + functions)
│  ├─ schema.ts
│  ├─ functions/
│  └─ auth/
├─ scripts/                      # One-off CLIs and dev helpers
│  ├─ convex-dev.cjs             # Starts Convex dev server
│  ├─ disable-sentry.cjs         # Disables Sentry for local/dev builds
│  └─ reset-convex.ts            # Resets Convex tables via admin mutation
├─ infra/                        # IaC: Terraform/Pulumi/Docker/etc.
├─ docs/                         # Architecture docs, ADRs, runbooks
├─ e2e/                          # Playwright/Cypress tests
├─ .github/
│  └─ workflows/                 # CI/CD pipelines
├─ .gitignore                    # Git ignore rules
├─ package.json
├─ next.config.js                # Next.js config
├─ tsconfig.json                 # TypeScript config
├─ postcss.config.js             # PostCSS/Tailwind pipeline
├─ tailwind.config.ts            # Tailwind theme (if used)
├─ .eslintrc.json                # ESLint config
├─ .env.example                  # Documented root env variables (Next.js + services)
├─ next-env.d.ts                 # Generated by Next
└─ src/
   ├─ app/
   │  ├─ (marketing)/            # Marketing / public routes
   │  │  ├─ layout.tsx
   │  │  ├─ page.tsx
   │  │  └─ ...
   │  ├─ (app)/                  # Authenticated workspace routes
   │  │  ├─ layout.tsx
   │  │  ├─ dashboard/
   │  │  │  ├─ page.tsx
   │  │  │  └─ components/
   │  │  └─ settings/
   │  │     ├─ page.tsx
   │  │     └─ components/
   │  ├─ (auth)/                 # Sign-in / sign-up / reset flows
   │  │  ├─ layout.tsx
   │  │  ├─ sign-in/
   │  │  │  └─ page.tsx
   │  │  └─ sign-up/
   │  │     └─ page.tsx
   │  ├─ api/                    # Route Handlers (server-only endpoints)
   │  │  ├─ auth/
   │  │  │  └─ route.ts
   │  │  ├─ webhooks/
   │  │  │  └─ route.ts
   │  │  └─ health/
   │  │     └─ route.ts
   │  ├─ layout.tsx              # Root layout (wraps entire app)
   │  ├─ page.tsx                # "/" route (usually marketing home)
   │  ├─ loading.tsx             # Root loading UI
   │  ├─ error.tsx               # Root segment error boundary
   │  ├─ global-error.tsx        # Global error boundary
   │  ├─ not-found.tsx           # 404 for App Router
   │  ├─ sitemap.ts              # Dynamic sitemap
   │  └─ robots.ts               # Dynamic robots.txt
   ├─ components/                # Cross-route, reusable UI
   │  ├─ ui/                     # Design-system primitives (Button, Input, Dialog)
   │  ├─ layout/                 # Shells, navbars, sidebars, footers
   │  ├─ data-display/           # Charts, tables, cards, lists
   │  ├─ feedback/               # Toasts, alerts, skeletons, spinners
   │  └─ form/                   # Reusable form controls & wrappers
   ├─ features/                  # Vertical domain slices
   │  └─ <feature>/
   │     ├─ components/          # Feature-specific UI (forms, panels, modals)
   │     ├─ hooks/               # Feature hooks
   │     ├─ services/            # Feature data access & orchestration
   │     ├─ state/               # Feature-level stores
   │     ├─ types/               # Feature-only types
   │     └─ tests/               # Feature tests (if not colocated)
   ├─ hooks/                     # Shared hooks reusable across features/routes
   ├─ lib/                       # Framework-agnostic helpers & integrations
   │  ├─ api/                    # Fetch clients, server actions, API SDKs
   │  ├─ auth/                   # Auth/session helpers, guards
   │  ├─ cache/                  # Caching helpers, cache tags
   │  ├─ config/                 # Runtime config builders/constants
   │  ├─ db/                     # Convex client adapters
   │  │  └─ convex/
   │  │     └─ client.ts
   │  ├─ contracts/              # OPTIONAL: frontend smart-contract integration
   │  │  ├─ abi/                 # ABI JSON files imported by the frontend
   │  │  ├─ clients/             # Typed contract clients (viem/wagmi/ethers)
   │  │  └─ addresses.ts         # Chain → contract address mapping
   │  ├─ env/                    # Zod-validated environment variables
   │  ├─ observability/          # Logging, tracing, metrics
   │  ├─ queue/                  # Background job clients
   │  ├─ security/               # Crypto, permissions, rate limiting
   │  ├─ storage/                # File/object storage adapters
   │  ├─ utils/                  # Pure helpers (dates, formatting, ids)
   │  └─ validation/             # Zod/Yup schemas used across app
   ├─ services/                  # Cross-cutting service clients (email, payments)
   ├─ state/                     # Global app-level stores (rare)
   ├─ types/
   │  ├─ domain/                 # Domain model types shared across features
   │  ├─ api/                    # DTOs and API contracts
   │  └─ global.d.ts             # Global type declarations, module shims
   ├─ styles/
   │  ├─ globals.css             # Imported once in app/layout.tsx
   │  ├─ tailwind.css            # Tailwind entry (if applicable)
   │  └─ tokens.css              # CSS tokens (or tokens.ts)
   ├─ content/
   │  ├─ mdx/                    # MD/MDX content (blog, docs, marketing)
   │  └─ locales/                # i18n translation files
   ├─ assets/
   │  ├─ images/                 # Importable images (non-direct URL)
   │  ├─ icons/                  # SVGs, icon sprites
   │  └─ fonts/                  # Self-hosted fonts
   ├─ mocks/
   │  ├─ msw/                    # MSW handlers for dev/tests
   │  ├─ data/                   # Fixture data / factories
   │  └─ handlers.ts             # MSW setup
   ├─ tests/
   │  ├─ setup/                  # Jest/Vitest/Playwright setup
   │  └─ utils/                  # Shared test helpers
   ├─ workers/
   │  ├─ edge/                   # Edge-specific workers/helpers
   │  └─ queue/                  # Background job processors
   ├─ middleware.ts              # Next.js Middleware (runs before routes)
   ├─ instrumentation.ts         # Server-side instrumentation
   └─ instrumentation-client.ts  # Client-side instrumentation
```

---

## 2. Placement Rules for New Files and Folders

When adding or modifying code, follow these steps.

### 2.1 Determine the correct layer

1. **Route UI**  
   → `src/app/**`
2. **Shared UI** (reused across routes/features)  
   → `src/components/**`
3. **Feature-specific UI or domain logic**  
   → `src/features/<feature>/**`
4. **Hook**
   - Feature-specific → `src/features/<feature>/hooks`
   - Cross-cutting → `src/hooks`
5. **Data access / env / caching / auth / contracts / utilities**
   - Cross-cutting infra → `src/lib/**`
   - Domain workflow → `src/features/<feature>/services`
6. **Vendor service client** (payments, email, analytics)  
   → `src/services/**`
7. **Global app state**  
   → `src/state/**` (only if truly global)
8. **Smart-contract code/tooling**
   - Solidity contracts → `blockchain/contracts`
   - Hardhat config and deployment scripts → `blockchain/**`
   - Frontend ABIs/addresses/clients → `src/lib/contracts/**`
9. **Environment configuration**
   - Next.js app + services → root `.env.*` + `src/lib/env/**`
   - Blockchain tooling → `blockchain/.env` (template:
     `blockchain/.env.example`)

### 2.2 Prefer extending existing modules over creating new ones

Before creating a new helper or service file:

1. Search existing modules:
   - `src/lib/utils`
   - `src/lib/api`
   - `src/lib/env`
   - `src/lib/db`
   - `src/lib/contracts`
   - `src/features/<feature>/services`
2. If similar behavior exists:
   - Extend the existing module:
     - Add a new function or overload.
     - Add options/parameters.
     - Add code paths that preserve existing behavior by default.
3. Only create new files when:
   - Responsibility is clearly distinct.
   - Extending existing modules would reduce clarity.

### 2.3 Server vs client boundaries

- Do **not** import:
  - `src/lib/db/**`,
  - `src/lib/env/**`,
  - `blockchain/**`  
    in client-only components or hooks.
- Client components may:
  - Call server actions in `src/lib/api`.
  - Use contract clients designed for the browser.
- Secrets, DB access, and low-level contract deployment logic must stay in:
  - Server Components.
  - Route handlers.
  - Server actions.
  - Scripts.
  - Feature services invoked from server contexts.

### 2.4 Routing-specific decisions

- Use route groups `(marketing)`, `(app)`, `(auth)` to organize sections.
- Use dynamic segments `[id]` for resource-specific pages.
- Introduce additional route groups as needed (`(admin)`, `(studio)`, etc.).
- Keep URLs stable; refactor internals via groups and feature refactors rather
  than URL churn.

### 2.5 Caching and performance (Next.js 15)

- Centralize expensive logic in:
  - `src/lib/cache`, `src/lib/db`, or feature services.
- Remember:
  - `GET` Route Handlers are uncached by default.
  - `fetch` defaults to no-store in many server scenarios.
- Opt into caching explicitly using:
  - Route config (`dynamic`, `revalidate`).
  - `fetch` options.
- Avoid copy-pasting caching logic; prefer shared helpers.

### 2.6 Database and services

- Convex schema and functions live under `convex/`.
- Convex client helpers live under `src/lib/db/convex/client.ts`.
- Domain-specific data workflows belong in feature services or Convex functions.

### 2.7 Blockchain workspace (if present)

- Keep all Solidity in `blockchain/contracts`.
- Use Hardhat scripts to compile/deploy `SubscriptionManager.sol`.
- Keep frontend subscription address and price env values in root `.env.local`.
- Never import from `blockchain/**` in the Next.js runtime; rely on
  `src/lib/contracts/**`.

**KEEP THE HEADINGS CONTENTS BELOW UPDATED:**

# Platform Summary

## Pages

- `/` (Tollora marketing home)
- `/pricing` (MUSD API marketplace pricing and fee split)
- `/developers`, `/developers/docs` (developer onboarding and gateway docs)
- `/privacy`, `/terms`
- `/dashboard`, `/agents`, `/agents/new`, `/agents/[runId]`, `/marketplace`,
  `/marketplace/[slug]`, `/orders`, `/orders/new`, `/orders/[orderId]`,
  `/receipts/[receiptId]`, `/provider`, `/provider/products`,
  `/provider/products/new`, `/provider/products/[productId]`, `/provider/usage`,
  `/profile`, `/billing`, `/settings` (wallet-protected app pages)
- `/proofs/[proofId]` (public autonomous agent proof page)
- `/admin`, `/admin/users`, `/admin/products`, `/admin/orders`,
  `/admin/subscriptions`, `/admin/operations` (wallet-protected admin pages for
  allowlisted wallets)

## API endpoints

- `POST /api/auth` — auth route stub (returns 501)
- `GET /api/health` — returns Tollora readiness checks for Mezo, x402, wallet
  onboarding, external API forwarding, marketplace listings, and receipts.
- `POST /api/webhooks` — webhook intake stub
- `POST /api/providers/self/products` — validates provider API product input,
  schema JSON, wallet fields, upstream endpoint URL, upstream auth, async
  polling mappings, runtime model, price, agent readiness, and visibility, then
  records a provider-created marketplace listing and returns the accepted
  product response.
- `PATCH /api/providers/self/products/[slug]/status` — updates a provider
  product lifecycle state between draft, published, and paused for management
  workflows.
- `DELETE /api/providers/self/products/[slug]` — deletes a provider-created API
  product from the local provider catalog and removes it from provider
  management and marketplace discovery.
- `POST /api/orders` — validates a buyer API request payload and returns a
  payment-required order record for the selected marketplace product.
- `GET /api/orders/[orderId]` — returns an order lifecycle record.
- `GET /api/orders/[orderId]/provider-status` — polls a provider adapter for
  long-running job status, compares final credit-metered usage with the prepaid
  quote, locks results that require a metered delta, and returns the latest
  provider payload.
- `GET /api/receipts/[receiptId]` — returns a MUSD settlement receipt record.
- `POST /api/credits/accounts` — creates or returns a managed credit account and
  Tollora API key for a wallet.
- `POST /api/credits/top-ups` — records a MUSD top-up transaction hash and
  increases the wallet's managed credit balance.
- `POST /api/credits/products/[slug]/call` — calls a product with a Tollora API
  key, reserves managed credits before provider work starts, releases the
  reservation on provider failure, settles lower final usage back to the credit
  balance, and records a receipt linked to the top-up transaction.
- `GET /api/agents/runs` and `POST /api/agents/runs` — list and create
  autonomous Launch Pack Agent runs with objective, source context, owner
  wallet, budget cap, max paid actions, allowed marketplace tools, and signer
  mode.
- `GET /api/agents/runs/[runId]` — returns agent run status, paid actions,
  deliverables, receipts, and proof state.
- `POST /api/agents/runs/[runId]/execute` — runs the autonomous workflow,
  calling selected Tollora x402 product endpoints with the configured agent
  spender when available and returning local tool results without fabricated
  settlement receipts otherwise.
- `POST /api/agents/runs/[runId]/attest` — hashes completed run metadata and
  writes the proof to the configured Mezo AgentRunAttestor when available.
- `GET /api/proofs/[proofId]` — returns a public proof package for a completed
  autonomous agent run.
- `GET /api/x402/products/[slug]/call` and `POST /api/x402/products/[slug]/call`
  — protect product calls with x402, return HTTP 402 payment requirements for
  unpaid requests, quote credit-metered requests before payment, verify and
  settle signed MUSD payments through the configured facilitator, start
  credit-metered async provider work only after settlement, return paid provider
  responses or pollable job records, and attach receipt metadata.
- `POST /api/x402/orders/[orderId]/claim` — protects metered result release with
  x402 when final provider usage exceeds the prepaid quote, settles the delta in
  MUSD, unlocks the stored provider result, and records a delta receipt.
- `POST /api/providers/openapi/preview` — imports a hosted or uploaded OpenAPI
  JSON/YAML document and returns paid-listing candidates with inferred endpoint
  URL, method, auth type, schemas, reference payload, async polling paths, and
  result mapping.
- `GET /api/openapi.json` — returns the Tollora OpenAPI document.
- `GET /api/reference` — serves the Scalar API reference for the OpenAPI
  document.

## Architecture Overview

- Next.js 15 App Router under `src/app` with `(marketing)` and `(app)` route
  groups.
- Convex backend in `convex/` with marketplace tables for providers, API
  products, product versions, orders, receipts, API requests, webhooks, usage
  events, payouts, autonomous agent runs, agent actions, agent proofs, saved
  examples, and reviews; client helper in `src/lib/db/convex/client.ts`.
- Hardhat blockchain workspace in `blockchain/` with
  `contracts/SubscriptionManager.sol` plus `contracts/AgentRunAttestor.sol` for
  Mezo proof hashes. The agent attestor deploy script prints
  `NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS` for the root app environment.
- Shared UI primitives in `src/components/ui` and layout shells in
  `src/components/layout`.
- Shared site header in `src/components/layout/site-header.tsx` across marketing
  and app shells, with Tollora logo branding, marketplace search, profile
  access, theme controls, wallet controls, and public navigation. The header
  uses an opaque sticky surface, fixed brand sizing, responsive search
  visibility, and non-overlapping action controls.
- The app favicon is generated from the Tollora logo and lives only at
  `src/app/favicon.ico`; public image branding lives at
  `public/images/tollora-logo.png`.
- Authenticated app routes use `src/components/layout/app-sidebar.tsx` for
  dashboard, marketplace, provider, profile, billing, and settings navigation.
- Tollora marketplace product registry, provider-created listings, product
  schemas, upstream auth metadata, async polling mappings, prices, x402 flags,
  and dashboard metrics live in `src/features/marketplace/products.ts`; reusable
  marketplace cards live in `src/features/marketplace/product-card.tsx`.
  Provider-created listings are persisted to the workspace-local
  `.tollora/provider-products.json` catalog so draft, paused, and published
  products remain manageable across local server restarts.
- Autonomous Launch Pack Agent models, run storage, paid action execution, proof
  hashing, status labels, and UI clients live in `src/features/agents`.
- `/agents` lists agent templates, recent runs, spend, completed proofs, and
  failed work; `/agents/new` configures objective, source context, owner wallet,
  budget cap, max paid actions, allowed paid tools, and local/production signer
  mode with all marketplace tools deselected until the user selects them or lets
  the agent choose from published agent-ready listings; `/agents/[runId]`
  executes paid actions, shows receipts and deliverables, and writes Mezo proof
  attestations.
- `/proofs/[proofId]` publicly displays non-sensitive autonomous run proof
  metadata, proof hash, receipt IDs, total MUSD spend, attestation transaction,
  and Mezo explorer link.
- Provider adapters live in `src/features/provider-adapters`; the registry uses
  the generic external HTTP adapter for provider-created listings. The external
  HTTP adapter forwards paid requests to the configured upstream endpoint,
  applies bearer, API-key, query-key, or basic auth server-side, sends
  idempotency headers, extracts external job IDs and result URLs through
  configured JSON paths, and polls provider status endpoints for async products.
  Credit-metered async providers receive generic external prepaid metadata with
  order, receipt, buyer, and settlement references so provider APIs can report
  estimated, charged, and refunded usage without importing Tollora settlement
  logic.
- `/marketplace` lists published provider-created MUSD-paid API products with
  category filters, price badges, provider names, x402 protection badges,
  agent-ready badges, and entry points for autonomous agent runs.
- `/marketplace/[slug]` displays product detail, request schema, response
  schema, copyable reference payload, full endpoint URL, raw 402 inspection
  curl, standalone x402 buyer integration code, execution mode, settlement
  model, result delivery model, Run with wallet entry point, Use from code
  anchor, and Use in agent run entry point.
- `/orders/new` shows selected product price, gateway endpoint, method,
  provider, connected buyer wallet, and a schema-driven request builder that
  generates validated fields from the product request schema, respects explicit
  required/optional markers from imported OpenAPI schemas, coerces arrays,
  objects, numbers, booleans, and URLs before quote requests, and keeps an
  advanced JSON preview before a payable API request is created. Failed
  preparation attempts show a compact readable error plus an expandable complete
  request/response payload so provider quote, validation, and pricing errors are
  visible and copyable during integration testing without cluttering the page.
  Successful preparation clears failure debug state, shows a short success
  status, stores the order in browser session storage, and redirects to the Run
  & Pay order page.
- `/provider` shows provider revenue, API call volume, success rate, top
  product, recent request activity, product listing health, production
  narrative, and the 95% provider / 5% platform fee split.
- `/provider/products` lists provider API products with status context, price,
  call volume, gateway path, listing links, deletion controls, and next-step
  management actions for drafts, paused listings, and live products.
- `/provider/products/new` uses
  `src/features/marketplace/provider-product-form.tsx` and
  `src/features/marketplace/schemas.ts` to validate provider product metadata,
  schemas, upstream endpoint URL, upstream authentication requirements, async
  polling requirements, runtime model, fixed or credit-metered MUSD pricing,
  wallet fields, agent readiness, OpenAPI-imported operation defaults, and
  visibility before posting to the product API route. Provider form labels link
  to field-specific anchors on `/developers/docs` instead of hover-only help,
  including OpenAPI import, pricing, authentication, runtime, polling, schema,
  webhook, and agent-readiness documentation. The provider form uses the shared
  product input schema for client-side field errors before submission, and the
  API route uses the same schema as the server guard. The OpenAPI importer
  detects operation-level or document-level security schemes, credit fields such
  as `estimatedCredits`, and 202 Accepted job operations, links async
  job-creation operations to matching status endpoints from the imported spec,
  marks required provider auth and polling fields accurately, and preserves
  OpenAPI request-body required/optional field metadata for provider test runs.
- `/provider/products/[productId]` is the provider API management workspace. It
  shows lifecycle controls for publishing, pausing, and returning products to
  draft, a launch checklist, payable schema-driven test runs, gateway endpoint
  copy support, product deletion, provider contract details, and
  request/response schema details.
- `/provider/usage` shows provider API calls, MUSD revenue, buyer wallets,
  request IDs, and status labels.
- `/orders` and `/orders/[orderId]` show buyer request lifecycle state using
  shared order status labels and descriptions from
  `src/features/marketplace/status.ts`; order detail pages sign x402 MUSD
  payments with the connected browser wallet, check and submit the required Mezo
  MUSD Permit2 allowance transaction when needed, verify MUSD balance before
  asking for payment signatures, retry the product call, display step-by-step
  wallet progress as a compact icon timeline with explorer links for submitted
  transactions, surface settlement failure guidance from the x402 facilitator,
  show payment failures as dedicated alert cards with copyable error text, keep
  long explanations inside collapsible details, separate direct API responses
  from async provider jobs, poll provider status when an order has an external
  job ID, keep 402 inspection as a diagnostic action, persist receipt metadata
  in browser session storage, show quote/reservation/final usage amounts for
  credit-metered calls, claim metered deltas through x402 before revealing
  locked results, and link to the settlement receipt and Mezo explorer
  transaction. Draft products stay hidden from public marketplace usage but can
  be tested through provider management by creating provider-test order records;
  locally persisted draft listings created before owner metadata exists can
  still be tested through matching order records.
- Marketplace products declare whether they are synchronous or asynchronous,
  whether settlement happens after a successful response, after job acceptance,
  or when a completed result is claimed, and whether results are returned
  directly, polled/webhooked, or revealed after completion.
- Marketplace products support fixed per-call MUSD pricing and credit-metered
  pricing. Credit-metered products call a provider quote endpoint or read a
  deterministic credit field before x402 settlement, convert credits to MUSD
  with a configured rate and multiplier, reserve or settle the quoted amount
  before expensive provider work starts, compare final usage against the quote,
  lock results that need a delta payment, include failed quote response status
  and response body in pricing errors, and record quote, paid, actual, and
  release metadata on orders and receipts.
- `/receipts/[receiptId]` displays product, provider, buyer wallet, provider
  wallet, MUSD amount, fee split, network, transaction hash, and explorer link
  for settled API calls.
- `/billing` displays workspace billing context, managed credit API-key
  creation, MUSD top-up records, API-key debit history, payment readiness,
  autonomous agent spend, proof counts, and recent MUSD receipt records.
- `/admin/products` and `/admin/orders` provide allowlisted operational review
  for marketplace listings and buyer API request records.
- `/developers` and `/developers/docs` describe provider onboarding, OpenAPI
  import, x402 paid calls, fixed-price provider contracts, credit-metered
  quote-first provider contracts, external prepaid async job metadata, final
  usage delta handling, autonomous agent runs, Mezo proof attestations, gateway
  forwarding, receipt records, external HTTP adapter behavior, OpenAPI JSON, and
  the Scalar API reference. The developer docs page renders GitHub-flavored
  Markdown with `react-markdown` and `remark-gfm`, uses a sticky table of
  contents, and exposes stable section and field anchors used by provider form
  documentation links.
- Admin routes use `src/components/layout/admin-sidebar.tsx`; the users table is
  server-rendered from URL search, filter, sort, and pagination parameters.
- Admin user row actions use three-dot menus with reusable responsive dialogs
  for editing user details, subscription tier, and destructive confirmations.
- Chain metadata, native currency labels, and explorer URL generation are
  centralized in `src/lib/config/chains.ts`; Mezo Testnet is the default app
  chain with chain ID `31611`, BTC native gas currency,
  `https://rpc.test.mezo.org` RPC, and `https://explorer.test.mezo.org`
  explorer.
- Operational readiness checks live in `src/lib/operations/readiness.ts` and
  feed `/api/health` plus the admin operations page, including agent signer,
  attestor, and public proof readiness.
- x402 network configuration uses the CAIP-2 identifier `eip155:31611`; the
  resource server in `src/lib/x402/tollora-resource-server.ts` registers the EVM
  `exact` scheme, uses `X402_FACILITATOR_URL`, protects product call routes, and
  relies on the x402 stablecoin registry to resolve dollar-denominated prices to
  MUSD on Mezo.
- Walkthrough and deployment documentation lives in `docs/demo-script.md` and
  `docs/deployment-checklist.md`.
- The admin subscriptions page reads SubscriptionManager balance, plan prices,
  paginated subscriber rows, treasury withdrawal support, and explorer links
  from the configured subscription chain.
- Admin access is limited to wallets listed in
  `NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES`.
- Global styling via `src/styles/globals.css` and `src/styles/tokens.css`, using
  logo-derived cyan, blue, purple, orange, and yellow brand tokens for light and
  dark themes.
- Wallet provider toggle via `NEXT_PUBLIC_WALLET_PROVIDER` with Thirdweb or
  RainbowKit integrations.
- Environment parsing treats blank optional values as unset so local optional
  URL fields do not fail validation.
- RainbowKit configuration uses the shared Mezo Testnet chain registry when
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is configured, and initializes on Mezo
  Testnet.
- RainbowKit wallet buttons show the connected address inline and keep balance
  details inside the wallet dialog.
- Wallet configuration helpers in `src/lib/wallet`.
- App route protection uses `src/middleware.ts`,
  `src/lib/auth/wallet-session.ts`, and
  `src/components/layout/protected-app-guard.tsx` to require an active wallet
  connection for `/dashboard`, `/agents`, `/marketplace`, `/orders`,
  `/receipts`, `/provider`, `/profile`, `/billing`, `/settings`, and `/admin`;
  admin routes also require an allowlisted wallet address.
- Wallet-auth redirects add an auth reason to the home page, which displays a
  dismissible notice through `src/components/feedback/auth-required-toast.tsx`.
- Browser-local account preferences are managed in
  `src/lib/settings/user-settings.ts` and surfaced through settings and profile
  components.
- Server-readable admin user records and table controls live in
  `src/lib/admin/admin-users.ts`.
- Subscription checkout, billing renewal/cancellation controls, user payment
  history links, and admin subscription operations use
  `src/lib/contracts/subscription.ts`,
  `src/lib/contracts/subscription-admin.ts`, the chain registry, and the
  configured `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS`.
- Route transitions show a top progress loader via `nextjs-toploader`. Client
  components that navigate programmatically use the `nextjs-toploader/app`
  router wrapper so `push` and `replace` redirects show the same loader as
  link-based navigation. `NavigationProgressEvents` starts the same loader for
  same-origin form submits and browser-level unload navigations so redirects
  outside `next/link` still show progress.
- Theme switching using `next-themes` with class-based dark mode.

## Core Commands

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm lint:fix`
- `pnpm format`
- `pnpm format:code`
- `pnpm lint:all`
- `pnpm typecheck`
- `pnpm convex:dev`
- `pnpm convex:deploy`
- `pnpm convex:redeploy`
- `pnpm convex:reset`
- `pnpm contracts:deploy`
- `pnpm contracts:deploy:agent`
- `pnpm x402:call <product-slug>`
- `pnpm --dir blockchain deploy:agent-attestor`
