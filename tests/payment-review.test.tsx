import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaymentReview } from "../components/payment-review";
import type { PaymentIntent, TrustResult } from "../lib/shared/types";

const registeredWallet = "0x669bcC0eca97bE32Cb3677c005B0dC869ead07A8";
const requestedWallet = "0x2222222222222222222222222222222222222222";

const intent: PaymentIntent = {
  id: "wallet-mismatch-demo",
  supplierId: "supplier-abc",
  supplierName: "ABC Software",
  invoiceId: "INV-001",
  amount: "1.00",
  currency: "USDC",
  destinationWallet: requestedWallet,
  requestedBy: "demo-approver",
  createdAt: "2026-09-27T00:00:00.000Z",
};

const blockedTrust: TrustResult = {
  paymentIntentId: intent.id,
  status: "BLOCKED",
  risk: "HIGH",
  checks: [{
    code: "WALLET_MATCH",
    passed: false,
    expected: registeredWallet,
    actual: requestedWallet,
    message: "Destination matches the supplier registered wallet.",
  }],
  reasons: ["WALLET_MATCH"],
  evaluatedAt: "2026-09-27T00:00:00.000Z",
  humanApprovalRequired: true,
};

describe("PaymentReview", () => {
  it("explains WALLET_MISMATCH and exposes no wallet or payment action when blocked", () => {
    const html = renderToStaticMarkup(<PaymentReview intent={intent} trust={blockedTrust} mode="demo" invoiceTotal="500.00">
      <button>Connect Rabby</button><button>Approve &amp; Pay</button>
    </PaymentReview>);

    expect(html).toContain("TRUST ENGINE: BLOCKED");
    expect(html).toContain("PAYMENT BLOCKED");
    expect(html).toContain("WALLET MISMATCH");
    expect(html).toContain("WALLET MATCH");
    expect(html).toContain("false");
    expect(html).toContain(registeredWallet);
    expect(html).toContain(requestedWallet);
    expect(html).toContain("The requested destination does not match the supplier&#x27;s registered wallet. Payment execution was blocked.");
    expect(html).toContain("No transaction was created");
    expect(html).toContain("No wallet signature was requested");
    expect(html).toContain("Payment was prevented before blockchain execution");
    expect(html).not.toContain("Connect Rabby");
    expect(html).not.toContain("Approve &amp; Pay");
    expect(html).not.toContain("Review in Rabby");
  });

  it("keeps the demo transfer labeled as partial against the 500 USDC invoice", () => {
    const html = renderToStaticMarkup(<PaymentReview intent={intent} trust={blockedTrust} mode="demo" invoiceTotal="500.00" />);
    expect(html).toContain("PARTIAL PAYMENT");
    expect(html).toContain("1.00 USDC against the demo invoice total of 500.00 USDC");
    expect(html).toContain("does not settle or mark the full invoice paid");
  });
});
