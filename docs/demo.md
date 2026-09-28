# Demo scenarios

## A · VALID PAYMENT (existing evidence only)

The demo uses ABC Software, invoice INV-001, with a demo invoice total of 500.00 USDC. The existing Sepolia testnet transfer is 1 USDC, a partial test transfer. It does not settle or mark the full invoice paid.

- Trust Engine: APPROVED for the registered ABC Software destination.
- Human approval and the existing Sepolia wallet flow lead to Payment Proof.
- Existing transaction: [0xc8a1ec3fff87020447e56ebf59ef60190227eccc5a9dfdd42a110830c26cb2b4](https://sepolia.etherscan.io/tx/0xc8a1ec3fff87020447e56ebf59ef60190227eccc5a9dfdd42a110830c26cb2b4)
- Network: Ethereum Sepolia (chain ID 11155111); block: 11794765.

Use this already-confirmed transaction as the evidence. Do not send another USDC transfer for the demo.

## B · WALLET_MISMATCH

Use the built-in mismatch scenario, which changes only the requested destination in the demo PaymentIntent. The supplier's registered wallet remains unchanged. The Trust Engine returns BLOCKED because `WALLET_MATCH` fails. The page must show `TRUST ENGINE: BLOCKED`, `PAYMENT BLOCKED`, and `WALLET MISMATCH`, compare the registered and requested wallets, and state that no transaction was created and no wallet signature was requested. No connect, approve, or sign action is available in this state.

## Demo boundaries

The supplier, invoice, and invoice total are synthetic demo data. The Sepolia transaction is a testnet transfer and does not represent a production payment or a production reliability claim. No private key is handled by the app; no mainnet payment is supported.