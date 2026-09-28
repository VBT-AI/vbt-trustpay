import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentIntent } from "../lib/shared/types";
import { evaluatePayment, type TrustContext } from "../lib/trust";

const database = vi.hoisted(() => ({
  invoices: [] as Array<Record<string, unknown>> ,
  suppliers: [] as Array<Record<string, unknown>> ,
}));

vi.mock("mysql2/promise", () => ({
  default: {
    createConnection: vi.fn(async () => ({
      execute: vi.fn(async (query: string, params?: unknown[]) => {
        if (query.includes("FROM invoices")) {
          return [database.invoices.filter((row) => row.id === params?.[0]), []];
        }
        return [database.suppliers, []];
      }),
      end: vi.fn(async () => undefined),
    })),
  },
}));

const wallet = "0x669bcC0eca97bE32Cb3677c005B0dC869ead07A8";
const context: TrustContext = { authorizedRequesters: ["demo-approver"], decimals: 6 };

function intent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: "test-payment", supplierId: "supplier-abc", supplierName: "ABC Software", invoiceId: "INV-001",
    amount: "500.00", currency: "USDC", destinationWallet: wallet, requestedBy: "demo-approver",
    createdAt: "2026-09-26T00:00:00.000Z", ...overrides,
  };
}

beforeEach(() => {
  database.invoices = [
    { id: "INV-001", supplier_id: "supplier-abc", amount: "500.00", currency: "USDC", status: "unpaid" },
    { id: "INV-PAID-001", supplier_id: "supplier-abc", amount: "500.00", currency: "USDC", status: "paid" },
  ];
  database.suppliers = [{ id: "supplier-abc", name: "ABC Software", registered_wallet: wallet }];
});

async function checkFailure(payment: PaymentIntent, code: string) {
  const result = await evaluatePayment(payment, context);
  expect(result.status).toBe("BLOCKED");
  expect(result.checks.find((check) => check.code === code)?.passed).toBe(false);
}

describe("evaluatePayment", () => {
  it("approves the registered supplier wallet and invoice", async () => {
    const result = await evaluatePayment(intent(), context);
    expect(result.status).toBe("APPROVED");
    expect(result.paymentIntentId).toBe("test-payment");
  });
  it("allows a positive partial testnet amount", async () => {
    const result = await evaluatePayment(intent({ amount: "1.00" }), context);
    expect(result.status).toBe("APPROVED");
    expect(result.checks.find((check) => check.code === "AMOUNT_MATCH")?.passed).toBe(true);
  });
  it("blocks an amount above invoice total", async () => checkFailure(intent({ amount: "750.00" }), "AMOUNT_MATCH"));
  it("blocks a wallet mismatch", async () => checkFailure(intent({ destinationWallet: "0x2222222222222222222222222222222222222222" }), "WALLET_MATCH"));
  it("blocks a previously paid invoice", async () => checkFailure(intent({ invoiceId: "INV-PAID-001" }), "INVOICE_UNPAID"));
  it("blocks an unauthorized requester", async () => checkFailure(intent({ requestedBy: "unknown-user" }), "REQUESTER_AUTHORIZED"));
  it("blocks an unknown invoice", async () => checkFailure(intent({ invoiceId: "INV-UNKNOWN" }), "INVOICE_EXISTS"));
  it("blocks an invalid wallet address", async () => checkFailure(intent({ destinationWallet: "not-an-address" as PaymentIntent["destinationWallet"] }), "VALID_WALLET"));
  it("blocks amounts exceeding token precision", async () => checkFailure(intent({ amount: "500.0000001" }), "VALID_AMOUNT"));
});
