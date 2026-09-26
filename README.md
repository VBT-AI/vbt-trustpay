# VBT TrustPay

AI-assisted payment control with deterministic verification, explicit human approval, and testnet evidence.

**Ask → Analyze → Verify → Approve → Pay → Prove**

## Flow

`User → AI → PaymentIntent → Trust Engine → Human Approval → Wallet → Smart Contract → Blockchain (testnet) → TX Hash → Payment Proof`

The AI proposes details and explains results. Deterministic code validates them. An authorized human approves the exact payment before any wallet action.

## Demo data

ABC Software · INV-001 · 500 USDC · registered supplier wallet. Demo scenarios include valid details, altered wallet, amount mismatch, duplicate invoice, and unauthorized requester.

## Status

This repository is an initial scaffold. The AI, Trust Engine and blockchain modules are explicit stubs; no payment is executed, no wallet connects, and no payment proof is generated. No production deployment or real funds.

## Local development

Requires Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. See [setup](docs/setup.md), [architecture](docs/architecture.md), [security](docs/security.md), [demo](docs/demo.md), and [pitch](docs/pitch.md).

## Checks

`npm run lint` · `npm run typecheck` · `npm run build`
