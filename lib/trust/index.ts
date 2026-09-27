import type { PaymentIntent, TrustCheck, TrustResult } from "@/lib/shared/types";
import mysql from "mysql2/promise"; 

export type TrustInvoice = { id: string; supplierId: string; amount: string; currency: string; status: "unpaid" | "paid" };
export type TrustSupplier = { id: string; name: string; registeredWallet: string };
export type TrustContext = { invoices?: TrustInvoice[]; suppliers?: TrustSupplier[]; authorizedRequesters: string[]; decimals?: number };

function toUnits(value: string, decimals: number): bigint | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value.trim());
  if (!match || (match[2]?.length ?? 0) > decimals) return null;
  return BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt((match[2] ?? "").padEnd(decimals, "0") || "0");
}

export async function evaluatePayment(intent: PaymentIntent, context: TrustContext): Promise<TrustResult> {
  
  // 1. Imprimimos en tu terminal lo que extrajo la IA para salir de dudas
  console.log("=== DATOS EXTRAÍDOS POR LA IA ===");
  console.log("Proveedor que busca:", intent.supplierId);
  console.log("Factura que busca:", intent.invoiceId);

  const connection = await mysql.createConnection(process.env.DATABASE_URL || "mysql://root:@localhost:3306/trustpay");
  
  const [invoiceRows] = await connection.execute("SELECT * FROM invoices WHERE id = ?", [intent.invoiceId]) as any[];
  
  // 2. Hacemos la búsqueda súper flexible con LIKE y comodines (%)
  const [supplierRows] = await connection.execute(
    "SELECT * FROM suppliers WHERE id = ? OR name LIKE ?", 
    [intent.supplierId, `%${intent.supplierId}%`]
  ) as any[];
  
  await connection.end(); 

  const dbInvoice = invoiceRows[0];
  const dbSupplier = supplierRows[0];

  const invoice = dbInvoice ? {
    id: dbInvoice.id,
    supplierId: dbInvoice.supplier_id,
    amount: dbInvoice.amount,
    currency: dbInvoice.currency,
    status: dbInvoice.status
  } : undefined;

  const supplier = dbSupplier ? {
    id: dbSupplier.id,
    name: dbSupplier.name,
    registeredWallet: dbSupplier.registered_wallet
  } : undefined;

  const decimals = context.decimals ?? 6;
  const requested = toUnits(intent.amount, decimals);
  const expected = invoice ? toUnits(invoice.amount, decimals) : null;
  const validWallet = /^0x[a-fA-F0-9]{40}$/.test(intent.destinationWallet);
  
  const check = (code: TrustCheck["code"], passed: boolean, message: string, values: Pick<TrustCheck, "expected" | "actual"> = {}): TrustCheck => ({ code, passed, message, ...values });
  
  const checks: TrustCheck[] = [
    check("INVOICE_EXISTS", !!invoice, invoice ? "Invoice exists." : "Invoice was not found.", { expected: intent.invoiceId, actual: invoice?.id ?? "missing" }),
    check("SUPPLIER_EXISTS", !!supplier, supplier ? "Supplier exists." : "Supplier was not found.", { expected: intent.supplierId, actual: supplier?.id ?? "missing" }),
    check("INVOICE_OWNER_MATCH", !!invoice && !!supplier && invoice.supplierId === supplier.id, "Invoice belongs to the requested supplier.", { expected: invoice?.supplierId ?? "missing", actual: supplier?.id ?? "missing" }),
    check("VALID_AMOUNT", requested !== null && expected !== null, "Amounts use valid decimal precision.", { expected: invoice?.amount, actual: intent.amount }),
    check("AMOUNT_MATCH", requested !== null && expected !== null && requested > 0n && requested <= expected, "Testnet demo amount is positive and does not exceed invoice total.", { expected: invoice?.amount, actual: intent.amount }),
    check("CURRENCY_MATCH", !!invoice && invoice.currency.toUpperCase() === intent.currency.toUpperCase(), "Currency matches invoice currency.", { expected: invoice?.currency, actual: intent.currency }),
    check("VALID_WALLET", validWallet, "Destination is a valid EVM address.", { actual: intent.destinationWallet }),
    check("WALLET_MATCH", !!supplier && validWallet && supplier.registeredWallet.toLowerCase() === intent.destinationWallet.toLowerCase(), "Destination matches the supplier registered wallet.", { expected: supplier?.registeredWallet, actual: intent.destinationWallet }),
    check("INVOICE_UNPAID", !!invoice && invoice.status === "unpaid", "Invoice has not been paid before.", { expected: "unpaid", actual: invoice?.status ?? "missing" }),
    check("REQUESTER_AUTHORIZED", context.authorizedRequesters.includes(intent.requestedBy), "Requester is authorized to approve payments.", { actual: intent.requestedBy }),
  ];
  
  const reasons = checks.filter((item) => !item.passed).map((item) => item.code);
  return { paymentIntentId: intent.id, status: reasons.length ? "BLOCKED" : "APPROVED", risk: reasons.length ? "HIGH" : "LOW", checks, reasons, evaluatedAt: new Date().toISOString(), humanApprovalRequired: true };
}