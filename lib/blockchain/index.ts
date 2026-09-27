import type { HumanApproval, PaymentIntent, PaymentResult, TrustResult } from "@/lib/shared/types";

const SEPOLIA_CHAIN_ID = 11155111;
export type PreparedTransfer = PaymentResult & { id: string; intentId: string; transaction: { to: `0x${string}`; data: `0x${string}`; value: "0x0" } };

async function digestIntent(intent: PaymentIntent): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(intent));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Builds unsigned Sepolia ERC-20 transfer calldata. Signing and broadcast happen only through the user wallet. */
export async function prepareSepoliaTransfer(intent: PaymentIntent, trust: TrustResult, approval: HumanApproval): Promise<PreparedTransfer> {
  if (trust.paymentIntentId !== intent.id || trust.status !== "APPROVED") throw new Error("Trust Engine approval required for this exact payment intent.");
  if (approval.paymentIntentId !== intent.id || approval.intentDigest !== await digestIntent(intent)) throw new Error("Approval does not match this exact intent.");
  if (intent.currency !== "USDC") throw new Error("Only USDC is supported.");
  const token = process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS;
  if (!token || !/^0x[a-fA-F0-9]{40}$/.test(token)) throw new Error("Configure a verified Sepolia USDC contract address.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(intent.destinationWallet)) throw new Error("Invalid destination wallet.");
  const decimals = Number(process.env.SEPOLIA_USDC_DECIMALS ?? "6");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Invalid token decimals.");
  const parts = intent.amount.split(".");
  if (parts.length > 2 || !/^(0|[1-9][0-9]*)$/.test(parts[0]) || (parts[1] !== undefined && (!/^[0-9]+$/.test(parts[1]) || parts[1].length > decimals))) throw new Error("Invalid amount precision.");
  const units = BigInt(parts[0] + (parts[1] ?? "").padEnd(decimals, "0"));
  const data = `0xa9059cbb${intent.destinationWallet.slice(2).toLowerCase().padStart(64, "0")}${units.toString(16).padStart(64, "0")}` as `0x${string}`;
  return { id: `prepared-${intent.id}`, intentId: intent.id, status: "PREPARED", chainId: SEPOLIA_CHAIN_ID, transaction: { to: token as `0x${string}`, data, value: "0x0" } };
}

/** Deliberately unavailable: every submission must use an explicit browser wallet confirmation. */
export async function submitPayment(): Promise<never> { throw new Error("Use the connected browser wallet; server-side broadcasting is disabled."); }
