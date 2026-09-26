import type { PaymentIntent, TrustResult } from "@/lib/shared/types";
/** Deterministic validation stub only. No trust decision is made yet. */
export function evaluatePayment(_intent: PaymentIntent): TrustResult { throw new Error("Trust Engine not implemented; payment remains unverified."); }
