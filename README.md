# VBT TrustPay

AI-assisted payment control with deterministic verification, explicit human approval, and testnet evidence.

**Ask → Analyze → Verify → Approve → Pay → Prove**

## Flow

`User → PaymentIntent → Trust Engine → Human Approval → Wallet → Circle USDC on Ethereum Sepolia → receipt → Payment Proof`

The AI proposes details and explains results. Deterministic code validates them. An authorized human approves the exact payment before any wallet action.

## Demo data

ABC Software · INV-001 · 500 USDC · registered supplier wallet. Demo scenarios include valid details, altered wallet, amount mismatch, duplicate invoice, and unauthorized requester.

## Status

This is a runnable hackathon demo, not a production payment service. The deterministic Trust Engine blocks altered destinations. The browser-wallet path can make a user-approved Circle USDC transfer on Ethereum Sepolia. Its existing 1 USDC transaction is evidence against a synthetic 500 USDC invoice and must not be repeated. Tangem Wallet currently supports account-only WalletConnect on Ethereum mainnet; it cannot sign this Sepolia demo payment. No mainnet payment is enabled.

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
