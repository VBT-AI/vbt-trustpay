import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareSepoliaTransfer } from "../lib/blockchain";
import { ensureSepolia, type Eip1193Provider } from "../lib/blockchain/wallet";
import type { HumanApproval, PaymentIntent, TrustResult } from "../lib/shared/types";
const token = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const recipient = "0x2222222222222222222222222222222222222222" as const;
const intent: PaymentIntent = { id: "payment-1", supplierId: "supplier-1", supplierName: "ABC Software", invoiceId: "INV-001", amount: "500.00", currency: "USDC", destinationWallet: recipient, requestedBy: "demo-approver", createdAt: "2026-09-27T00:00:00.000Z" };
const trust: TrustResult = { paymentIntentId: intent.id, status: "APPROVED", risk: "LOW", checks: [], reasons: [], evaluatedAt: "2026-09-27T00:00:00.000Z", humanApprovalRequired: true };
async function approvalFor(payment: PaymentIntent): Promise<HumanApproval> {
 const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payment)));
 return { paymentIntentId: payment.id, approvedBy: recipient, approvedAt: "2026-09-27T00:00:00.000Z", intentDigest: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("") };
}
afterEach(() => vi.unstubAllEnvs());
describe("Sepolia browser wallet", () => {
 it("keeps an already connected Sepolia wallet on the right chain", async () => {
  const methods: string[] = [];
  const provider: Eip1193Provider = { request: async ({ method }) => { methods.push(method); return "0xaa36a7"; } };
  await ensureSepolia(provider); expect(methods).toEqual(["eth_chainId"]);
 });
 it("requests a switch when the wallet is on another chain", async () => {
  const methods: string[] = [];
  const provider: Eip1193Provider = { request: async ({ method }) => { methods.push(method); return method === "eth_chainId" ? (methods.length === 1 ? "0x1" : "0xaa36a7") : null; } };
  await ensureSepolia(provider); expect(methods).toEqual(["eth_chainId", "wallet_switchEthereumChain", "eth_chainId"]);
 });
 it("prepares exact USDC transfer calldata for 500.00 units", async () => {
  vi.stubEnv("NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS", token); vi.stubEnv("SEPOLIA_USDC_DECIMALS", "6");
  const prepared = await prepareSepoliaTransfer(intent, trust, await approvalFor(intent));
  expect(prepared.status).toBe("PREPARED"); expect(prepared.chainId).toBe(11155111); expect(prepared.transaction.to).toBe(token); expect(prepared.transaction.value).toBe("0x0");
  expect(prepared.transaction.data).toBe("0xa9059cbb" + recipient.slice(2).toLowerCase().padStart(64, "0") + "0".repeat(56) + "1dcd6500");
 });
 it("rejects a trust result for a different payment intent", async () => {
  vi.stubEnv("NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS", token);
  await expect(prepareSepoliaTransfer(intent, { ...trust, paymentIntentId: "other" }, await approvalFor(intent))).rejects.toThrow("Trust Engine approval required");
 });
 it("rejects an approval digest that no longer matches the intent", async () => {
  vi.stubEnv("NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS", token);
  await expect(prepareSepoliaTransfer(intent, trust, { ...await approvalFor(intent), intentDigest: "invalid" })).rejects.toThrow("Approval does not match");
 });
});
