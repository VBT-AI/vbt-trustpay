import type { PaymentIntent } from "@/lib/shared/types";
/** Stub only. AI may extract and explain; it cannot approve, sign, or submit payments. */
export async function extractPaymentIntent(_request: string): Promise<PaymentIntent> { throw new Error("AI adapter not configured; no intent created."); }
