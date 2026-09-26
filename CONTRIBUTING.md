# Contributing

- Read `docs/PROJECT_CONTEXT.md` and the relevant architecture/security docs before making changes.
- Keep shared types in `lib/shared/types.ts`; coordinate architecture, trust boundary, and interface changes before implementation.
- Keep Trust Engine decisions deterministic and fail closed. AI must not authorize, approve, sign, or submit.
- Use synthetic records and testnets only. Never commit secrets or place sensitive invoice data on-chain.
- Label stubs and simulations clearly; do not claim functionality that has not been implemented and verified.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` when dependencies are available; report any skipped checks.
- Make focused commits with imperative summaries.
