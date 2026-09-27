import type { HumanApproval, PaymentIntent, PaymentProof, PaymentResult, TrustResult } from "@/lib/shared/types";
import { prepareSepoliaTransfer } from "@/lib/blockchain";

export const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_HEX = "0xaa36a7";
const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io/tx/";
type RequestArguments = { method: string; params?: unknown[] | Record<string, unknown> };
export type Eip1193Provider = { request(args: RequestArguments): Promise<unknown> };
export type SepoliaBalances = { eth: string; usdc: string; usdcUnits: string };

declare global { interface Window { ethereum?: Eip1193Provider } }

function injectedWallet(): Eip1193Provider {
  if (typeof window === "undefined" || !window.ethereum) throw new Error("No EVM browser wallet found. Open TrustPay in a browser with Rabby unlocked.");
  return window.ethereum;
}

function parseChainId(value: unknown): number {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("Wallet returned an invalid network ID.");
  return Number.parseInt(value, 16);
}

function parseHexQuantity(value: unknown, label: string): bigint {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("Wallet returned an invalid " + label + ".");
  return BigInt(value);
}

function formatUnits(units: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = units / base;
  const fraction = (units % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

export async function ensureSepolia(provider = injectedWallet()): Promise<void> {
  const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
  if (chainId === SEPOLIA_CHAIN_ID) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902) throw new Error(code === 4001 ? "Network change was rejected in the wallet." : "Could not switch wallet to Ethereum Sepolia.");
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
    if (!rpcUrl || !rpcUrl.startsWith("https://")) throw new Error("Ethereum Sepolia is not in the wallet. Configure a public HTTPS Sepolia RPC URL, then retry.");
    await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX, chainName: "Ethereum Sepolia", nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 }, rpcUrls: [rpcUrl], blockExplorerUrls: ["https://sepolia.etherscan.io"] }] });
  }
  const switchedId = parseChainId(await provider.request({ method: "eth_chainId" }));
  if (switchedId !== SEPOLIA_CHAIN_ID) throw new Error("Wallet is still not connected to Ethereum Sepolia.");
}

export async function connectBrowserWallet(): Promise<{ address: string; chainId: number }> {
  const provider = injectedWallet();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(accounts[0])) throw new Error("Wallet returned no valid public account address.");
  await ensureSepolia(provider);
  return { address: accounts[0], chainId: SEPOLIA_CHAIN_ID };
}

export async function getSepoliaBalances(address: string): Promise<SepoliaBalances> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error("Invalid public wallet address.");
  const provider = injectedWallet();
  await ensureSepolia(provider);
  const token = process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS;
  if (!token || !/^0x[a-fA-F0-9]{40}$/.test(token)) throw new Error("Configure the verified Sepolia USDC contract address.");
  const decimals = Number(process.env.SEPOLIA_USDC_DECIMALS ?? "6");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Invalid USDC decimals configuration.");
  const ethRaw = parseHexQuantity(await provider.request({ method: "eth_getBalance", params: [address, "latest"] }), "Sepolia ETH balance");
  const callData = "0x70a08231" + address.slice(2).toLowerCase().padStart(64, "0");
  const tokenResult = await provider.request({ method: "eth_call", params: [{ to: token, data: callData }, "latest"] });
  const usdcRaw = parseHexQuantity(tokenResult, "Sepolia USDC balance");
  return { eth: formatUnits(ethRaw, 18), usdc: formatUnits(usdcRaw, decimals), usdcUnits: usdcRaw.toString() };
}

async function digestIntent(intent: PaymentIntent): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(intent));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function approvePaymentIntent(intent: PaymentIntent, approvedBy: string): Promise<HumanApproval> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(approvedBy)) throw new Error("Connect a wallet before approving the payment.");
  return { paymentIntentId: intent.id, approvedBy, approvedAt: new Date().toISOString(), intentDigest: await digestIntent(intent) };
}

function receiptField(receipt: unknown, field: string): unknown {
  if (!receipt || typeof receipt !== "object" || !(field in receipt)) return undefined;
  return (receipt as Record<string, unknown>)[field];
}

export async function executeSepoliaPayment(intent: PaymentIntent, trust: TrustResult, approval: HumanApproval, walletAddress: string): Promise<{ result: PaymentResult; proof: PaymentProof }> {
  const provider = injectedWallet();
  if (trust.paymentIntentId !== intent.id || trust.status !== "APPROVED") throw new Error("This exact payment intent has not passed Trust Engine checks.");
  const walletCheck = trust.checks.find((check) => check.code === "WALLET_MATCH");
  if (!walletCheck?.passed || !walletCheck.expected || walletCheck.expected.toLowerCase() !== intent.destinationWallet.toLowerCase()) throw new Error("Trust Engine did not verify this destination against the supplier's registered wallet.");
  if (approval.paymentIntentId !== intent.id || approval.approvedBy.toLowerCase() !== walletAddress.toLowerCase() || approval.intentDigest !== await digestIntent(intent)) throw new Error("Human approval does not match this exact intent and connected wallet.");
  await ensureSepolia(provider);
  const accounts = await provider.request({ method: "eth_accounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || accounts[0].toLowerCase() !== walletAddress.toLowerCase()) throw new Error("Connected wallet account changed. Reconnect and approve the intent again.");
  const prepared = await prepareSepoliaTransfer(intent, trust, approval);
  let hash: unknown;
  try {
    hash = await provider.request({ method: "eth_sendTransaction", params: [{ from: walletAddress, to: prepared.transaction.to, data: prepared.transaction.data, value: prepared.transaction.value }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4001) throw new Error("Transaction signature was rejected in the wallet.");
    throw new Error(error instanceof Error ? "Wallet could not submit transaction: " + error.message : "Wallet could not submit transaction.");
  }
  if (typeof hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error("Wallet returned an invalid transaction hash.");
  const txHash = hash as PaymentProof["txHash"];
  const deadline = Date.now() + 180_000;
  let receipt: unknown;
  while (Date.now() < deadline) {
    receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
    if (receipt) break;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!receipt) throw new Error("Transaction " + txHash + " was submitted but no receipt arrived within 3 minutes. Check the explorer before retrying.");
  const status = receiptField(receipt, "status");
  if (status !== "0x1" && status !== "0x01") throw new Error("Transaction " + txHash + " was mined but failed onchain. Check the explorer before retrying.");
  const blockHex = receiptField(receipt, "blockNumber");
  if (typeof blockHex !== "string" || !/^0x[0-9a-f]+$/i.test(blockHex)) throw new Error("Transaction receipt has no valid block number.");
  const blockNumber = Number(BigInt(blockHex));
  if (!Number.isSafeInteger(blockNumber)) throw new Error("Receipt block number exceeds the safe display range.");
  const result: PaymentResult = { status: "CONFIRMED", txHash, chainId: SEPOLIA_CHAIN_ID };
  const proof: PaymentProof = { paymentIntentId: intent.id, invoiceId: intent.invoiceId, amount: intent.amount, currency: intent.currency, supplierId: intent.supplierId, destinationWallet: intent.destinationWallet, chainId: SEPOLIA_CHAIN_ID, txHash, confirmedAt: new Date().toISOString(), blockNumber, network: "Ethereum Sepolia", explorerUrl: SEPOLIA_EXPLORER + txHash };
  return { result, proof };
}
