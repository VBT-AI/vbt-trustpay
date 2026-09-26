# Demo scenarios

Synthetic baseline: **ABC Software**, invoice **INV-001**, **500 USDC**, destination wallet registered for the supplier.

## Expected Trust Engine behavior

These are acceptance expectations, not functioning checks yet; `lib/trust` is explicitly a stub.

- Valid details: checks pass and the payment moves to explicit human approval. A transaction is successful only after a confirmed testnet receipt.
- Altered wallet: BLOCKED with a wallet mismatch reason.
- Amount mismatch: BLOCKED if the requested amount differs from the invoice.
- Duplicate: BLOCKED if the invoice was paid or its intent was already processed.
- Unauthorized requester: BLOCKED if the requester lacks approval rights.

All records are synthetic. No mainnet or real funds. Sensitive business data stays off-chain.
