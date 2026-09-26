import type { PaymentIntent, PaymentResult } from "@/lib/shared/types";
/** Testnet-only adapter stub. This function never signs or broadcasts. */
export async function submitPayment(_intent: PaymentIntent): Promise<PaymentResult> { throw new Error("Blockchain execution not configured; no transaction submitted."); }
