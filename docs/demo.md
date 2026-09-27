# Demo scenarios

## Safe simulated cases

The deterministic demo starts from ABC Software, invoice INV-001, amount 500.00 USDC and a synthetic registered supplier wallet. Its test cases cover:

- Valid details: the Trust Engine may approve the exact intent and the app requires a separate human approval.
- Altered destination wallet: BLOCKED with a wallet mismatch.
- Amount mismatch: BLOCKED when the request differs from the invoice.
- Duplicate invoice/payment intent: BLOCKED.
- Unauthorized requester: BLOCKED.

These cases exercise validation only. Synthetic addresses and example data must never be treated as real recipients or evidence of on-chain activity.

## Manual Sepolia transfer

A real test transfer is available only when `NEXT_PUBLIC_SEPOLIA_PAYMENT_RECIPIENT_ADDRESS` is set locally to the intended public destination address and the Trust Engine approves that configured destination. Follow `docs/setup.md`. Connect your wallet, verify the sender and Sepolia network, approve the exact intent, then inspect and confirm the transaction in the wallet. No private key is requested by or supplied to the app.

A PaymentProof is shown only after the Sepolia receipt is successful. It contains the observed transaction hash, block number, network, and explorer link. Before then there is no TX hash or receipt to report. After an app timeout, check the wallet/explorer before retrying.

Use Sepolia test assets only. There is no mainnet support; sensitive business data remains off-chain.
