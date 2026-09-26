# VBT TrustPay — Intelligent Payment Control Layer

Business payments can fail through supplier impersonation, changed destination wallets, duplicate invoices, incorrect amounts, or unauthorized requests. VBT TrustPay is designed to add verifiable controls before a payment reaches a wallet.

A user describes the payment. AI proposes structured details and explains results. A deterministic Trust Engine checks supplier, invoice, amount, currency, registered wallet, duplicate status, and requester authorization. An authorized person approves the exact intent. A reviewed smart contract can then execute on a testnet and provide a transaction hash and payment proof.

The demo centers on ABC Software, invoice INV-001, for 500 USDC. A changed wallet should be blocked with a clear reason.

**Ask → Analyze → Verify → Approve → Pay → Prove**

AI never approves or signs. Sensitive invoice information remains off-chain. The current repository is a scaffold: these checks and execution are not yet implemented, and no funds are moved.
