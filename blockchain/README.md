# Blockchain Workspace

This workspace keeps the subscription contract isolated from the Next.js
runtime while providing Tollora deployment shortcuts.

## Structure

- `blockchain/contracts/SubscriptionManager.sol` - the on-chain subscription
  contract supported by Tollora.
- `blockchain/contracts/AgentRunAttestor.sol` - the Mezo proof hash attestor
  for autonomous agent runs.
- `blockchain/hardhat.config.ts` - Hardhat configuration for Base Sepolia and
  Mezo Testnet.
- `blockchain/scripts/deploySubscriptionManager.ts` - deployment script that
  writes the deployed address to `blockchain/deployment.log`.
- `blockchain/scripts/deployAgentRunAttestor.ts` - deployment script that
  prints `NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS`.
- `src/lib/contracts/` - frontend-facing subscription ABI and address helpers.

## Setup

1. Copy `blockchain/.env.example` to `blockchain/.env` and fill in RPC,
   deployer, admin, and platform addresses.
2. Install dependencies from the blockchain workspace.
3. Compile and deploy the subscription contract and agent attestor.

```bash
cd blockchain
pnpm install
pnpm compile
pnpm deploy:subscription
pnpm deploy:agent-attestor
```

## Notes

- Copy `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS` from
  `blockchain/deployment.log` into the root `.env.local` after deployment.
- Copy `NEXT_PUBLIC_AGENT_ATTESTOR_ADDRESS` from the attestor deployment output
  into the root `.env.local` after deployment.
- Avoid importing from `blockchain/**` in the Next.js runtime.
