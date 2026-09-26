# Local setup

## Requirements

Node.js 20.9+ and npm.

## Development

1. Clone the private repository and open its root directory.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`; configure testnet values only. Never commit `.env.local`.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Use `npm run lint`, `npm run typecheck`, and `npm run build` before proposing integration.

The current AI, Trust Engine, and blockchain functions are stubs that throw explicit not-configured errors. No provider, wallet, or RPC integration is set up. Use synthetic data and testnet only.
