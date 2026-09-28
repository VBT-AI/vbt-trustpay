# VBT TrustPay — Project Context

VBT TrustPay is an AI-assisted payment control layer for business payments. This document is the canonical project contract; read it before changing a module.

## Product flow

`User → AI → PaymentIntent → Trust Engine → Human Approval → Wallet → Smart Contract → Blockchain (testnet) → TX Hash → Payment Proof`

AI interprets requests and explains outcomes. Deterministic code decides trust. A named, authorized human approves. A wallet signer and reviewed contract perform any future testnet transaction. The transaction hash and receipt form the payment proof.

## Module responsibilities and prohibitions

- **Request intake (`app/`, `lib/ai`)**: collect a payment request and create the demo PaymentIntent. Request parsing is demo-scoped; it must not decide trust or authorize, approve, access private keys, sign, submit, or claim payment success. Treat parsed fields as untrusted input.
- **Trust Engine (`lib/trust`)**: deterministic validation only. Check invoice exists and is unpaid; supplier identity and invoice ownership; exact amount and currency; destination equals the registered supplier wallet; duplicate intent/invoice; requester authorization; valid chain/token configuration. Return explicit checks and reasons. Any mismatch blocks; missing/ambiguous evidence requires review. AI cannot override it.
- **Human approval**: required after checks and before wallet signing. Approval is tied to the immutable intent fields (supplier, invoice, amount, currency, wallet, chain) and expires if any field changes.
- **Blockchain (`lib/blockchain`)**: Circle USDC transfer through an explicit user wallet on Ethereum Sepolia only. Tangem WalletConnect is account-only on Ethereum mainnet because Tangem does not list Sepolia. Never embed signing keys or bypass Trust Engine/human approval.
- **Frontend (`app/`, `components/`)**: show intent, deterministic checks, approval state, and verified receipt distinctly. Never portray stubs or simulated results as executed payments.
- **Integration (`lib/data`, shared types, docs)**: preserve the shared contract and coordinate changes across owners.

## Shared contracts

`lib/shared/types.ts` owns `PaymentIntent`, `TrustResult`, `PaymentResult`, `SecurityEvent`, and `PaymentProof`. Other modules consume these types instead of defining competing shapes. Changes to this contract require coordination.

## Demo

Synthetic supplier **ABC Software**, invoice **INV-001**, amount **500 USDC**, using its registered wallet. Expected cases: valid request reaches human approval; altered wallet is BLOCKED as `WALLET_MISMATCH`; amount mismatch, duplicate invoice/intent, and unauthorized requester are BLOCKED with deterministic reasons. These are desired behaviors; do not claim a case works until implemented and verified.

## Security and environment

- Testnet payments only; no mainnet payment or production readiness claim. A Tangem mainnet connection may read the public account and chain only; it requests no signing methods and exposes no payment controls. Do not use real signing keys.
- Never commit secrets. Use local `.env.local`; `.env.example` contains names/placeholders only.
- Personal, invoice, supplier, credential, and other sensitive business data stays off-chain. Put only minimum non-sensitive verification material on-chain.
- Never put private keys, API keys, or sensitive invoice data in source, logs, URLs, prompts, or transaction metadata.
- Fail closed on mismatches, unavailable validation, and uncertain transaction status.

## Coordination rule

Do not change architecture, trust boundaries, shared types, or transaction flow without coordination with the integration owner and affected module owners. Document the proposal and update this file before merging a change that alters the contract.

## Current implementation status

The current scope is a hackathon demo. The deterministic Trust Engine, browser-wallet Sepolia flow, Payment Proof, and wallet-mismatch blocked state are implemented. Tangem connection is read-only; production authentication, supplier/customer role management, arbitrary token/network routing, and production payment processing are not implemented. The only real testnet transfer retained as evidence is the documented 1 USDC transaction.
