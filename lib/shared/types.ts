export type PaymentIntent = { id: string; supplierId: string; supplierName: string; invoiceId: string; amount: string; currency: string; destinationWallet: string; requestedBy: string; createdAt: string; };
export type TrustCheck = { id: string; passed: boolean; expected?: string; actual?: string; message: string; };
export type TrustResult = { status: "APPROVED" | "BLOCKED" | "REVIEW"; checks: TrustCheck[]; reasons: string[]; evaluatedAt: string; };
export type PaymentResult = { status: "PENDING_APPROVAL" | "SUBMITTED" | "CONFIRMED" | "FAILED"; txHash?: string; chainId?: number; error?: string; };
export type SecurityEvent = { id: string; type: string; severity: "info" | "warning" | "critical"; paymentIntentId?: string; message: string; createdAt: string; };
export type PaymentProof = { paymentIntentId: string; invoiceId: string; amount: string; currency: string; supplierId: string; destinationWallet: string; chainId: number; txHash: string; confirmedAt: string; };
