# Blockchain Workspace

This workspace keeps the subscription contract isolated from the Next.js
runtime while still providing deployment shortcuts for the starter.

## Structure

- `blockchain/contracts/SubscriptionManager.sol` — the only on-chain contract
  supported by the starter.
- `blockchain/hardhat.config.ts` — Hardhat configuration for Base Sepolia.
- `blockchain/scripts/deploySubscriptionManager.ts` — deployment script that
  writes the deployed address to `blockchain/deployment.log`.
- `src/lib/contracts/` — frontend-facing subscription ABI and address helpers.

## Setup

1. Copy `blockchain/.env.example` to `blockchain/.env` and fill in RPC,
   deployer, admin, and platform addresses.
2. Install dependencies from the blockchain workspace.
3. Compile and deploy the subscription contract.

```bash
cd blockchain
pnpm install
pnpm compile
pnpm deploy:subscription
```

## Notes

- Copy `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS` from
  `blockchain/deployment.log` into the root `.env.local` after deployment.
- Avoid importing from `blockchain/**` in the Next.js runtime.
