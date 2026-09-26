# Local setup

## Requirements

- Node.js 22.12+ (the CI runner uses Node 22).
- npm 11+.

## Demo mode

1. Clone the private repository and open its root directory.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`. Demo mode is the default and uses deterministic synthetic data.
4. Run `npm run dev` and open http://localhost:3000.
5. Run `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build` before proposing integration.

## Sepolia transaction preparation

The blockchain adapter creates unsigned ERC-20 `transfer(address,uint256)` calldata on chain ID 11155111. The example file points to Circle native USDC on Ethereum Sepolia (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, 6 decimals). Confirm the token and network in the explorer before use.

`prepareSepoliaTransfer` requires an approved Trust Engine result and a `HumanApproval` bound to the exact payment intent digest. It returns a prepared transaction object. Signing and broadcast are intentionally disabled; the app does not have a wallet connector or RPC provider integrated, so this repository cannot submit or produce a transaction hash yet. No `.env.local`, wallet secret, or RPC credential belongs in Git. Use only Sepolia, test USDC, and test ETH.
