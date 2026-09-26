import { describe, expect, it } from "vitest";
import type { PaymentIntent } from "../lib/shared/types";
import { evaluatePayment, type TrustContext } from "../lib/trust";

const wallet = "0x1111111111111111111111111111111111111111" as const;
const context: TrustContext = {
  suppliers: [{ id: "abc-software", name: "ABC Software", registeredWallet: wallet }],
  invoices: [
    { id: "INV-001", supplierId: "abc-software", amount: "500.00", currency: "USDC", status: "unpaid" },
    { id: "INV-PAID-001", supplierId: "abc-software", amount: "500.00", currency: "USDC", status: "paid" },
  ],
  authorizedRequesters: ["demo-approver"],
  decimals: 6,
};

function intent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: "test-payment", supplierId: "abc-software", supplierName: "ABC Software", invoiceId: "INV-001",
    amount: "500.00", currency: "USDC", destinationWallet: wallet, requestedBy: "demo-approver",
    createdAt: "2026-09-26T00:00:00.000Z", ...overrides,
  };
}

function expectBlocked(payment: PaymentIntent, code: string) {
  const result = evaluatePayment(payment, context);
  expect(result.status).toBe("BLOCKED");
  expect(result.reasons).toContain(code);
  expect(result.humanApprovalRequired).toBe(true);
}

describe("evaluatePayment", () => {
  it("approves a matching invoice and authorized requester", () => {
    const result = evaluatePayment(intent(), context);
    expect(result.status).toBe("APPROVED");
    expect(result.reasons).toEqual([]);
    expect(result.humanApprovalRequired).toBe(true);
  });
  it("blocks an altered wallet", () => expectBlocked(intent({ destinationWallet: "0x2222222222222222222222222222222222222222" }), "WALLET_MATCH"));
  it("blocks an amount mismatch", () => expectBlocked(intent({ amount: "750.00" }), "AMOUNT_MATCH"));
  it("blocks a previously paid duplicate invoice", () => expectBlocked(intent({ invoiceId: "INV-PAID-001" }), "INVOICE_UNPAID"));
  it("blocks an unauthorized requester", () => expectBlocked(intent({ requestedBy: "unknown-user" }), "REQUESTER_AUTHORIZED"));
  it("blocks an unknown invoice", () => expectBlocked(intent({ invoiceId: "INV-UNKNOWN" }), "INVOICE_EXISTS"));
  it("blocks malformed wallet addresses", () => expectBlocked(intent({ destinationWallet: "not-an-address" as PaymentIntent["destinationWallet"] }), "VALID_WALLET"));
  it("blocks amounts over configured decimal precision", () => expectBlocked(intent({ amount: "500.0000001" }), "VALID_AMOUNT"));
});
