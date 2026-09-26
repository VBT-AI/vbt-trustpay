import type { PaymentIntent, TrustCheck, TrustResult } from "@/lib/shared/types";

export type TrustInvoice = { id: string; supplierId: string; amount: string; currency: string; status: "unpaid" | "paid" };
export type TrustSupplier = { id: string; name: string; registeredWallet: string };
export type TrustContext = { invoices: TrustInvoice[]; suppliers: TrustSupplier[]; authorizedRequesters: string[]; decimals?: number };

function toUnits(value: string, decimals: number): bigint | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value.trim());
  if (!match || (match[2]?.length ?? 0) > decimals) return null;
  return BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt((match[2] ?? "").padEnd(decimals, "0") || "0");
}

export function evaluatePayment(intent: PaymentIntent, context: TrustContext): TrustResult {
  const invoice = context.invoices.find((item) => item.id === intent.invoiceId);
  const supplier = context.suppliers.find((item) => item.id === intent.supplierId);
  const decimals = context.decimals ?? 6;
  const requested = toUnits(intent.amount, decimals);
  const expected = invoice ? toUnits(invoice.amount, decimals) : null;
  const validWallet = /^0x[a-fA-F0-9]{40}$/.test(intent.destinationWallet);
  const check = (code: TrustCheck["code"], passed: boolean, message: string, values: Pick<TrustCheck, "expected" | "actual"> = {}): TrustCheck => ({ code, passed, message, ...values });
  const checks: TrustCheck[] = [
    check("INVOICE_EXISTS", !!invoice, invoice ? "Invoice exists." : "Invoice was not found.", { expected: intent.invoiceId, actual: invoice?.id ?? "missing" }),
    check("SUPPLIER_EXISTS", !!supplier, supplier ? "Supplier exists." : "Supplier was not found.", { expected: intent.supplierId, actual: supplier?.id ?? "missing" }),
    check("INVOICE_OWNER_MATCH", !!invoice && invoice.supplierId === intent.supplierId, "Invoice belongs to the requested supplier.", { expected: invoice?.supplierId ?? "missing", actual: intent.supplierId }),
    check("VALID_AMOUNT", requested !== null && expected !== null, "Amounts use valid decimal precision.", { expected: invoice?.amount, actual: intent.amount }),
    check("AMOUNT_MATCH", requested !== null && expected !== null && requested === expected, "Requested amount matches invoice amount.", { expected: invoice?.amount, actual: intent.amount }),
    check("CURRENCY_MATCH", !!invoice && invoice.currency.toUpperCase() === intent.currency.toUpperCase(), "Currency matches invoice currency.", { expected: invoice?.currency, actual: intent.currency }),
    check("VALID_WALLET", validWallet, "Destination is a valid EVM address.", { actual: intent.destinationWallet }),
    check("WALLET_MATCH", !!supplier && validWallet && supplier.registeredWallet.toLowerCase() === intent.destinationWallet.toLowerCase(), "Destination matches the supplier registered wallet.", { expected: supplier?.registeredWallet, actual: intent.destinationWallet }),
    check("INVOICE_UNPAID", !!invoice && invoice.status === "unpaid", "Invoice has not been paid before.", { expected: "unpaid", actual: invoice?.status ?? "missing" }),
    check("REQUESTER_AUTHORIZED", context.authorizedRequesters.includes(intent.requestedBy), "Requester is authorized to approve payments.", { actual: intent.requestedBy }),
  ];
  const reasons = checks.filter((item) => !item.passed).map((item) => item.code);
  return { paymentIntentId: intent.id, status: reasons.length ? "BLOCKED" : "APPROVED", risk: reasons.length ? "HIGH" : "LOW", checks, reasons, evaluatedAt: new Date().toISOString(), humanApprovalRequired: true };
}
