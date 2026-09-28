# Tangem Wallet connection (WalletConnect)

TrustPay can request a read-only wallet connection to Tangem Wallet through WalletConnect. This demo requests Ethereum mainnet only so Tangem is not asked to connect to Sepolia, which is not among the networks in Tangem’s published WalletConnect support list. On desktop, scan the QR code in Tangem; on mobile, approve the connection in the Tangem app. Connecting shares the public account and selected network only.

## Configuration

1. Create a Reown/WalletConnect Cloud project and add the exact TrustPay site origin to its allowlist. Tangem may require Ethereum to be added to the wallet’s home screen before connecting; the app can display a message if a required network is missing.
2. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in the local environment and the Railway environment for the deployed site. This is a public project identifier, not a signing key.
3. Rebuild/redeploy after changing the environment.

## Current demo limits

- TrustPay's existing payment execution is specifically Ethereum Sepolia + Circle USDC.
- Tangem’s published WalletConnect network list includes Ethereum mainnet but does not include Sepolia. TrustPay therefore requests Ethereum mainnet for Tangem, and that connection remains read-only in this demo; the session does not request transaction-signing methods. The 1 USDC Sepolia payment proof remains historical evidence; do not send another transaction.
- No signing or transaction was performed while adding this connection. The existing Sepolia proof remains the only real testnet transfer in the demo.
- Supporting production payments with Tangem requires a separately reviewed network/token configuration and verified supplier destination for each supported rail.
