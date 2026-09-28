import type { PaymentIntent } from "@/lib/shared/types";
import type { TrustContext } from "@/lib/trust";

// Synthetic data for Demo Mode only. These addresses are not production recipients.
export const demoSupplier = { id: "supplier-abc", name: "ABC Software", registeredWallet: "0x669bcC0eca97bE32Cb3677c005B0dC869ead07A8", authorizedApprovers: ["demo-approver"] };
export const demoInvoice = { id: "INV-001", supplierId: demoSupplier.id, amount: "500.00", currency: "USDC", status: "unpaid" as const };
const base: PaymentIntent = { id: "demo-inv-001", supplierId: demoSupplier.id, supplierName: demoSupplier.name, invoiceId: demoInvoice.id, amount: "500.00", currency: "USDC", destinationWallet: demoSupplier.registeredWallet as `0x${string}`, requestedBy: "demo-approver", createdAt: "2026-09-26T00:00:00.000Z" };
export const demoCases: Record<string, PaymentIntent> = {
  valid: base,
  walletAltered: { ...base, id: "demo-wallet-altered", destinationWallet: "0x2222222222222222222222222222222222222222" },
  amountMismatch: { ...base, id: "demo-amount-mismatch", amount: "750.00" },
  duplicate: { ...base, id: "demo-duplicate", invoiceId: "INV-PAID-001" },
  unauthorized: { ...base, id: "demo-unauthorized", requestedBy: "unknown-user" },
  unknownInvoice: { ...base, id: "demo-unknown-invoice", invoiceId: "INV-UNKNOWN" },
};
export const demoTrustContext: TrustContext = {
  suppliers: [{ id: demoSupplier.id, name: demoSupplier.name, registeredWallet: demoSupplier.registeredWallet }],
  invoices: [demoInvoice, { id: "INV-PAID-001", supplierId: demoSupplier.id, amount: "500.00", currency: "USDC", status: "paid" }],
  authorizedRequesters: demoSupplier.authorizedApprovers,
  decimals: 6,
};
export const demoScenarioLabels: Record<string, string> = { valid: "Valid payment", walletAltered: "Altered wallet", amountMismatch: "Amount mismatch", duplicate: "Duplicate invoice", unauthorized: "Unauthorized requester", unknownInvoice: "Unknown invoice" };
