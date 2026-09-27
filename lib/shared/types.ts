export type PaymentIntent = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceId: string;
  amount: string;
  currency: string;
  destinationWallet: `0x${string}`;
  requestedBy: string;
  createdAt: string;
};

export type TrustCheckCode = "INVOICE_EXISTS" | "SUPPLIER_EXISTS" | "INVOICE_OWNER_MATCH" | "AMOUNT_MATCH" | "CURRENCY_MATCH" | "WALLET_MATCH" | "INVOICE_UNPAID" | "REQUESTER_AUTHORIZED" | "VALID_AMOUNT" | "VALID_WALLET";
export type TrustCheck = { code: TrustCheckCode; passed: boolean; expected?: string; actual?: string; message: string };
export type TrustResult = { paymentIntentId: string; status: "APPROVED" | "BLOCKED"; risk: "LOW" | "HIGH"; checks: TrustCheck[]; reasons: string[]; evaluatedAt: string; humanApprovalRequired: true };
export type HumanApproval = { paymentIntentId: string; approvedBy: string; approvedAt: string; intentDigest: string };
export type PaymentResult = { status: "PREPARED" | "SUBMITTED" | "CONFIRMED" | "FAILED"; txHash?: `0x${string}`; chainId?: number; error?: string };
export type SecurityEvent = { id: string; type: string; severity: "info" | "warning" | "critical"; paymentIntentId?: string; message: string; createdAt: string };
export type PaymentProof = { paymentIntentId: string; invoiceId: string; amount: string; currency: string; supplierId: string; destinationWallet: `0x${string}`; chainId: number; network: "Ethereum Sepolia"; txHash: `0x${string}`; blockNumber: number; explorerUrl: string; confirmedAt: string };
