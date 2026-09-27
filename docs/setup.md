# Local setup

## Requirements

- Node.js 22.12+ and npm 11+.
- A browser wallet that supports EIP-1193 and Ethereum Sepolia.

## Run locally

1. Clone this private repository and open its root directory.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SEPOLIA_PAYMENT_RECIPIENT_ADDRESS` to the intended public destination wallet address (20-byte `0x…` address). This is required: with it blank, analysis will not approve a real payment.
5. The example config uses Circle USDC on Sepolia, address `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, 6 decimals. Verify it against Circle's official contract list before a transfer. Optional `NEXT_PUBLIC_SEPOLIA_RPC_URL` is only needed for adding Sepolia to wallets that do not know the network. It must be a public HTTPS RPC URL; values with `NEXT_PUBLIC_` are exposed to the browser. Never place credentials or secrets there.
6. Ensure the connected wallet has Sepolia ETH for network fees and enough Sepolia USDC for the amount. The app does not query or invent balances. Testnet assets have no real-world value.
7. For durable PaymentProof records, set the server-only `DATABASE_URL` to a reachable MySQL/MariaDB connection URL. The app creates its `payment_proofs` table automatically. When `DATABASE_URL` is blank, local development falls back to `mysql://root:@localhost:3306/trustpay`; create that local database first if you use the fallback.
8. Run `npm run dev` and open http://localhost:3000.

For a hosted deployment, add `DATABASE_URL` in the hosting provider's server-side environment-variable settings and redeploy. Never use a `NEXT_PUBLIC_` prefix for this variable and never commit database credentials. The database must allow connections from the deployed app.

## First manual Sepolia payment

1. Enter the demo request for ABC Software, invoice INV-001, 500.00 USDC and analyze it. Confirm Trust Engine says APPROVED and shows the configured recipient address.
2. Connect the browser wallet. Check the displayed sender address and confirm the wallet is on Ethereum Sepolia (chain ID 11155111). If needed, accept the wallet's network-switch prompt.
3. Review the payment details and select the human approval action. It creates a short-lived, in-memory approval bound to a digest of this exact payment intent and your connected public wallet address.
4. Select the sign-and-send action. Review the wallet confirmation itself: token contract, destination, amount and Sepolia network. Only the wallet may sign and broadcast; rejecting the wallet prompt cancels the action.
5. The app waits for a successful transaction receipt (up to three minutes). On success it displays the hash, block number, network and Sepolia Etherscan link as a PaymentProof. These fields come from the wallet/RPC receipt; before a successful receipt no hash or proof is shown.
6. If waiting times out, check the wallet or explorer before retrying to avoid sending twice. A transaction can remain pending after the app stops waiting.

Never enter or store a wallet private key in VBT TrustPay, source code, GitHub, a database, or an LLM. The browser wallet signs locally. The connected sender address is read from the wallet; it is not a configuration variable. The destination must be the user's intended public address in the local environment configuration. No real funds or mainnet are supported.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before integration.
